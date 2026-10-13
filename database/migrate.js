/**
 * database/migrate.js
 * 
 * Safe, Transactional SQLite Schema Migration for SmartWorkforce Authentication.
 * Handles WAL checkpoints, backup verification, table creation, column alterations,
 * and foreign-key integrity validation.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const auth = require('../backend/auth.js');

function runMigration(dbOrPath) {
  let db;
  let dbPath = null;
  let shouldClose = false;

  if (dbOrPath && typeof dbOrPath === 'object' && typeof dbOrPath.prepare === 'function') {
    db = dbOrPath;
  } else {
    dbPath = dbOrPath || path.join(__dirname, 'smartworkforce.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Target database file does not exist: ${dbPath}`);
    }
    db = new DatabaseSync(dbPath);
    shouldClose = true;
  }

  // 1. Foreign keys and WAL checkpoint
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');

  // 2. Pre-migration verification checks
  const empsBefore = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  const eventsBefore = db.prepare('SELECT COUNT(*) as c FROM attendance_events').get().c;

  // 3. Optional file backup if operating on a disk file path
  let backupSnapshot = null;
  if (dbPath && fs.existsSync(dbPath)) {
    const backupDir = path.join(__dirname, '..', '.backup_pre_auth');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    backupSnapshot = path.join(backupDir, `smartworkforce_pre_migration_${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupSnapshot);
  }

  // 4. Execute incremental migration inside atomic transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    // A. Create companies table
    db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);
    `);

    // B. Create company_users table (COMPANY_HEAD & COMPANY_ADMIN)
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_users (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('COMPANY_HEAD', 'COMPANY_ADMIN')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
      CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
    `);

    // C. Create employee_accounts table (Dedicated credentials table)
    db.exec(`
      CREATE TABLE IF NOT EXISTS employee_accounts (
        id TEXT PRIMARY KEY,
        employee_id TEXT UNIQUE NOT NULL,
        company_id TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 1,
        account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(account_status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
        password_updated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_employee_accounts_emp ON employee_accounts(employee_id);
      CREATE INDEX IF NOT EXISTS idx_employee_accounts_company ON employee_accounts(company_id);
    `);

    // D. Create sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK(user_type IN ('COMPANY_HEAD', 'COMPANY_ADMIN', 'EMPLOYEE')),
        company_id TEXT NOT NULL,
        csrf_token TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id, user_type);
      CREATE INDEX IF NOT EXISTS idx_sessions_company ON sessions(company_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    `);

    // E. Confirm and insert baseline company COMP-DEFAULT-01
    const checkCompany = db.prepare("SELECT id FROM companies WHERE id = 'COMP-DEFAULT-01'").get();
    if (!checkCompany) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO companies (id, name, industry, email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('COMP-DEFAULT-01', 'SmartWorkforce Operations', 'Manufacturing & Technology', 'admin@smartworkforce.internal', now, now);
    }

    // Seed baseline company head account if not present
    const checkUser = db.prepare("SELECT id FROM company_users WHERE email = 'admin@smartworkforce.internal'").get();
    if (!checkUser) {
      const now = new Date().toISOString();
      const salt = auth.generateSalt();
      const hash = auth.hashPassword('SmartWorkforce2024!', salt);
      db.prepare(`
        INSERT INTO company_users (id, company_id, email, full_name, password_hash, password_salt, role, created_at, updated_at)
        VALUES (?, 'COMP-DEFAULT-01', 'admin@smartworkforce.internal', 'System Administrator', ?, ?, 'COMPANY_HEAD', ?, ?)
      `).run('USR-ADMIN-01', hash, salt, now, now);
    }

    // F. Safely add company_id to employees and index after column creation
    const empColumns = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
    if (!empColumns.includes('company_id')) {
      db.exec("ALTER TABLE employees ADD COLUMN company_id TEXT REFERENCES companies(id);");
    }
    db.exec("UPDATE employees SET company_id = 'COMP-DEFAULT-01' WHERE company_id IS NULL;");
    db.exec("CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);");

    // G. Safely add company_id to attendance_events and index after column creation
    const eventColumns = db.prepare("PRAGMA table_info(attendance_events)").all().map(c => c.name);
    if (!eventColumns.includes('company_id')) {
      db.exec("ALTER TABLE attendance_events ADD COLUMN company_id TEXT REFERENCES companies(id);");
    }
    db.exec("UPDATE attendance_events SET company_id = 'COMP-DEFAULT-01' WHERE company_id IS NULL;");
    db.exec("CREATE INDEX IF NOT EXISTS idx_attendance_events_company_id ON attendance_events(company_id);");

    // Commit Transaction
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  // 5. Post-migration verification
  const empsAfter = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  const eventsAfter = db.prepare('SELECT COUNT(*) as c FROM attendance_events').get().c;

  if (empsBefore !== empsAfter) {
    throw new Error(`Integrity Violation: Employee count changed! Before: ${empsBefore}, After: ${empsAfter}`);
  }
  if (eventsBefore !== eventsAfter) {
    throw new Error(`Integrity Violation: Event count changed! Before: ${eventsBefore}, After: ${eventsAfter}`);
  }

  const fkViolations = db.prepare('PRAGMA foreign_key_check;').all();
  if (fkViolations.length > 0) {
    throw new Error(`Foreign Key Violation detected: ${JSON.stringify(fkViolations)}`);
  }

  const unmappedEmps = db.prepare("SELECT COUNT(*) as c FROM employees WHERE company_id IS NULL").get().c;
  if (unmappedEmps > 0) {
    throw new Error(`Integrity Violation: ${unmappedEmps} employees missing company_id mapping!`);
  }

  const unmappedEvents = db.prepare("SELECT COUNT(*) as c FROM attendance_events WHERE company_id IS NULL").get().c;
  if (unmappedEvents > 0) {
    throw new Error(`Integrity Violation: ${unmappedEvents} attendance events missing company_id mapping!`);
  }

  db.exec('PRAGMA wal_checkpoint(TRUNCATE);');

  if (shouldClose) {
    db.close();
  }

  return {
    success: true,
    employeesCount: empsAfter,
    eventsCount: eventsAfter,
    foreignKeyViolations: fkViolations.length,
    unmappedEmployees: unmappedEmps,
    unmappedEvents: unmappedEvents,
    backupSnapshot
  };
}

if (require.main === module) {
  try {
    const result = runMigration();
    console.log('[Migration SUCCESS]', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[Migration ERROR]', err);
    process.exit(1);
  }
}

module.exports = { runMigration };

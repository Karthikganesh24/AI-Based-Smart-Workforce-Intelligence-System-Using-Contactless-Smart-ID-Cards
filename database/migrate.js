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

  // 1. Disable foreign keys before transaction to safely allow table schema alterations without cascading child deletions
  db.exec('PRAGMA foreign_keys = OFF;');
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

    // F2. Safely ensure employees.uid is nullable (to support employees without physical RFID cards)
    const empColDefs = db.prepare("PRAGMA table_info(employees)").all();
    const uidColDef = empColDefs.find(c => c.name === 'uid');
    if (uidColDef && uidColDef.notnull === 1) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS employees_dg_tmp (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          department TEXT NOT NULL,
          role TEXT NOT NULL,
          uid TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'OUTSIDE',
          last_seen TEXT NOT NULL DEFAULT 'Not detected today',
          avatar_bg TEXT NOT NULL DEFAULT '#0284C7',
          created_at TEXT NOT NULL,
          company_id TEXT REFERENCES companies(id),
          email TEXT,
          phone TEXT
        );
        INSERT INTO employees_dg_tmp (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id)
          SELECT id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id FROM employees;
        DROP TABLE employees;
        ALTER TABLE employees_dg_tmp RENAME TO employees;
        CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
        CREATE INDEX IF NOT EXISTS idx_employees_uid ON employees(uid);
      `);
    }

    // F3. Safely add email and phone columns to employees (scoped to company)
    const empColsAfter = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
    if (!empColsAfter.includes('email')) {
      db.exec("ALTER TABLE employees ADD COLUMN email TEXT;");
    }
    if (!empColsAfter.includes('phone')) {
      db.exec("ALTER TABLE employees ADD COLUMN phone TEXT;");
    }
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_email ON employees(company_id, email) WHERE email IS NOT NULL;");

    // F4. Safely add is_archived and archived_at columns for safe soft-delete
    if (!empColsAfter.includes('is_archived')) {
      db.exec("ALTER TABLE employees ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;");
    }
    if (!empColsAfter.includes('archived_at')) {
      db.exec("ALTER TABLE employees ADD COLUMN archived_at TEXT;");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON employees(is_archived);");

    // G. Safely add company_id to attendance_events and index after column creation
    const eventColumns = db.prepare("PRAGMA table_info(attendance_events)").all().map(c => c.name);
    if (!eventColumns.includes('company_id')) {
      db.exec("ALTER TABLE attendance_events ADD COLUMN company_id TEXT REFERENCES companies(id);");
    }
    db.exec("UPDATE attendance_events SET company_id = 'COMP-DEFAULT-01' WHERE company_id IS NULL;");
    db.exec("CREATE INDEX IF NOT EXISTS idx_attendance_events_company_id ON attendance_events(company_id);");

    // H. Seed baseline employee accounts for baseline employees if missing
    const missingAccStmt = db.prepare(`
      SELECT e.id, e.company_id 
      FROM employees e 
      LEFT JOIN employee_accounts a ON e.id = a.employee_id 
      WHERE a.id IS NULL AND e.company_id = 'COMP-DEFAULT-01'
    `);
    const missing = missingAccStmt.all();
    if (missing.length > 0) {
      const insertAcc = db.prepare(`
        INSERT INTO employee_accounts (id, employee_id, company_id, password_hash, password_salt, must_change_password, account_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?)
      `);
      const now = new Date().toISOString();
      for (const m of missing) {
        const salt = auth.generateSalt();
        const hash = auth.hashPassword('EmployeePass2024!', salt);
        const accId = auth.generateId('ACC');
        insertAcc.run(accId, m.id, m.company_id || 'COMP-DEFAULT-01', hash, salt, now, now);
      }
    }

    // Commit Transaction
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
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

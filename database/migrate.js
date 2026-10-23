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
    dbPath = dbOrPath || process.env.DB_PATH || path.join(__dirname, 'smartworkforce.db');
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
  const empsTableExists = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'employees'").get());
  const eventsTableExists = Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'attendance_events'").get());
  const empsBefore = empsTableExists ? db.prepare('SELECT COUNT(*) as c FROM employees').get().c : 0;
  const eventsBefore = eventsTableExists ? db.prepare('SELECT COUNT(*) as c FROM attendance_events').get().c : 0;

  // 3. Optional file backup if operating on a disk file path
  let backupSnapshot = null;
  if (dbPath && fs.existsSync(dbPath)) {
    const backupDir = path.join(__dirname, '..', 'archive', 'backups', 'pre_auth_db_snapshots');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    backupSnapshot = path.join(backupDir, `smartworkforce_pre_migration_${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupSnapshot);
  }

  // 4. Execute incremental migration inside atomic transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    // 0. Ensure base employees and attendance_events tables exist on fresh DB
    if (!empsTableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS employees (
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
          phone TEXT,
          is_archived INTEGER NOT NULL DEFAULT 0,
          archived_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
        CREATE INDEX IF NOT EXISTS idx_employees_uid ON employees(uid);
      `);
    }
    if (!eventsTableExists) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS attendance_events (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          emp_id TEXT NOT NULL,
          emp_name TEXT NOT NULL,
          department TEXT NOT NULL,
          event_type TEXT NOT NULL CHECK(event_type IN ('ENTRY', 'EXIT')),
          gate TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'VERIFIED',
          created_at TEXT NOT NULL,
          company_id TEXT REFERENCES companies(id),
          FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_events_emp_id ON attendance_events(emp_id);
        CREATE INDEX IF NOT EXISTS idx_events_timestamp ON attendance_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_attendance_events_company_id ON attendance_events(company_id);
      `);
    }

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

    // I. Custom Organizational Tree and Dynamic Role Management Migration
    // ------------------------------------------------------------------
    // I0. Schema Migrations Ledger
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    // I1. Create org_levels table
    db.exec(`
      CREATE TABLE IF NOT EXISTS org_levels (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rank INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE (company_id, rank),
        UNIQUE (company_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_org_levels_company ON org_levels(company_id);
      CREATE INDEX IF NOT EXISTS idx_org_levels_rank ON org_levels(company_id, rank);
    `);

    // I2. Create org_units table
    db.exec(`
      CREATE TABLE IF NOT EXISTS org_units (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        unit_type TEXT NOT NULL DEFAULT 'DEPARTMENT',
        parent_unit_id TEXT,
        level_id TEXT,
        manager_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_unit_id) REFERENCES org_units(id) ON DELETE SET NULL,
        FOREIGN KEY (level_id) REFERENCES org_levels(id) ON DELETE SET NULL,
        FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_org_units_company ON org_units(company_id);
      CREATE INDEX IF NOT EXISTS idx_org_units_parent ON org_units(parent_unit_id);
      CREATE INDEX IF NOT EXISTS idx_org_units_level ON org_units(level_id);
      CREATE INDEX IF NOT EXISTS idx_org_units_manager ON org_units(manager_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_units_root_name ON org_units(company_id, name) WHERE parent_unit_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_org_units_child_name ON org_units(company_id, parent_unit_id, name) WHERE parent_unit_id IS NOT NULL;
    `);

    // I3. Create company_job_titles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_job_titles (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE (company_id, title)
      );
      CREATE INDEX IF NOT EXISTS idx_company_job_titles_company ON company_job_titles(company_id);
      CREATE INDEX IF NOT EXISTS idx_company_job_titles_active ON company_job_titles(company_id, is_active);
    `);

    // I4. Create company_access_roles table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_access_roles (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_system_role INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE (company_id, name)
      );
      CREATE INDEX IF NOT EXISTS idx_company_access_roles_company ON company_access_roles(company_id);
    `);

    // I5. Create company_role_permissions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS company_role_permissions (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        permission_key TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'COMPANY' CHECK(scope IN ('SELF', 'DIRECT_REPORTS', 'DESCENDANTS', 'DEPARTMENT', 'COMPANY')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (role_id) REFERENCES company_access_roles(id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        UNIQUE (role_id, permission_key)
      );
      CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON company_role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_company ON company_role_permissions(company_id);
      CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON company_role_permissions(permission_key);
    `);

    // I6. Safely add reporting and assignment columns to employees if not present
    const empColsI = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
    if (!empColsI.includes('manager_id')) {
      db.exec("ALTER TABLE employees ADD COLUMN manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL;");
    }
    if (!empColsI.includes('org_unit_id')) {
      db.exec("ALTER TABLE employees ADD COLUMN org_unit_id TEXT REFERENCES org_units(id) ON DELETE SET NULL;");
    }
    if (!empColsI.includes('job_title_id')) {
      db.exec("ALTER TABLE employees ADD COLUMN job_title_id TEXT REFERENCES company_job_titles(id) ON DELETE SET NULL;");
    }
    if (!empColsI.includes('access_role_id')) {
      db.exec("ALTER TABLE employees ADD COLUMN access_role_id TEXT REFERENCES company_access_roles(id) ON DELETE SET NULL;");
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
      CREATE INDEX IF NOT EXISTS idx_employees_org_unit_id ON employees(org_unit_id);
      CREATE INDEX IF NOT EXISTS idx_employees_job_title_id ON employees(job_title_id);
      CREATE INDEX IF NOT EXISTS idx_employees_access_role_id ON employees(access_role_id);
    `);

    // I7. Seed baseline levels, access roles & permissions, units, and titles for registered companies
    const companiesList = db.prepare('SELECT id, name FROM companies').all();
    const nowIso = new Date().toISOString();

    for (const comp of companiesList) {
      const cId = comp.id;

      // Seed baseline Org Levels for this company if none exist
      const levelCount = db.prepare('SELECT COUNT(*) AS c FROM org_levels WHERE company_id = ?').get(cId).c;
      if (levelCount === 0) {
        const defaultLevels = [
          { name: 'Executive', rank: 1 },
          { name: 'Department Head', rank: 2 },
          { name: 'Team Lead', rank: 3 },
          { name: 'Staff', rank: 4 }
        ];
        const insertLvl = db.prepare(`
          INSERT INTO org_levels (id, company_id, name, rank, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const lvl of defaultLevels) {
          const lvlId = auth.generateId('LVL');
          insertLvl.run(lvlId, cId, lvl.name, lvl.rank, nowIso, nowIso);
        }
      }

      // Seed baseline Access Roles & Granular Permissions if none exist
      const roleCount = db.prepare('SELECT COUNT(*) AS c FROM company_access_roles WHERE company_id = ?').get(cId).c;
      if (roleCount === 0) {
        const insertRole = db.prepare(`
          INSERT INTO company_access_roles (id, company_id, name, description, is_system_role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertPerm = db.prepare(`
          INSERT INTO company_role_permissions (id, role_id, company_id, permission_key, scope, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        // 1. Company Administrator
        const adminRoleId = auth.generateId('ROLE');
        insertRole.run(adminRoleId, cId, 'Administrator', 'Full administrative authority across the entire organization.', 1, nowIso, nowIso);
        const adminPerms = [
          { key: 'employees:view', scope: 'COMPANY' },
          { key: 'employees:manage', scope: 'COMPANY' },
          { key: 'attendance:view', scope: 'COMPANY' },
          { key: 'attendance:manage', scope: 'COMPANY' },
          { key: 'analytics:view', scope: 'COMPANY' },
          { key: 'org:view', scope: 'COMPANY' },
          { key: 'org:manage', scope: 'COMPANY' },
          { key: 'roles:manage', scope: 'COMPANY' }
        ];
        for (const p of adminPerms) {
          insertPerm.run(auth.generateId('PERM'), adminRoleId, cId, p.key, p.scope, nowIso);
        }

        // 2. Department Head
        const deptHeadRoleId = auth.generateId('ROLE');
        insertRole.run(deptHeadRoleId, cId, 'Department Head', 'Oversight and reporting for department and permitted descendants.', 1, nowIso, nowIso);
        const deptPerms = [
          { key: 'employees:view', scope: 'DESCENDANTS' },
          { key: 'employees:manage', scope: 'DESCENDANTS' },
          { key: 'attendance:view', scope: 'DESCENDANTS' },
          { key: 'attendance:manage', scope: 'DEPARTMENT' },
          { key: 'analytics:view', scope: 'DEPARTMENT' },
          { key: 'org:view', scope: 'COMPANY' }
        ];
        for (const p of deptPerms) {
          insertPerm.run(auth.generateId('PERM'), deptHeadRoleId, cId, p.key, p.scope, nowIso);
        }

        // 3. Team Lead
        const leadRoleId = auth.generateId('ROLE');
        insertRole.run(leadRoleId, cId, 'Team Lead', 'Direct supervisor oversight for assigned team members.', 1, nowIso, nowIso);
        const leadPerms = [
          { key: 'employees:view', scope: 'DIRECT_REPORTS' },
          { key: 'employees:manage', scope: 'DIRECT_REPORTS' },
          { key: 'attendance:view', scope: 'DIRECT_REPORTS' },
          { key: 'org:view', scope: 'COMPANY' }
        ];
        for (const p of leadPerms) {
          insertPerm.run(auth.generateId('PERM'), leadRoleId, cId, p.key, p.scope, nowIso);
        }

        // 4. Employee (Standard)
        const staffRoleId = auth.generateId('ROLE');
        insertRole.run(staffRoleId, cId, 'Employee', 'Standard workforce access for personal attendance and profile.', 1, nowIso, nowIso);
        const staffPerms = [
          { key: 'employees:view', scope: 'SELF' },
          { key: 'attendance:view', scope: 'SELF' }
        ];
        for (const p of staffPerms) {
          insertPerm.run(auth.generateId('PERM'), staffRoleId, cId, p.key, p.scope, nowIso);
        }
      }

      // Populate distinct legacy departments into org_units if missing
      const deptHeadLevel = db.prepare("SELECT id FROM org_levels WHERE company_id = ? AND rank = 2").get(cId);
      const distinctDepts = db.prepare("SELECT DISTINCT department FROM employees WHERE company_id = ? AND department IS NOT NULL AND TRIM(department) != ''").all(cId);
      const insertUnit = db.prepare(`
        INSERT INTO org_units (id, company_id, name, unit_type, level_id, created_at, updated_at)
        VALUES (?, ?, ?, 'DEPARTMENT', ?, ?, ?)
      `);
      for (const d of distinctDepts) {
        const unitName = d.department.trim();
        const existingUnit = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND name = ? AND parent_unit_id IS NULL').get(cId, unitName);
        if (!existingUnit) {
          insertUnit.run(auth.generateId('UNIT'), cId, unitName, deptHeadLevel ? deptHeadLevel.id : null, nowIso, nowIso);
        }
      }

      // Populate distinct legacy roles into company_job_titles if missing
      const distinctRoles = db.prepare("SELECT DISTINCT role FROM employees WHERE company_id = ? AND role IS NOT NULL AND TRIM(role) != ''").all(cId);
      const insertTitle = db.prepare(`
        INSERT INTO company_job_titles (id, company_id, title, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `);
      for (const r of distinctRoles) {
        const titleStr = r.role.trim();
        const existingTitle = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND title = ?').get(cId, titleStr);
        if (!existingTitle) {
          insertTitle.run(auth.generateId('JOB'), cId, titleStr, nowIso, nowIso);
        }
      }

      // Backfill employees with org_unit_id, job_title_id, access_role_id while preserving department & role strings
      const unlinkedEmployees = db.prepare(`
        SELECT id, department, role 
        FROM employees 
        WHERE company_id = ? AND (org_unit_id IS NULL OR job_title_id IS NULL OR access_role_id IS NULL)
      `).all(cId);

      const staffRole = db.prepare("SELECT id FROM company_access_roles WHERE company_id = ? AND name = 'Employee'").get(cId);
      const leadRole = db.prepare("SELECT id FROM company_access_roles WHERE company_id = ? AND name = 'Team Lead'").get(cId);
      const deptHeadRole = db.prepare("SELECT id FROM company_access_roles WHERE company_id = ? AND name = 'Department Head'").get(cId);

      const updateEmpLink = db.prepare(`
        UPDATE employees
        SET org_unit_id = COALESCE(org_unit_id, ?),
            job_title_id = COALESCE(job_title_id, ?),
            access_role_id = COALESCE(access_role_id, ?)
        WHERE id = ? AND company_id = ?
      `);

      for (const emp of unlinkedEmployees) {
        const u = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND name = ?').get(cId, emp.department.trim());
        const j = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND title = ?').get(cId, emp.role.trim());
        
        let assignedRoleId = staffRole ? staffRole.id : null;
        const roleLower = (emp.role || '').toLowerCase();
        if (roleLower.includes('head') || roleLower.includes('in-charge') || roleLower.includes('manager')) {
          if (deptHeadRole) assignedRoleId = deptHeadRole.id;
        } else if (roleLower.includes('lead') || roleLower.includes('supervisor')) {
          if (leadRole) assignedRoleId = leadRole.id;
        }

        updateEmpLink.run(
          u ? u.id : null,
          j ? j.id : null,
          assignedRoleId,
          emp.id,
          cId
        );
      }
    }

    // Record migration version
    db.prepare(`
      INSERT OR REPLACE INTO schema_migrations (version, applied_at)
      VALUES ('v2_org_tree_roles', ?)
    `).run(nowIso);

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

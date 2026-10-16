/**
 * database/database.js - Persistent SQLite Database Manager for SmartWorkforce
 * Powered by Node.js native `node:sqlite` (DatabaseSync).
 * Zero external dependencies required on Node 22.5+ / 24+.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { runMigration } = require('./migrate.js');
const auth = require('../backend/auth.js');

const defaultDbPath = fs.existsSync(path.join(__dirname, 'smartworkforce.db'))
  ? path.join(__dirname, 'smartworkforce.db')
  : path.join(__dirname, '..', 'smartworkforce.db');

const DB_PATH = process.env.DB_PATH || defaultDbPath;

// Initialize or open database
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance & reliability
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Initialize Tables & Migrate Initial Sample Data
 */
function initDatabase() {
  // 1. Employees Table
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
  `);

  // 2. Attendance Events Table
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
      FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // Indexes for high-speed lookups and sorting
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_events_emp_id ON attendance_events(emp_id);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON attendance_events(timestamp);
  `);

  // 3. Run incremental migration to guarantee companies, user_accounts, employee_accounts, sessions exist
  runMigration(db);

  // 4. Migrate Sample Employees (Seed only if table is currently empty)
  const empCountStmt = db.prepare('SELECT COUNT(*) AS count FROM employees');
  const empCount = empCountStmt.get().count;

  if (empCount === 0) {
    const initialEmployees = [
      { id: 'EMP-101', name: 'Aravind Kumar', department: 'Production', role: 'CNC Lead Operator', uid: '7E:A1:39:B2', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#0284C7' },
      { id: 'EMP-102', name: 'Priya Sharma', department: 'Quality', role: 'QA Inspection Specialist', uid: '4F:8B:12:9C', status: 'INSIDE', lastSeen: '08:45:10 AM', avatarBg: '#059669' },
      { id: 'EMP-103', name: 'Rohan Mehta', department: 'IT', role: 'Systems Architect', uid: '9A:3D:77:E1', status: 'INSIDE', lastSeen: '09:02:44 AM', avatarBg: '#7C3AED' },
      { id: 'EMP-104', name: 'Suresh Patel', department: 'Maintenance', role: 'Electro-Mechanical Tech', uid: '1C:F5:62:30', status: 'OUTSIDE', lastSeen: 'Yesterday 05:30 PM', avatarBg: '#D97706' },
      { id: 'EMP-105', name: 'Ananya Iyer', department: 'Production', role: 'Robotics Assembly Lead', uid: 'B3:44:81:AA', status: 'INSIDE', lastSeen: '08:50:22 AM', avatarBg: '#0284C7' },
      { id: 'EMP-106', name: 'Vikram Singh', department: 'IT', role: 'IoT Firmware Engineer', uid: '55:9C:20:F8', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#7C3AED' },
      { id: 'EMP-107', name: 'Deepa Nair', department: 'Quality', role: 'Safety & Compliance Auditor', uid: '6D:E8:3B:14', status: 'INSIDE', lastSeen: '09:12:05 AM', avatarBg: '#059669' },
      { id: 'EMP-108', name: 'Karthik Raja', department: 'Maintenance', role: 'Infrastructure Lead', uid: '81:3A:D4:59', status: 'INSIDE', lastSeen: '08:35:40 AM', avatarBg: '#D97706' },
      { id: 'EMP-109', name: 'Sneha Kulkarni', department: 'Production', role: 'Fabrication Supervisor', uid: '38:B7:C2:90', status: 'OUTSIDE', lastSeen: 'Yesterday 06:15 PM', avatarBg: '#0284C7' },
      { id: 'EMP-110', name: 'Manoj Verma', department: 'IT', role: 'DevOps & Cloud Engineer', uid: 'AA:11:09:47', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#7C3AED' },
      { id: 'EMP-111', name: 'Lakshmi Narayanan', department: 'Quality', role: 'Metrology Lab In-Charge', uid: 'CC:5E:82:1D', status: 'OUTSIDE', lastSeen: 'Yesterday 05:45 PM', avatarBg: '#059669' },
      { id: 'EMP-112', name: 'Ganesh Das', department: 'Production', role: 'Material Handling Coordinator', uid: 'F4:71:03:6B', status: 'INSIDE', lastSeen: '08:58:31 AM', avatarBg: '#0284C7' }
    ];

    const insertEmp = db.prepare(`
      INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMP-DEFAULT-01')
    `);

    const now = new Date().toISOString();
    for (const emp of initialEmployees) {
      insertEmp.run(emp.id, emp.name, emp.department, emp.role, emp.uid, emp.status, emp.lastSeen, emp.avatarBg, now);
    }
  }

  // 5. Migrate Sample Attendance Events (Seed only if table is currently empty)
  const eventCountStmt = db.prepare('SELECT COUNT(*) AS count FROM attendance_events');
  const eventCount = eventCountStmt.get().count;

  if (eventCount === 0) {
    const today = new Date().toISOString().split('T')[0];
    const initialEvents = [
      { id: 'LOG-1001', timestamp: `${today} 08:35:40`, empId: 'EMP-108', empName: 'Karthik Raja', department: 'Maintenance', eventType: 'ENTRY', gate: 'Gate 04 - Maintenance Workshop Gate', status: 'VERIFIED' },
      { id: 'LOG-1002', timestamp: `${today} 08:45:10`, empId: 'EMP-102', empName: 'Priya Sharma', department: 'Quality', eventType: 'ENTRY', gate: 'Gate 01 - Main Turnstile', status: 'VERIFIED' },
      { id: 'LOG-1003', timestamp: `${today} 08:50:22`, empId: 'EMP-105', empName: 'Ananya Iyer', department: 'Production', eventType: 'ENTRY', gate: 'Gate 02 - Production Bay', status: 'VERIFIED' },
      { id: 'LOG-1004', timestamp: `${today} 08:58:31`, empId: 'EMP-112', empName: 'Ganesh Das', department: 'Production', eventType: 'ENTRY', gate: 'Gate 02 - Production Bay', status: 'VERIFIED' },
      { id: 'LOG-1005', timestamp: `${today} 09:02:44`, empId: 'EMP-103', empName: 'Rohan Mehta', department: 'IT', eventType: 'ENTRY', gate: 'Gate 03 - IT Labs Secure Door', status: 'VERIFIED' },
      { id: 'LOG-1006', timestamp: `${today} 09:12:05`, empId: 'EMP-107', empName: 'Deepa Nair', department: 'Quality', eventType: 'ENTRY', gate: 'Gate 01 - Main Turnstile', status: 'VERIFIED' }
    ];

    const insertEvent = db.prepare(`
      INSERT INTO attendance_events (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMP-DEFAULT-01')
    `);

    const seedCreatedAt = new Date(Date.now() - 3600000).toISOString();
    for (const evt of initialEvents) {
      insertEvent.run(evt.id, evt.timestamp, evt.empId, evt.empName, evt.department, evt.eventType, evt.gate, evt.status, seedCreatedAt);
    }
  }
}

// Map database column names to frontend camelCase properties
function formatEmployeeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    role: row.role,
    uid: row.uid,
    status: row.status,
    lastSeen: row.last_seen,
    avatarBg: row.avatar_bg,
    companyId: row.company_id,
    email: row.email || null,
    phone: row.phone || null,
    isArchived: Boolean(row.is_archived),
    archivedAt: row.archived_at || null,
    accountStatus: row.account_status || 'ACTIVE',
    mustChangePassword: row.must_change_password !== undefined && row.must_change_password !== null ? Boolean(row.must_change_password) : true
  };
}

function formatEventRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    timestamp: row.timestamp,
    empId: row.emp_id,
    empName: row.emp_name,
    department: row.department,
    eventType: row.event_type,
    gate: row.gate,
    status: row.status,
    companyId: row.company_id
  };
}

// -------------------------------------------------------------
// Database Query Methods - Operational Workforce & Presence
// -------------------------------------------------------------

function getAllEmployees(companyId = null, includeArchived = true) {
  let sql = `
    SELECT e.*, a.account_status, a.must_change_password
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
  `;
  const conditions = [];
  const params = [];
  if (companyId) {
    conditions.push('e.company_id = ?');
    params.push(companyId);
  }
  if (!includeArchived) {
    conditions.push('(e.is_archived = 0 OR e.is_archived IS NULL)');
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY e.id ASC';
  const stmt = db.prepare(sql);
  return stmt.all(...params).map(formatEmployeeRow);
}

function getEmployeeById(id) {
  const stmt = db.prepare(`
    SELECT e.*, a.account_status, a.must_change_password
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    WHERE e.id = ?
  `);
  return formatEmployeeRow(stmt.get(id));
}

function getEmployeeByUid(uid) {
  if (!uid || typeof uid !== 'string') return null;
  const stmt = db.prepare(`
    SELECT e.*, a.account_status, a.must_change_password
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    WHERE e.uid = ?
  `);
  return formatEmployeeRow(stmt.get(uid));
}

function getEmployeeByEmail(email, companyId = null) {
  if (!email || typeof email !== 'string') return null;
  const normEmail = email.trim().toLowerCase();
  let sql = `
    SELECT e.*, a.account_status, a.must_change_password
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    WHERE LOWER(e.email) = ?
  `;
  if (companyId) {
    sql += ' AND e.company_id = ?';
    const stmt = db.prepare(sql);
    return formatEmployeeRow(stmt.get(normEmail, companyId));
  }
  const stmt = db.prepare(sql);
  return formatEmployeeRow(stmt.get(normEmail));
}

function generateUniqueEmployeeId() {
  const stmt = db.prepare("SELECT id FROM employees WHERE id LIKE 'EMP-%'");
  const rows = stmt.all();
  let maxNum = 100;
  for (const row of rows) {
    const match = row.id.match(/^EMP-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let candidate = `EMP-${maxNum + 1}`;
  while (getEmployeeById(candidate)) {
    maxNum++;
    candidate = `EMP-${maxNum + 1}`;
  }
  return candidate;
}

function createEmployee({ id, name, department, role, uid, avatarBg, companyId, email, phone }) {
  const now = new Date().toISOString();
  const cId = companyId || 'COMP-DEFAULT-01';
  const normUid = (uid && typeof uid === 'string' && uid.trim()) ? uid.trim().toUpperCase() : null;
  const normEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const normPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;
  const stmt = db.prepare(`
    INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id, email, phone)
    VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, department, role, normUid, avatarBg || '#0284C7', now, cId, normEmail, normPhone);
  return getEmployeeById(id);
}

function createEmployeeWithAccount({ id, name, department, role, uid, avatarBg, companyId, password, email, phone }) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Employee name must be at least 2 characters long.');
    err.code = 'INVALID_NAME';
    err.statusCode = 400;
    throw err;
  }
  if (!department || typeof department !== 'string' || !department.trim()) {
    const err = new Error('Department is required.');
    err.code = 'INVALID_DEPARTMENT';
    err.statusCode = 400;
    throw err;
  }
  if (!role || typeof role !== 'string' || role.trim().length < 2) {
    const err = new Error('Job designation / role must be at least 2 characters long.');
    err.code = 'INVALID_ROLE';
    err.statusCode = 400;
    throw err;
  }

  const empId = (id && typeof id === 'string' && id.trim()) ? id.trim() : generateUniqueEmployeeId();
  const normUid = (uid && typeof uid === 'string' && uid.trim()) ? uid.trim().toUpperCase() : null;
  const cId = companyId || 'COMP-DEFAULT-01';
  const normEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const normPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;

  if (normEmail) {
    const existingWithEmail = getEmployeeByEmail(normEmail, cId);
    if (existingWithEmail) {
      const err = new Error(`An employee with email '${normEmail}' already exists in this organization.`);
      err.code = 'DUPLICATE_EMPLOYEE_EMAIL';
      err.statusCode = 409;
      throw err;
    }
  }

  let empPassword = password;
  if (!empPassword) {
    if (normPhone) {
      empPassword = auth.generateEmployeeTemporaryPassword(name.trim(), normPhone);
    } else {
      empPassword = auth.generateTemporaryPassword(14);
    }
  }

  if (!empPassword || typeof empPassword !== 'string' || empPassword.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.code = 'WEAK_PASSWORD';
    err.statusCode = 400;
    throw err;
  }

  // Duplicate Employee ID check
  if (getEmployeeById(empId)) {
    const err = new Error(`Employee with ID ${empId} already exists.`);
    err.code = 'DUPLICATE_EMPLOYEE_ID';
    err.statusCode = 409;
    throw err;
  }

  // Duplicate UID check (only if UID is provided)
  if (normUid && getEmployeeByUid(normUid)) {
    const err = new Error(`Smart Card UID ${normUid} is already assigned to another employee.`);
    err.code = 'DUPLICATE_CARD_UID';
    err.statusCode = 409;
    throw err;
  }

  const now = new Date().toISOString();
  const salt = auth.generateSalt();
  const passwordHash = auth.hashPassword(empPassword, salt);
  const accountId = auth.generateId('ACC');
  const bg = avatarBg || '#0284C7';

  // Atomic SQLite transaction ensures no inconsistent/orphaned records
  db.exec('BEGIN TRANSACTION;');
  try {
    const insertEmp = db.prepare(`
      INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id, email, phone)
      VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?, ?, ?, ?)
    `);
    insertEmp.run(empId, name.trim(), department.trim(), role.trim(), normUid, bg, now, cId, normEmail, normPhone);

    const insertAcc = db.prepare(`
      INSERT INTO employee_accounts (id, employee_id, company_id, password_hash, password_salt, must_change_password, account_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?)
    `);
    insertAcc.run(accountId, empId, cId, passwordHash, salt, now, now);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    employee: getEmployeeById(empId),
    account: getEmployeeAccountByEmpId(empId),
    temporaryPassword: empPassword
  };
}

function updateEmployee({ id, name, department, role, uid, email, phone, companyId }) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Employee ID is required.');
    err.code = 'INVALID_EMPLOYEE_ID';
    err.statusCode = 400;
    throw err;
  }

  const existing = getEmployeeById(id);
  if (!existing) {
    const err = new Error(`Employee with ID '${id}' not found.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (companyId && existing.companyId && existing.companyId !== companyId) {
    const err = new Error(`Employee with ID '${id}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Employee full name must be at least 2 characters long.');
    err.code = 'INVALID_NAME';
    err.statusCode = 400;
    throw err;
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    const err = new Error('Department is required.');
    err.code = 'INVALID_DEPARTMENT';
    err.statusCode = 400;
    throw err;
  }

  if (!role || typeof role !== 'string' || role.trim().length < 2) {
    const err = new Error('Job designation / role must be at least 2 characters long.');
    err.code = 'INVALID_ROLE';
    err.statusCode = 400;
    throw err;
  }

  let normEmail = null;
  if (email !== undefined && email !== null && typeof email === 'string' && email.trim().length > 0) {
    const trimmedEmail = email.trim();
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      const err = new Error('Invalid email format. Please provide a valid email address.');
      err.code = 'INVALID_EMAIL';
      err.statusCode = 400;
      throw err;
    }
    normEmail = trimmedEmail.toLowerCase();
    const targetCompId = companyId || existing.companyId;
    if (targetCompId) {
      const dupStmt = db.prepare('SELECT id FROM employees WHERE LOWER(email) = ? AND company_id = ? AND id != ?');
      const dup = dupStmt.get(normEmail, targetCompId, id);
      if (dup) {
        const err = new Error(`An employee with email '${normEmail}' already exists in this organization.`);
        err.code = 'DUPLICATE_EMPLOYEE_EMAIL';
        err.statusCode = 409;
        throw err;
      }
    }
  }

  let normPhone = null;
  if (phone !== undefined && phone !== null && typeof phone === 'string' && phone.trim().length > 0) {
    const trimmedPhone = phone.trim();
    const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
    const digits = trimmedPhone.replace(/\D/g, '');
    if (!PHONE_REGEX.test(trimmedPhone) || digits.length < 7 || digits.length > 15) {
      const err = new Error('Invalid phone number format. Please provide a valid phone number with 7 to 15 digits.');
      err.code = 'INVALID_PHONE';
      err.statusCode = 400;
      throw err;
    }
    normPhone = trimmedPhone;
  }

  let normUid = null;
  if (uid !== undefined && uid !== null && typeof uid === 'string' && uid.trim().length > 0) {
    normUid = uid.trim().toUpperCase();
    if (normUid.length < 4 || normUid.length > 64) {
      const err = new Error('Invalid UID format: Smart Card UID must be between 4 and 64 characters.');
      err.code = 'INVALID_UID';
      err.statusCode = 400;
      throw err;
    }
    const dupUidStmt = db.prepare('SELECT id FROM employees WHERE UPPER(uid) = ? AND id != ?');
    const dupUid = dupUidStmt.get(normUid, id);
    if (dupUid) {
      const err = new Error(`Smart Card UID ${normUid} is already assigned to another employee.`);
      err.code = 'DUPLICATE_CARD_UID';
      err.statusCode = 409;
      throw err;
    }
  }

  const updateStmt = db.prepare(`
    UPDATE employees
    SET name = ?, department = ?, role = ?, uid = ?, email = ?, phone = ?
    WHERE id = ? AND company_id = ?
  `);
  updateStmt.run(name.trim(), department.trim(), role.trim(), normUid, normEmail, normPhone, id, companyId || existing.companyId);

  return getEmployeeById(id);
}

function deactivateEmployee(id, companyId) {
  const emp = getEmployeeById(id);
  if (!emp || (companyId && emp.companyId && emp.companyId !== companyId)) {
    const err = new Error(`Employee with ID '${id}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  updateEmployeeAccountStatus(id, 'SUSPENDED');
  deleteSessionsByAccount(id);

  return {
    success: true,
    message: `Employee '${emp.name}' (${emp.id}) deactivated. All active sessions terminated.`,
    accountStatus: 'SUSPENDED',
    employee: getEmployeeById(id)
  };
}

function reactivateEmployee(id, companyId) {
  const emp = getEmployeeById(id);
  if (!emp || (companyId && emp.companyId && emp.companyId !== companyId)) {
    const err = new Error(`Employee with ID '${id}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  updateEmployeeAccountStatus(id, 'ACTIVE');

  return {
    success: true,
    message: `Employee '${emp.name}' (${emp.id}) reactivated successfully.`,
    accountStatus: 'ACTIVE',
    employee: getEmployeeById(id)
  };
}

function deleteOrArchiveEmployee(id, companyId) {
  const emp = getEmployeeById(id);
  if (!emp || (companyId && emp.companyId && emp.companyId !== companyId)) {
    const err = new Error(`Employee with ID '${id}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  // Schema Inspection Notice:
  // `attendance_events` defines `FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE`.
  // Executing a physical `DELETE FROM employees` would permanently destroy all attendance event history!
  // Therefore, a safe reversible archiving/soft-delete is enforced to guarantee audit and data preservation.
  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = db.prepare(`
      UPDATE employees
      SET is_archived = 1, archived_at = ?
      WHERE id = ? AND company_id = ?
    `);
    stmt.run(now, id, companyId || emp.companyId);

    // Also suspend account and terminate sessions
    updateEmployeeAccountStatus(id, 'SUSPENDED');
    deleteSessionsByAccount(id);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    success: true,
    archived: true,
    message: `Employee '${emp.name}' (${emp.id}) safely archived. Historical attendance logs preserved.`,
    employee: getEmployeeById(id)
  };
}

function restoreArchivedEmployee(id, companyId) {
  const emp = getEmployeeById(id);
  if (!emp || (companyId && emp.companyId && emp.companyId !== companyId)) {
    const err = new Error(`Employee with ID '${id}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    const stmt = db.prepare(`
      UPDATE employees
      SET is_archived = 0, archived_at = NULL
      WHERE id = ? AND company_id = ?
    `);
    stmt.run(id, companyId || emp.companyId);

    updateEmployeeAccountStatus(id, 'ACTIVE');
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    success: true,
    message: `Employee '${emp.name}' (${emp.id}) successfully restored from archive.`,
    employee: getEmployeeById(id)
  };
}

function getAllAttendanceEvents(companyId = null) {
  if (companyId) {
    const stmt = db.prepare('SELECT * FROM attendance_events WHERE company_id = ? ORDER BY rowid ASC');
    return stmt.all(companyId).map(formatEventRow);
  }
  const stmt = db.prepare('SELECT * FROM attendance_events ORDER BY rowid ASC');
  return stmt.all().map(formatEventRow);
}

// Configurable duplicate-read debounce window in milliseconds (default: 5000ms / 5s)
const DEBOUNCE_MS = parseInt(process.env.SCAN_DEBOUNCE_MS, 10) || 5000;

// In-memory cache for ultra-fast millisecond debounce tracking: key -> timestamp
const recentScansCache = new Map();

function getLatestEventForEmployee(empId) {
  const stmt = db.prepare('SELECT * FROM attendance_events WHERE emp_id = ? ORDER BY rowid DESC LIMIT 1');
  return formatEventRow(stmt.get(empId));
}

function getAttendanceEventsForEmployee(empId, companyId = null) {
  if (companyId) {
    const stmt = db.prepare('SELECT * FROM attendance_events WHERE emp_id = ? AND company_id = ? ORDER BY rowid DESC');
    return stmt.all(empId, companyId).map(formatEventRow);
  }
  const stmt = db.prepare('SELECT * FROM attendance_events WHERE emp_id = ? ORDER BY rowid DESC');
  return stmt.all(empId).map(formatEventRow);
}

function recordCardScan({ empId, uid, mode, gate }) {
  // 1. Resolve employee by UID or by Employee ID
  let emp = null;
  const lookupUid = typeof uid === 'string' ? uid.trim().toUpperCase() : null;
  const lookupEmpId = typeof empId === 'string' ? empId.trim().toUpperCase() : null;

  if (lookupUid) {
    emp = getEmployeeByUid(lookupUid);
    if (!emp) {
      const err = new Error(`Smart Card UID '${lookupUid}' is not registered to any employee.`);
      err.code = 'UNKNOWN_UID';
      err.uid = lookupUid;
      throw err;
    }
  } else if (lookupEmpId) {
    emp = getEmployeeById(lookupEmpId);
    if (!emp) {
      const err = new Error(`Employee with ID '${lookupEmpId}' not found.`);
      err.code = 'EMPLOYEE_NOT_FOUND';
      err.empId = lookupEmpId;
      throw err;
    }
  } else {
    const err = new Error('Either "uid" or "empId" must be provided to record card scan.');
    err.code = 'MISSING_IDENTIFIER';
    throw err;
  }

  if (emp.isArchived) {
    const err = new Error(`Employee record '${emp.name}' (${emp.id}) has been archived.`);
    err.code = 'EMPLOYEE_ARCHIVED';
    err.empId = emp.id;
    throw err;
  }

  // 2. Validate Event Mode (AUTO, ENTRY, EXIT)
  const validModes = ['AUTO', 'ENTRY', 'EXIT'];
  const selectedMode = (mode || 'AUTO').toUpperCase();
  if (!validModes.includes(selectedMode)) {
    const err = new Error(`Invalid scan mode '${mode}'. Allowed modes: AUTO, ENTRY, EXIT.`);
    err.code = 'INVALID_MODE';
    throw err;
  }

  const gateLocation = gate || 'Gate 01 - Main Facility Turnstile';
  const now = new Date();
  const nowMs = now.getTime();

  // 3. Five-Second Duplicate-Read Protection (Debounce per card/employee and gate)
  const cacheKey = `${emp.id}::${gateLocation}`;
  const lastScanTime = recentScansCache.get(cacheKey) || 0;
  const timeSinceCache = nowMs - lastScanTime;

  if (timeSinceCache < DEBOUNCE_MS) {
    return {
      ignored: true,
      reason: 'DUPLICATE_READ_PROTECTION',
      message: `Repeated card read ignored for ${emp.name} (${emp.id}) at ${gateLocation}. Debounce window: ${DEBOUNCE_MS / 1000}s.`,
      debounceMs: DEBOUNCE_MS,
      timeRemainingMs: DEBOUNCE_MS - timeSinceCache,
      employee: emp,
      event: getLatestEventForEmployee(emp.id)
    };
  }

  // Check database for recent event within debounce window (handles multi-process or cold cache)
  const recentStmt = db.prepare(`
    SELECT * FROM attendance_events
    WHERE emp_id = ? AND gate = ?
    ORDER BY rowid DESC LIMIT 1
  `);
  const lastDbEvent = recentStmt.get(emp.id, gateLocation);
  if (lastDbEvent && lastDbEvent.created_at) {
    const dbEventTime = new Date(lastDbEvent.created_at).getTime();
    if (nowMs - dbEventTime < DEBOUNCE_MS) {
      recentScansCache.set(cacheKey, dbEventTime);
      return {
        ignored: true,
        reason: 'DUPLICATE_READ_PROTECTION',
        message: `Repeated card read ignored for ${emp.name} (${emp.id}) at ${gateLocation}. Debounce window: ${DEBOUNCE_MS / 1000}s.`,
        debounceMs: DEBOUNCE_MS,
        timeRemainingMs: DEBOUNCE_MS - (nowMs - dbEventTime),
        employee: emp,
        event: formatEventRow(lastDbEvent)
      };
    }
  }

  // Record timestamp in memory debounce cache
  recentScansCache.set(cacheKey, nowMs);

  // 4. Calculate Event Type and Target Status
  let eventType = 'ENTRY';
  if (selectedMode === 'AUTO') {
    eventType = emp.status === 'INSIDE' ? 'EXIT' : 'ENTRY';
  } else {
    eventType = selectedMode;
  }

  const isEntry = eventType === 'ENTRY';
  const newStatus = isEntry ? 'INSIDE' : 'OUTSIDE';

  // Format timestamp (YYYY-MM-DD HH:mm:ss)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  // Time-only string for last_seen (HH:mm:ss AM/PM)
  let rawH = now.getHours();
  const ampm = rawH >= 12 ? 'PM' : 'AM';
  rawH = rawH % 12 || 12;
  const timeOnly = `${String(rawH).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;

  // Generate unique sequential Log ID
  const countStmt = db.prepare('SELECT COUNT(*) AS total FROM attendance_events');
  const totalEvents = countStmt.get().total;
  const logId = `LOG-${1001 + totalEvents}`;

  const isoNow = now.toISOString();
  const companyId = emp.companyId || emp.company_id || 'COMP-DEFAULT-01';

  // Execute in transaction: insert event + update employee
  db.exec('BEGIN TRANSACTION;');
  try {
    const insertEvent = db.prepare(`
      INSERT INTO attendance_events (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?)
    `);
    insertEvent.run(logId, formattedTimestamp, emp.id, emp.name, emp.department, eventType, gateLocation, isoNow, companyId);

    const updateEmp = db.prepare(`
      UPDATE employees
      SET status = ?, last_seen = ?
      WHERE id = ?
    `);
    updateEmp.run(newStatus, timeOnly, emp.id);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    ignored: false,
    event: {
      id: logId,
      timestamp: formattedTimestamp,
      empId: emp.id,
      empName: emp.name,
      department: emp.department,
      eventType: eventType,
      gate: gateLocation,
      status: 'VERIFIED',
      companyId: companyId
    },
    employee: getEmployeeById(emp.id)
  };
}

function clearAttendanceEvents(companyId = null) {
  if (companyId) {
    const stmt = db.prepare('DELETE FROM attendance_events WHERE company_id = ?');
    stmt.run(companyId);
    return { success: true, count: 0 };
  }
  db.exec('DELETE FROM attendance_events;');
  return { success: true, count: 0 };
}

function resetDatabase() {
  db.exec('DROP TABLE IF EXISTS attendance_events;');
  db.exec('DROP TABLE IF EXISTS employees;');
  db.exec('DROP TABLE IF EXISTS employee_accounts;');
  db.exec('DROP TABLE IF EXISTS sessions;');
  db.exec('DROP TABLE IF EXISTS company_users;');
  db.exec('DROP TABLE IF EXISTS companies;');
  initDatabase();
  return { success: true };
}

// -------------------------------------------------------------
// Database Query Methods - Authentication & Multi-Tenancy
// -------------------------------------------------------------

function getCompanyById(id) {
  const stmt = db.prepare('SELECT * FROM companies WHERE id = ?');
  return stmt.get(id);
}

function getCompanyByEmail(email) {
  const stmt = db.prepare('SELECT * FROM companies WHERE email = ?');
  return stmt.get(email);
}

function createCompany({ id, name, industry, email }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO companies (id, name, industry, email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, industry, email, now, now);
  return getCompanyById(id);
}

function getCompanyUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM company_users WHERE email = ?');
  return stmt.get(email);
}

function getCompanyUserById(id) {
  const stmt = db.prepare('SELECT * FROM company_users WHERE id = ?');
  return stmt.get(id);
}

function getCompanyUserByEmailOrId(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();
  const normEmail = trimmed.toLowerCase();
  const stmt = db.prepare('SELECT * FROM company_users WHERE email = ? OR id = ?');
  return stmt.get(normEmail, trimmed);
}

function registerCompanyWithHead({ companyName, industry, adminFullName, email, password }) {
  const normEmail = (email || '').trim().toLowerCase();

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
    const err = new Error('Company name must be at least 2 characters long.');
    err.code = 'INVALID_COMPANY_NAME';
    err.statusCode = 400;
    throw err;
  }
  if (!industry || typeof industry !== 'string' || !industry.trim()) {
    const err = new Error('Industry selection is required.');
    err.code = 'INVALID_INDUSTRY';
    err.statusCode = 400;
    throw err;
  }
  if (!adminFullName || typeof adminFullName !== 'string' || adminFullName.trim().length < 2) {
    const err = new Error('Company head full name must be at least 2 characters long.');
    err.code = 'INVALID_FULL_NAME';
    err.statusCode = 400;
    throw err;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normEmail || !emailRegex.test(normEmail)) {
    const err = new Error('Invalid email address format.');
    err.code = 'INVALID_EMAIL';
    err.statusCode = 400;
    throw err;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.code = 'WEAK_PASSWORD';
    err.statusCode = 400;
    throw err;
  }

  // Pre-checks for duplicate emails
  if (getCompanyByEmail(normEmail)) {
    const err = new Error(`A company with email '${normEmail}' is already registered.`);
    err.code = 'COMPANY_EMAIL_EXISTS';
    err.statusCode = 409;
    throw err;
  }
  if (getCompanyUserByEmail(normEmail)) {
    const err = new Error(`A user account with email '${normEmail}' already exists.`);
    err.code = 'USER_EMAIL_EXISTS';
    err.statusCode = 409;
    throw err;
  }

  const companyId = auth.generateId('COMP');
  const userId = auth.generateId('USR');
  const salt = auth.generateSalt();
  const passwordHash = auth.hashPassword(password, salt);
  const now = new Date().toISOString();

  // Atomic SQLite transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    const insertComp = db.prepare(`
      INSERT INTO companies (id, name, industry, email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertComp.run(companyId, companyName.trim(), industry.trim(), normEmail, now, now);

    const insertUser = db.prepare(`
      INSERT INTO company_users (id, company_id, email, full_name, password_hash, password_salt, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'COMPANY_HEAD', ?, ?)
    `);
    insertUser.run(userId, companyId, normEmail, adminFullName.trim(), passwordHash, salt, now, now);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return {
    company: getCompanyById(companyId),
    user: getCompanyUserById(userId)
  };
}

function createCompanyUser({ id, companyId, email, fullName, passwordHash, passwordSalt, role }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO company_users (id, company_id, email, full_name, password_hash, password_salt, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, companyId, email, fullName, passwordHash, passwordSalt, role, now, now);
  return getCompanyUserById(id);
}

function getEmployeeAccountByEmpId(empId) {
  const stmt = db.prepare('SELECT * FROM employee_accounts WHERE employee_id = ?');
  return stmt.get(empId);
}

function createEmployeeAccount({ id, employeeId, companyId, passwordHash, passwordSalt, mustChangePassword }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO employee_accounts (id, employee_id, company_id, password_hash, password_salt, must_change_password, account_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);
  stmt.run(id, employeeId, companyId, passwordHash, passwordSalt, mustChangePassword ? 1 : 0, now, now);
  return getEmployeeAccountByEmpId(employeeId);
}

function updateEmployeePassword(employeeId, passwordHash, passwordSalt) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE employee_accounts
    SET password_hash = ?, password_salt = ?, must_change_password = 0, password_updated_at = ?, updated_at = ?
    WHERE employee_id = ?
  `);
  stmt.run(passwordHash, passwordSalt, now, now, employeeId);
  return getEmployeeAccountByEmpId(employeeId);
}

function updateEmployeeAccountStatus(employeeId, status) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE employee_accounts
    SET account_status = ?, updated_at = ?
    WHERE employee_id = ?
  `);
  stmt.run(status, now, employeeId);
  return getEmployeeAccountByEmpId(employeeId);
}

function createSession({ id, accountId, userType, companyId, csrfToken, ipAddress, userAgent, expiresAt }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, account_id, user_type, company_id, csrf_token, ip_address, user_agent, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, accountId, userType, companyId, csrfToken, ipAddress || null, userAgent || null, now, expiresAt);
  return getSession(id);
}

function getSession(token) {
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(token);
}

function deleteSession(token) {
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  stmt.run(token);
  return true;
}

function deleteSessionsByAccount(accountId) {
  const stmt = db.prepare('DELETE FROM sessions WHERE account_id = ?');
  stmt.run(accountId);
  return true;
}

function cleanExpiredSessions() {
  const now = new Date().toISOString();
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
  stmt.run(now);
}

// Run table creation and seed check
initDatabase();

module.exports = {
  db,
  DB_PATH,
  DEBOUNCE_MS,
  initDatabase,
  resetDatabase,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByUid,
  getEmployeeByEmail,
  getLatestEventForEmployee,
  generateUniqueEmployeeId,
  createEmployee,
  createEmployeeWithAccount,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  deleteOrArchiveEmployee,
  restoreArchivedEmployee,
  getAllAttendanceEvents,
  getAttendanceEventsForEmployee,
  recordCardScan,
  clearAttendanceEvents,
  // Auth & Multi-Tenancy Exports
  getCompanyById,
  getCompanyByEmail,
  createCompany,
  getCompanyUserByEmail,
  getCompanyUserById,
  getCompanyUserByEmailOrId,
  createCompanyUser,
  registerCompanyWithHead,
  getEmployeeAccountByEmpId,
  createEmployeeAccount,
  updateEmployeePassword,
  updateEmployeeAccountStatus,
  createSession,
  getSession,
  deleteSession,
  deleteSessionsByAccount,
  cleanExpiredSessions
};

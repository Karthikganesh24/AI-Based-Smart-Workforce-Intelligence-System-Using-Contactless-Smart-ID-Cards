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
      uid TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'OUTSIDE',
      last_seen TEXT NOT NULL DEFAULT 'Not detected today',
      avatar_bg TEXT NOT NULL DEFAULT '#0284C7',
      created_at TEXT NOT NULL
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
    companyId: row.company_id
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

function getAllEmployees(companyId = null) {
  if (companyId) {
    const stmt = db.prepare('SELECT * FROM employees WHERE company_id = ? ORDER BY id ASC');
    return stmt.all(companyId).map(formatEmployeeRow);
  }
  const stmt = db.prepare('SELECT * FROM employees ORDER BY id ASC');
  return stmt.all().map(formatEmployeeRow);
}

function getEmployeeById(id) {
  const stmt = db.prepare('SELECT * FROM employees WHERE id = ?');
  return formatEmployeeRow(stmt.get(id));
}

function getEmployeeByUid(uid) {
  const stmt = db.prepare('SELECT * FROM employees WHERE uid = ?');
  return formatEmployeeRow(stmt.get(uid));
}

function createEmployee({ id, name, department, role, uid, avatarBg, companyId }) {
  const now = new Date().toISOString();
  const cId = companyId || 'COMP-DEFAULT-01';
  const stmt = db.prepare(`
    INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id)
    VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?, ?)
  `);
  stmt.run(id, name, department, role, uid, avatarBg || '#0284C7', now, cId);
  return getEmployeeById(id);
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
  getLatestEventForEmployee,
  createEmployee,
  getAllAttendanceEvents,
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
  createSession,
  getSession,
  deleteSession,
  deleteSessionsByAccount,
  cleanExpiredSessions
};

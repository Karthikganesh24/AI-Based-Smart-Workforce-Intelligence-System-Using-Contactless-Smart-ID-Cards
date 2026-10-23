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
    mustChangePassword: row.must_change_password !== undefined && row.must_change_password !== null ? Boolean(row.must_change_password) : true,
    managerId: row.manager_id || null,
    managerName: row.manager_name || null,
    orgUnitId: row.org_unit_id || null,
    orgUnitName: row.org_unit_name || null,
    jobTitleId: row.job_title_id || null,
    jobTitleName: row.job_title_name || null,
    accessRoleId: row.access_role_id || null,
    accessRoleName: row.access_role_name || null
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
    SELECT e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
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
    SELECT e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
    WHERE e.id = ?
  `);
  return formatEmployeeRow(stmt.get(id));
}

function getEmployeeByUid(uid) {
  if (!uid || typeof uid !== 'string') return null;
  const stmt = db.prepare(`
    SELECT e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
    WHERE e.uid = ?
  `);
  return formatEmployeeRow(stmt.get(uid));
}

function getEmployeeByEmail(email, companyId = null) {
  if (!email || typeof email !== 'string') return null;
  const normEmail = email.trim().toLowerCase();
  let sql = `
    SELECT e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
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

function createEmployee({ id, name, department, role, uid, avatarBg, companyId, email, phone, managerId, orgUnitId, jobTitleId, accessRoleId }) {
  const now = new Date().toISOString();
  const cId = companyId || 'COMP-DEFAULT-01';
  const normUid = (uid && typeof uid === 'string' && uid.trim()) ? uid.trim().toUpperCase() : null;
  const normEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const normPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;
  const stmt = db.prepare(`
    INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id, email, phone, manager_id, org_unit_id, job_title_id, access_role_id)
    VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, department, role, normUid, avatarBg || '#0284C7', now, cId, normEmail, normPhone, managerId || null, orgUnitId || null, jobTitleId || null, accessRoleId || null);
  return getEmployeeById(id);
}

function createEmployeeWithAccount({ 
  id, name, department, role, uid, avatarBg, companyId, password, email, phone,
  managerId, orgUnitId, jobTitleId, accessRoleId
}) {
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Employee name must be at least 2 characters long.');
    err.code = 'INVALID_NAME';
    err.statusCode = 400;
    throw err;
  }

  const empId = (id && typeof id === 'string' && id.trim()) ? id.trim() : generateUniqueEmployeeId();
  const normUid = (uid && typeof uid === 'string' && uid.trim()) ? uid.trim().toUpperCase() : null;
  const cId = companyId || 'COMP-DEFAULT-01';
  const normEmail = (email && typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const normPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;

  // Validate or resolve organizational unit
  let targetOrgUnitId = null;
  let targetDepartment = (department && typeof department === 'string') ? department.trim() : '';
  if (orgUnitId !== undefined && orgUnitId !== null && typeof orgUnitId === 'string' && orgUnitId.trim()) {
    const cleanUnitId = orgUnitId.trim();
    const unit = validateOrgUnitBelongsToCompany(cleanUnitId, cId);
    targetOrgUnitId = cleanUnitId;
    if (!targetDepartment && unit && unit.name) targetDepartment = unit.name;
  } else if (targetDepartment) {
    const matchedUnit = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND LOWER(name) = ?').get(cId, targetDepartment.toLowerCase());
    if (matchedUnit) targetOrgUnitId = matchedUnit.id;
  }

  if (!targetDepartment) {
    const err = new Error('Department or organizational unit is required.');
    err.code = 'INVALID_DEPARTMENT';
    err.statusCode = 400;
    throw err;
  }

  // Validate or resolve job title
  let targetJobTitleId = null;
  let targetRole = (role && typeof role === 'string') ? role.trim() : '';
  if (jobTitleId !== undefined && jobTitleId !== null && typeof jobTitleId === 'string' && jobTitleId.trim()) {
    const cleanJobId = jobTitleId.trim();
    const job = validateJobTitleBelongsToCompany(cleanJobId, cId);
    targetJobTitleId = cleanJobId;
    if (!targetRole && job && job.title) targetRole = job.title;
  } else if (targetRole) {
    const matchedTitle = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND LOWER(title) = ?').get(cId, targetRole.toLowerCase());
    if (matchedTitle) targetJobTitleId = matchedTitle.id;
  }

  if (!targetRole || targetRole.length < 2) {
    const err = new Error('Job designation / role must be at least 2 characters long.');
    err.code = 'INVALID_ROLE';
    err.statusCode = 400;
    throw err;
  }

  // Validate manager assignment
  let targetManagerId = null;
  if (managerId !== undefined && managerId !== null && typeof managerId === 'string' && managerId.trim()) {
    const cleanMgrId = managerId.trim();
    validateReportingAssignment(empId, cleanMgrId, cId);
    targetManagerId = cleanMgrId;
  }

  // Validate access role assignment
  let targetAccessRoleId = null;
  if (accessRoleId !== undefined && accessRoleId !== null && typeof accessRoleId === 'string' && accessRoleId.trim()) {
    const cleanRoleId = accessRoleId.trim();
    validateAccessRoleBelongsToCompany(cleanRoleId, cId);
    targetAccessRoleId = cleanRoleId;
  } else {
    // Default to 'Employee' system role for this company
    const defaultStaffRole = db.prepare("SELECT id FROM company_access_roles WHERE company_id = ? AND name = 'Employee'").get(cId);
    if (defaultStaffRole) targetAccessRoleId = defaultStaffRole.id;
  }

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
      INSERT INTO employees (
        id, name, department, role, uid, status, last_seen, avatar_bg, created_at, company_id, email, phone,
        manager_id, org_unit_id, job_title_id, access_role_id
      )
      VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEmp.run(
      empId, name.trim(), targetDepartment, targetRole, normUid, bg, now, cId, normEmail, normPhone,
      targetManagerId, targetOrgUnitId, targetJobTitleId, targetAccessRoleId
    );

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

function updateEmployee({ 
  id, name, department, role, uid, email, phone, companyId,
  managerId, orgUnitId, jobTitleId, accessRoleId
}) {
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

  const targetCompId = companyId || existing.companyId;
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

  // Handle department and org_unit_id updates
  let targetDepartment = (department !== undefined && department !== null) ? department.trim() : existing.department;
  let targetOrgUnitId = existing.orgUnitId;
  if (orgUnitId !== undefined) {
    if (orgUnitId !== null && typeof orgUnitId === 'string' && orgUnitId.trim()) {
      const cleanUnitId = orgUnitId.trim();
      const unit = validateOrgUnitBelongsToCompany(cleanUnitId, targetCompId);
      targetOrgUnitId = cleanUnitId;
      if (unit && unit.name && department === undefined) targetDepartment = unit.name;
    } else {
      targetOrgUnitId = null;
    }
  } else if (department !== undefined && department.trim() !== existing.department) {
    const matchedUnit = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND LOWER(name) = ?').get(targetCompId, targetDepartment.toLowerCase());
    if (matchedUnit) targetOrgUnitId = matchedUnit.id;
  }

  if (!targetDepartment) {
    const err = new Error('Department is required.');
    err.code = 'INVALID_DEPARTMENT';
    err.statusCode = 400;
    throw err;
  }

  // Handle role and job_title_id updates
  let targetRole = (role !== undefined && role !== null) ? role.trim() : existing.role;
  let targetJobTitleId = existing.jobTitleId;
  if (jobTitleId !== undefined) {
    if (jobTitleId !== null && typeof jobTitleId === 'string' && jobTitleId.trim()) {
      const cleanJobId = jobTitleId.trim();
      const job = validateJobTitleBelongsToCompany(cleanJobId, targetCompId);
      targetJobTitleId = cleanJobId;
      if (job && job.title && role === undefined) targetRole = job.title;
    } else {
      targetJobTitleId = null;
    }
  } else if (role !== undefined && role.trim() !== existing.role) {
    const matchedTitle = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND LOWER(title) = ?').get(targetCompId, targetRole.toLowerCase());
    if (matchedTitle) targetJobTitleId = matchedTitle.id;
  }

  if (!targetRole || targetRole.length < 2) {
    const err = new Error('Job designation / role must be at least 2 characters long.');
    err.code = 'INVALID_ROLE';
    err.statusCode = 400;
    throw err;
  }

  // Handle manager_id updates
  let targetManagerId = existing.managerId;
  if (managerId !== undefined) {
    if (managerId !== null && typeof managerId === 'string' && managerId.trim()) {
      const cleanMgrId = managerId.trim();
      validateReportingAssignment(id, cleanMgrId, targetCompId);
      targetManagerId = cleanMgrId;
    } else {
      targetManagerId = null;
    }
  }

  // Handle access_role_id updates
  let targetAccessRoleId = existing.accessRoleId;
  if (accessRoleId !== undefined) {
    if (accessRoleId !== null && typeof accessRoleId === 'string' && accessRoleId.trim()) {
      const cleanRoleId = accessRoleId.trim();
      validateAccessRoleBelongsToCompany(cleanRoleId, targetCompId);
      targetAccessRoleId = cleanRoleId;
    } else {
      targetAccessRoleId = null;
    }
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
    SET name = ?, department = ?, role = ?, uid = ?, email = ?, phone = ?,
        manager_id = ?, org_unit_id = ?, job_title_id = ?, access_role_id = ?
    WHERE id = ? AND company_id = ?
  `);
  updateStmt.run(
    name.trim(), targetDepartment, targetRole, normUid, normEmail, normPhone,
    targetManagerId, targetOrgUnitId, targetJobTitleId, targetAccessRoleId,
    id, targetCompId
  );

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

function recordCardScan({ empId, uid, mode, gate, deviceId }) {
  // 1. Resolve employee by UID (or BLE beacon UUID) or by Employee ID
  let emp = null;
  const lookupUid = typeof uid === 'string' ? uid.trim().toUpperCase() : null;
  const lookupEmpId = typeof empId === 'string' ? empId.trim().toUpperCase() : null;

  if (lookupUid) {
    // Try RFID UID first
    emp = getEmployeeByUid(lookupUid);

    // If not found and looks like UUID (contains dashes), try BLE beacon lookup
    if (!emp && lookupUid.includes('-')) {
      const stmt = db.prepare('SELECT * FROM employees WHERE UPPER(ble_beacon_uuid) = ?');
      const row = stmt.get(lookupUid);
      if (row) emp = formatEmployeeRow(row);
    }

    if (!emp) {
      const err = new Error(`Smart Card UID or BLE beacon '${lookupUid}' is not registered to any employee.`);
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

  // 2. Lookup reader and determine location type
  let reader = null;
  let isRoomReader = false;
  let targetRoom = null;
  let locationType = 'FACILITY';

  if (deviceId) {
    reader = getReaderByDeviceId(deviceId);
    if (reader && reader.room_id) {
      isRoomReader = true;
      targetRoom = getRoomById(reader.room_id);
      locationType = 'ROOM';
    }
  }

  // 3. Validate Event Mode (AUTO, ENTRY, EXIT)
  const validModes = ['AUTO', 'ENTRY', 'EXIT'];
  const selectedMode = (mode || 'AUTO').toUpperCase();
  if (!validModes.includes(selectedMode)) {
    const err = new Error(`Invalid scan mode '${mode}'. Allowed modes: AUTO, ENTRY, EXIT.`);
    err.code = 'INVALID_MODE';
    throw err;
  }

  const gateLocation = reader ? reader.gate_name : (gate || 'Gate 01 - Main Facility Turnstile');
  const now = new Date();
  const nowMs = now.getTime();

  // 4. Five-Second Duplicate-Read Protection (Debounce per card/employee and gate)
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

  // 5. Determine Event Type based on reader location type
  let eventType = 'ENTRY';

  if (reader) {
    // Use reader location type to determine event
    if (reader.location_type === 'FACILITY_ENTRY') {
      eventType = 'ENTRY';
    } else if (reader.location_type === 'FACILITY_EXIT') {
      eventType = 'EXIT';
    } else if (reader.location_type === 'ROOM_ENTRY') {
      eventType = 'ENTRY';
      // Hierarchical validation: must be in facility before entering room
      if (emp.status !== 'INSIDE') {
        const err = new Error(`Cannot enter room: employee must enter facility first.`);
        err.code = 'NOT_IN_FACILITY';
        err.requiredAction = 'FACILITY_ENTRY';
        throw err;
      }
    } else if (reader.location_type === 'ROOM_EXIT') {
      eventType = 'EXIT';
    }
  } else if (selectedMode === 'AUTO') {
    // Fallback to AUTO mode if no reader found
    eventType = emp.status === 'INSIDE' ? 'EXIT' : 'ENTRY';
  } else {
    eventType = selectedMode;
  }

  const isEntry = eventType === 'ENTRY';
  const newStatus = isRoomReader ? emp.status : (isEntry ? 'INSIDE' : 'OUTSIDE');

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

  // 6. Execute in transaction: insert event + update employee + handle room occupancy
  db.exec('BEGIN TRANSACTION;');
  try {
    // Insert attendance event with room tracking fields
    const insertEvent = db.prepare(`
      INSERT INTO attendance_events
      (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at, company_id, room_id, reader_id, location_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?, ?, ?, ?, ?)
    `);
    insertEvent.run(
      logId, formattedTimestamp, emp.id, emp.name, emp.department, eventType,
      gateLocation, isoNow, companyId,
      targetRoom ? targetRoom.id : null,
      reader ? reader.id : null,
      locationType
    );

    // Update employee facility status (only if not a room reader)
    if (!isRoomReader) {
      const updateEmp = db.prepare(`
        UPDATE employees SET status = ?, last_seen = ? WHERE id = ?
      `);
      updateEmp.run(newStatus, timeOnly, emp.id);

      // Clear all room occupancy on facility exit
      if (eventType === 'EXIT') {
        db.prepare('DELETE FROM room_occupancy WHERE emp_id = ?').run(emp.id);
      }

      // Clear stale room occupancy on facility entry (in case employee forgot to exit rooms previously)
      if (eventType === 'ENTRY') {
        db.prepare('DELETE FROM room_occupancy WHERE emp_id = ?').run(emp.id);
      }
    }

    // Handle room entry/exit
    if (isRoomReader && targetRoom) {
      if (eventType === 'ENTRY') {
        recordRoomEntry(emp.id, targetRoom.id, logId);
      } else if (eventType === 'EXIT') {
        recordRoomExit(emp.id, targetRoom.id);
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  // 7. Build response with room capacity info
  const response = {
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
      companyId: companyId,
      roomId: targetRoom ? targetRoom.id : null,
      readerId: reader ? reader.id : null,
      locationType: locationType
    },
    employee: getEmployeeById(emp.id),
    facilityStatus: newStatus
  };

  // Add room capacity info if this was a room scan
  if (targetRoom) {
    const capacityInfo = evaluateRoomCapacity(targetRoom.id);
    response.room = {
      id: targetRoom.id,
      name: targetRoom.name,
      currentOccupancy: capacityInfo.count,
      capacity: capacityInfo.capacity,
      capacityPercent: capacityInfo.percent,
      alertLevel: capacityInfo.alertLevel
    };
  }

  return response;
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

    // Seed baseline access roles & granular permissions for the new company
    seedCompanyDefaultRoles(companyId, now);

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

function resetEmployeeTemporaryPassword({ employeeId, companyId, passwordHash, passwordSalt }) {
  const now = new Date().toISOString();
  const existingAcc = getEmployeeAccountByEmpId(employeeId);
  if (existingAcc) {
    const stmt = db.prepare(`
      UPDATE employee_accounts
      SET password_hash = ?, password_salt = ?, must_change_password = 1, updated_at = ?
      WHERE employee_id = ? AND company_id = ?
    `);
    stmt.run(passwordHash, passwordSalt, now, employeeId, companyId);
  } else {
    // Safely provision account for legacy employee if not already present
    const accId = auth.generateId('ACC');
    const stmt = db.prepare(`
      INSERT INTO employee_accounts (id, employee_id, company_id, password_hash, password_salt, must_change_password, account_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?)
    `);
    stmt.run(accId, employeeId, companyId, passwordHash, passwordSalt, now, now);
  }
  // Invalidate any active sessions so old credentials cannot continue to be used
  deleteSessionsByAccount(employeeId);
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

// -------------------------------------------------------------
// Database Query Methods - Custom Organizational Tree & Roles
// -------------------------------------------------------------

// ==========================================
// A. Organizational Levels
// ==========================================

function createOrgLevel({ id, companyId, name, rank }) {
  if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
    const err = new Error('Company ID is required to create an organizational level.');
    err.code = 'INVALID_COMPANY_ID';
    err.statusCode = 400;
    throw err;
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Level name must be at least 2 characters long.');
    err.code = 'INVALID_LEVEL_NAME';
    err.statusCode = 400;
    throw err;
  }
  const numRank = parseInt(rank, 10);
  if (isNaN(numRank) || numRank < 1) {
    const err = new Error('Level rank must be a positive integer (e.g., 1 for Executive, 2 for Dept Head).');
    err.code = 'INVALID_LEVEL_RANK';
    err.statusCode = 400;
    throw err;
  }

  const cId = companyId.trim();
  const levelName = name.trim();

  // Check uniqueness of rank and name within company
  const dupRank = db.prepare('SELECT id FROM org_levels WHERE company_id = ? AND rank = ?').get(cId, numRank);
  if (dupRank) {
    const err = new Error(`An organizational level with rank ${numRank} already exists in this organization.`);
    err.code = 'DUPLICATE_ORG_LEVEL_RANK';
    err.statusCode = 409;
    throw err;
  }

  const dupName = db.prepare('SELECT id FROM org_levels WHERE company_id = ? AND LOWER(name) = ?').get(cId, levelName.toLowerCase());
  if (dupName) {
    const err = new Error(`An organizational level named '${levelName}' already exists in this organization.`);
    err.code = 'DUPLICATE_ORG_LEVEL_NAME';
    err.statusCode = 409;
    throw err;
  }

  const levelId = (id && typeof id === 'string' && id.trim()) ? id.trim() : auth.generateId('LVL');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO org_levels (id, company_id, name, rank, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(levelId, cId, levelName, numRank, now, now);

  return getOrgLevelById(levelId, cId);
}

function getOrgLevels(companyId) {
  if (!companyId || typeof companyId !== 'string') return [];
  const stmt = db.prepare('SELECT * FROM org_levels WHERE company_id = ? ORDER BY rank ASC, name ASC');
  return stmt.all(companyId.trim());
}

function getOrgLevelById(id, companyId = null) {
  if (!id) return null;
  if (companyId) {
    const stmt = db.prepare('SELECT * FROM org_levels WHERE id = ? AND company_id = ?');
    return stmt.get(id, companyId);
  }
  const stmt = db.prepare('SELECT * FROM org_levels WHERE id = ?');
  return stmt.get(id);
}

function updateOrgLevel({ id, companyId, name, rank }) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Organizational Level ID is required.');
    err.code = 'INVALID_LEVEL_ID';
    err.statusCode = 400;
    throw err;
  }
  const existing = getOrgLevelById(id, companyId);
  if (!existing) {
    const err = new Error(`Organizational level '${id}' not found in your organization.`);
    err.code = 'ORG_LEVEL_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const cId = existing.company_id;
  const newName = (name !== undefined && name !== null) ? name.trim() : existing.name;
  const newRank = (rank !== undefined && rank !== null) ? parseInt(rank, 10) : existing.rank;

  if (newName.length < 2) {
    const err = new Error('Level name must be at least 2 characters long.');
    err.code = 'INVALID_LEVEL_NAME';
    err.statusCode = 400;
    throw err;
  }
  if (isNaN(newRank) || newRank < 1) {
    const err = new Error('Level rank must be a positive integer.');
    err.code = 'INVALID_LEVEL_RANK';
    err.statusCode = 400;
    throw err;
  }

  if (newName.toLowerCase() !== existing.name.toLowerCase()) {
    const dupName = db.prepare('SELECT id FROM org_levels WHERE company_id = ? AND LOWER(name) = ? AND id != ?').get(cId, newName.toLowerCase(), id);
    if (dupName) {
      const err = new Error(`An organizational level named '${newName}' already exists in this organization.`);
      err.code = 'DUPLICATE_ORG_LEVEL_NAME';
      err.statusCode = 409;
      throw err;
    }
  }

  if (newRank !== existing.rank) {
    const dupRank = db.prepare('SELECT id FROM org_levels WHERE company_id = ? AND rank = ? AND id != ?').get(cId, newRank, id);
    if (dupRank) {
      const err = new Error(`An organizational level with rank ${newRank} already exists in this organization.`);
      err.code = 'DUPLICATE_ORG_LEVEL_RANK';
      err.statusCode = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE org_levels
    SET name = ?, rank = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `);
  stmt.run(newName, newRank, now, id, cId);

  return getOrgLevelById(id, cId);
}

function deleteOrgLevel(id, companyId) {
  const existing = getOrgLevelById(id, companyId);
  if (!existing) {
    const err = new Error(`Organizational level '${id}' not found in your organization.`);
    err.code = 'ORG_LEVEL_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // Nullify references in org_units
    db.prepare('UPDATE org_units SET level_id = NULL WHERE level_id = ? AND company_id = ?').run(id, existing.company_id);
    db.prepare('DELETE FROM org_levels WHERE id = ? AND company_id = ?').run(id, existing.company_id);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, message: `Organizational level '${existing.name}' deleted successfully.` };
}

// ==========================================
// B. Organizational Units
// ==========================================

function validateOrgUnitBelongsToCompany(unitId, companyId) {
  if (!unitId) return null;
  const stmt = db.prepare('SELECT id, company_id, name FROM org_units WHERE id = ?');
  const row = stmt.get(unitId);
  if (!row) {
    const err = new Error(`Organizational unit '${unitId}' not found.`);
    err.code = 'ORG_UNIT_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  if (companyId && row.company_id !== companyId) {
    const err = new Error(`Organizational unit '${unitId}' belongs to a different organization.`);
    err.code = 'CROSS_COMPANY_REFERENCE';
    err.statusCode = 400;
    throw err;
  }
  return row;
}

function detectCircularOrgUnits(unitId, newParentId, companyId) {
  if (!newParentId) return false;
  if (unitId === newParentId) return true;

  let currentId = newParentId;
  const visited = new Set([unitId]);

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);

    const row = db.prepare('SELECT parent_unit_id, company_id FROM org_units WHERE id = ?').get(currentId);
    if (!row) break;
    if (companyId && row.company_id !== companyId) {
      const err = new Error(`Parent unit '${currentId}' belongs to a different organization.`);
      err.code = 'CROSS_COMPANY_REFERENCE';
      err.statusCode = 400;
      throw err;
    }
    currentId = row.parent_unit_id;
  }

  return false;
}

function createOrgUnit({ id, companyId, name, unitType = 'DEPARTMENT', parentUnitId = null, levelId = null, managerId = null }) {
  if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
    const err = new Error('Company ID is required to create an organizational unit.');
    err.code = 'INVALID_COMPANY_ID';
    err.statusCode = 400;
    throw err;
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Unit name must be at least 2 characters long.');
    err.code = 'INVALID_UNIT_NAME';
    err.statusCode = 400;
    throw err;
  }

  const cId = companyId.trim();
  const unitName = name.trim();
  const cleanType = (unitType && typeof unitType === 'string' && unitType.trim()) ? unitType.trim().toUpperCase() : 'DEPARTMENT';

  let cleanParentId = null;
  if (parentUnitId && typeof parentUnitId === 'string' && parentUnitId.trim()) {
    cleanParentId = parentUnitId.trim();
    validateOrgUnitBelongsToCompany(cleanParentId, cId);
  }

  let cleanLevelId = null;
  if (levelId && typeof levelId === 'string' && levelId.trim()) {
    cleanLevelId = levelId.trim();
    const lvl = getOrgLevelById(cleanLevelId, cId);
    if (!lvl) {
      const err = new Error(`Organizational level '${cleanLevelId}' not found in your organization.`);
      err.code = 'ORG_LEVEL_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
  }

  let cleanManagerId = null;
  if (managerId && typeof managerId === 'string' && managerId.trim()) {
    cleanManagerId = managerId.trim();
    const mgr = getEmployeeById(cleanManagerId);
    if (!mgr || mgr.companyId !== cId) {
      const err = new Error(`Assigned manager '${cleanManagerId}' not found in your organization.`);
      err.code = 'MANAGER_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    if (mgr.isArchived) {
      const err = new Error(`Cannot assign archived employee '${mgr.name}' as unit manager.`);
      err.code = 'MANAGER_ARCHIVED';
      err.statusCode = 400;
      throw err;
    }
  }

  // Duplicate name check under same parent
  if (cleanParentId) {
    const dup = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND parent_unit_id = ? AND LOWER(name) = ?').get(cId, cleanParentId, unitName.toLowerCase());
    if (dup) {
      const err = new Error(`An organizational unit named '${unitName}' already exists under the selected parent unit.`);
      err.code = 'DUPLICATE_ORG_UNIT_NAME';
      err.statusCode = 409;
      throw err;
    }
  } else {
    const dup = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND parent_unit_id IS NULL AND LOWER(name) = ?').get(cId, unitName.toLowerCase());
    if (dup) {
      const err = new Error(`A top-level organizational unit named '${unitName}' already exists.`);
      err.code = 'DUPLICATE_ORG_UNIT_NAME';
      err.statusCode = 409;
      throw err;
    }
  }

  const unitId = (id && typeof id === 'string' && id.trim()) ? id.trim() : auth.generateId('UNIT');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO org_units (id, company_id, name, unit_type, parent_unit_id, level_id, manager_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(unitId, cId, unitName, cleanType, cleanParentId, cleanLevelId, cleanManagerId, now, now);

  return getOrgUnitById(unitId, cId);
}

function getOrgUnits(companyId) {
  if (!companyId || typeof companyId !== 'string') return [];
  const stmt = db.prepare(`
    SELECT u.*,
           p.name AS parent_unit_name,
           l.name AS level_name,
           l.rank AS level_rank,
           m.name AS manager_name,
           (SELECT COUNT(*) FROM employees e WHERE e.org_unit_id = u.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count,
           (SELECT COUNT(DISTINCT e.job_title_id) FROM employees e WHERE e.org_unit_id = u.id AND e.job_title_id IS NOT NULL AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS job_title_count
    FROM org_units u
    LEFT JOIN org_units p ON u.parent_unit_id = p.id
    LEFT JOIN org_levels l ON u.level_id = l.id
    LEFT JOIN employees m ON u.manager_id = m.id
    WHERE u.company_id = ?
    ORDER BY COALESCE(l.rank, 999) ASC, u.name ASC
  `);
  return stmt.all(companyId.trim());
}

function getOrgUnitById(id, companyId = null) {
  if (!id) return null;
  let sql = `
    SELECT u.*,
           p.name AS parent_unit_name,
           l.name AS level_name,
           l.rank AS level_rank,
           m.name AS manager_name,
           (SELECT COUNT(*) FROM employees e WHERE e.org_unit_id = u.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count,
           (SELECT COUNT(DISTINCT e.job_title_id) FROM employees e WHERE e.org_unit_id = u.id AND e.job_title_id IS NOT NULL AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS job_title_count
    FROM org_units u
    LEFT JOIN org_units p ON u.parent_unit_id = p.id
    LEFT JOIN org_levels l ON u.level_id = l.id
    LEFT JOIN employees m ON u.manager_id = m.id
    WHERE u.id = ?
  `;
  if (companyId) {
    sql += ' AND u.company_id = ?';
    return db.prepare(sql).get(id, companyId);
  }
  return db.prepare(sql).get(id);
}

function updateOrgUnit({ id, companyId, name, unitType, parentUnitId, levelId, managerId }) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Organizational Unit ID is required.');
    err.code = 'INVALID_UNIT_ID';
    err.statusCode = 400;
    throw err;
  }
  const existing = getOrgUnitById(id, companyId);
  if (!existing) {
    const err = new Error(`Organizational unit '${id}' not found in your organization.`);
    err.code = 'ORG_UNIT_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const cId = existing.company_id;
  const newName = (name !== undefined && name !== null) ? name.trim() : existing.name;
  const newType = (unitType !== undefined && unitType !== null) ? unitType.trim().toUpperCase() : existing.unit_type;

  if (newName.length < 2) {
    const err = new Error('Unit name must be at least 2 characters long.');
    err.code = 'INVALID_UNIT_NAME';
    err.statusCode = 400;
    throw err;
  }

  let newParentId = existing.parent_unit_id;
  if (parentUnitId !== undefined) {
    if (parentUnitId !== null && typeof parentUnitId === 'string' && parentUnitId.trim()) {
      newParentId = parentUnitId.trim();
      if (newParentId === id) {
        const err = new Error('An organizational unit cannot be its own parent.');
        err.code = 'SELF_PARENTING_UNIT';
        err.statusCode = 400;
        throw err;
      }
      validateOrgUnitBelongsToCompany(newParentId, cId);
      if (detectCircularOrgUnits(id, newParentId, cId)) {
        const err = new Error(`Circular unit hierarchy detected: assigning unit '${newParentId}' as parent of '${id}' creates a loop.`);
        err.code = 'CIRCULAR_ORG_UNIT';
        err.statusCode = 400;
        throw err;
      }
    } else {
      newParentId = null;
    }
  }

  let newLevelId = existing.level_id;
  if (levelId !== undefined) {
    if (levelId !== null && typeof levelId === 'string' && levelId.trim()) {
      newLevelId = levelId.trim();
      const lvl = getOrgLevelById(newLevelId, cId);
      if (!lvl) {
        const err = new Error(`Organizational level '${newLevelId}' not found in your organization.`);
        err.code = 'ORG_LEVEL_NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }
    } else {
      newLevelId = null;
    }
  }

  let newManagerId = existing.manager_id;
  if (managerId !== undefined) {
    if (managerId !== null && typeof managerId === 'string' && managerId.trim()) {
      newManagerId = managerId.trim();
      const mgr = getEmployeeById(newManagerId);
      if (!mgr || mgr.companyId !== cId) {
        const err = new Error(`Assigned manager '${newManagerId}' not found in your organization.`);
        err.code = 'MANAGER_NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }
      if (mgr.isArchived) {
        const err = new Error(`Cannot assign archived employee '${mgr.name}' as unit manager.`);
        err.code = 'MANAGER_ARCHIVED';
        err.statusCode = 400;
        throw err;
      }
    } else {
      newManagerId = null;
    }
  }

  // Duplicate name check under parent (excluding self)
  if (newParentId) {
    const dup = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND parent_unit_id = ? AND LOWER(name) = ? AND id != ?').get(cId, newParentId, newName.toLowerCase(), id);
    if (dup) {
      const err = new Error(`An organizational unit named '${newName}' already exists under the selected parent unit.`);
      err.code = 'DUPLICATE_ORG_UNIT_NAME';
      err.statusCode = 409;
      throw err;
    }
  } else {
    const dup = db.prepare('SELECT id FROM org_units WHERE company_id = ? AND parent_unit_id IS NULL AND LOWER(name) = ? AND id != ?').get(cId, newName.toLowerCase(), id);
    if (dup) {
      const err = new Error(`A top-level organizational unit named '${newName}' already exists.`);
      err.code = 'DUPLICATE_ORG_UNIT_NAME';
      err.statusCode = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE org_units
    SET name = ?, unit_type = ?, parent_unit_id = ?, level_id = ?, manager_id = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `);
  stmt.run(newName, newType, newParentId, newLevelId, newManagerId, now, id, cId);

  return getOrgUnitById(id, cId);
}

function deleteOrgUnit(id, companyId) {
  const existing = getOrgUnitById(id, companyId);
  if (!existing) {
    const err = new Error(`Organizational unit '${id}' not found in your organization.`);
    err.code = 'ORG_UNIT_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    // Re-parent any child units to this unit's parent
    db.prepare('UPDATE org_units SET parent_unit_id = ? WHERE parent_unit_id = ? AND company_id = ?')
      .run(existing.parent_unit_id || null, id, existing.company_id);
    
    // Nullify references in employees
    db.prepare('UPDATE employees SET org_unit_id = NULL WHERE org_unit_id = ? AND company_id = ?')
      .run(id, existing.company_id);

    db.prepare('DELETE FROM org_units WHERE id = ? AND company_id = ?')
      .run(id, existing.company_id);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, message: `Organizational unit '${existing.name}' deleted successfully.` };
}

function getOrgUnitHierarchy(companyId) {
  const allUnits = getOrgUnits(companyId);
  const unitMap = new Map();
  allUnits.forEach(u => unitMap.set(u.id, { ...u, children: [] }));

  const rootUnits = [];
  allUnits.forEach(u => {
    const node = unitMap.get(u.id);
    if (u.parent_unit_id && unitMap.has(u.parent_unit_id)) {
      unitMap.get(u.parent_unit_id).children.push(node);
    } else {
      rootUnits.push(node);
    }
  });

  return rootUnits;
}

// ==========================================
// C. Dynamic Job Titles (HR Designations)
// ==========================================

function validateJobTitleBelongsToCompany(jobTitleId, companyId) {
  if (!jobTitleId) return null;
  const stmt = db.prepare('SELECT id, company_id, title, is_active FROM company_job_titles WHERE id = ?');
  const row = stmt.get(jobTitleId);
  if (!row) {
    const err = new Error(`Job title '${jobTitleId}' not found.`);
    err.code = 'JOB_TITLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  if (companyId && row.company_id !== companyId) {
    const err = new Error(`Job title '${jobTitleId}' belongs to a different organization.`);
    err.code = 'CROSS_COMPANY_REFERENCE';
    err.statusCode = 400;
    throw err;
  }
  return row;
}

function createJobTitle({ id, companyId, title, description = '', isActive = 1 }) {
  if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
    const err = new Error('Company ID is required to create a job title.');
    err.code = 'INVALID_COMPANY_ID';
    err.statusCode = 400;
    throw err;
  }
  if (!title || typeof title !== 'string' || title.trim().length < 2) {
    const err = new Error('Job title must be at least 2 characters long.');
    err.code = 'INVALID_JOB_TITLE';
    err.statusCode = 400;
    throw err;
  }

  const cId = companyId.trim();
  const cleanTitle = title.trim();

  const dup = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND LOWER(title) = ?').get(cId, cleanTitle.toLowerCase());
  if (dup) {
    const err = new Error(`A job title '${cleanTitle}' already exists in this organization.`);
    err.code = 'DUPLICATE_JOB_TITLE';
    err.statusCode = 409;
    throw err;
  }

  const jobId = (id && typeof id === 'string' && id.trim()) ? id.trim() : auth.generateId('JOB');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO company_job_titles (id, company_id, title, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(jobId, cId, cleanTitle, description || '', isActive ? 1 : 0, now, now);

  return getJobTitleById(jobId, cId);
}

function getJobTitles(companyId, includeInactive = false) {
  if (!companyId || typeof companyId !== 'string') return [];
  let sql = `
    SELECT j.*,
           (SELECT COUNT(*) FROM employees e WHERE e.job_title_id = j.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count
    FROM company_job_titles j
    WHERE j.company_id = ?
  `;
  if (!includeInactive) {
    sql += ' AND j.is_active = 1';
  }
  sql += ' ORDER BY j.title ASC';
  return db.prepare(sql).all(companyId.trim());
}

function getJobTitlesByUnit(unitId, companyId, includeInactive = false) {
  if (!unitId || !companyId || typeof companyId !== 'string') return [];
  const cleanUnitId = String(unitId).trim();
  const cleanCompanyId = String(companyId).trim();

  let sql = `
    SELECT j.*,
           (SELECT COUNT(*) FROM employees e WHERE e.job_title_id = j.id AND e.org_unit_id = ? AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count,
           (SELECT COUNT(*) FROM employees e WHERE e.job_title_id = j.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS total_company_employee_count
    FROM company_job_titles j
    WHERE j.company_id = ?
      AND j.id IN (
        SELECT DISTINCT e.job_title_id
        FROM employees e
        WHERE e.org_unit_id = ?
          AND e.job_title_id IS NOT NULL
          AND (e.is_archived = 0 OR e.is_archived IS NULL)
      )
  `;
  if (!includeInactive) {
    sql += ' AND j.is_active = 1';
  }
  sql += ' ORDER BY j.title ASC';
  return db.prepare(sql).all(cleanUnitId, cleanCompanyId, cleanUnitId);
}

function getJobTitleById(id, companyId = null) {
  if (!id) return null;
  let sql = `
    SELECT j.*,
           (SELECT COUNT(*) FROM employees e WHERE e.job_title_id = j.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count
    FROM company_job_titles j
    WHERE j.id = ?
  `;
  if (companyId) {
    sql += ' AND j.company_id = ?';
    return db.prepare(sql).get(id, companyId);
  }
  return db.prepare(sql).get(id);
}

function updateJobTitle({ id, companyId, title, description, isActive }) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Job Title ID is required.');
    err.code = 'INVALID_JOB_ID';
    err.statusCode = 400;
    throw err;
  }
  const existing = getJobTitleById(id, companyId);
  if (!existing) {
    const err = new Error(`Job title '${id}' not found in your organization.`);
    err.code = 'JOB_TITLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const cId = existing.company_id;
  const newTitle = (title !== undefined && title !== null) ? title.trim() : existing.title;
  const newDesc = (description !== undefined && description !== null) ? description : existing.description;
  const newActive = (isActive !== undefined && isActive !== null) ? (isActive ? 1 : 0) : existing.is_active;

  if (newTitle.length < 2) {
    const err = new Error('Job title must be at least 2 characters long.');
    err.code = 'INVALID_JOB_TITLE';
    err.statusCode = 400;
    throw err;
  }

  if (newTitle.toLowerCase() !== existing.title.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM company_job_titles WHERE company_id = ? AND LOWER(title) = ? AND id != ?').get(cId, newTitle.toLowerCase(), id);
    if (dup) {
      const err = new Error(`A job title '${newTitle}' already exists in this organization.`);
      err.code = 'DUPLICATE_JOB_TITLE';
      err.statusCode = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE company_job_titles
    SET title = ?, description = ?, is_active = ?, updated_at = ?
    WHERE id = ? AND company_id = ?
  `);
  stmt.run(newTitle, newDesc, newActive, now, id, cId);

  return getJobTitleById(id, cId);
}

function deleteJobTitle(id, companyId) {
  const existing = getJobTitleById(id, companyId);
  if (!existing) {
    const err = new Error(`Job title '${id}' not found in your organization.`);
    err.code = 'JOB_TITLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE employees SET job_title_id = NULL WHERE job_title_id = ? AND company_id = ?')
      .run(id, existing.company_id);
    db.prepare('DELETE FROM company_job_titles WHERE id = ? AND company_id = ?')
      .run(id, existing.company_id);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, message: `Job title '${existing.title}' deleted successfully.` };
}

// ==========================================
// D. Company Access Roles & Granular Permissions
// ==========================================

const VALID_PERMISSION_KEYS = [
  'employees:view',
  'employees:manage',
  'attendance:view',
  'attendance:manage',
  'analytics:view',
  'org:view',
  'org:manage',
  'roles:manage'
];

const VALID_PERMISSION_SCOPES = [
  'SELF',
  'DIRECT_REPORTS',
  'DESCENDANTS',
  'DEPARTMENT',
  'COMPANY'
];

function seedCompanyDefaultRoles(companyId, now = new Date().toISOString()) {
  const roleCount = db.prepare('SELECT COUNT(*) AS c FROM company_access_roles WHERE company_id = ?').get(companyId).c;
  if (roleCount > 0) return;

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
  insertRole.run(adminRoleId, companyId, 'Administrator', 'Full administrative authority across the entire organization.', 1, now, now);
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
    insertPerm.run(auth.generateId('PERM'), adminRoleId, companyId, p.key, p.scope, now);
  }

  // 2. Department Head
  const deptHeadRoleId = auth.generateId('ROLE');
  insertRole.run(deptHeadRoleId, companyId, 'Department Head', 'Oversight and reporting for department and permitted descendants.', 1, now, now);
  const deptPerms = [
    { key: 'employees:view', scope: 'DESCENDANTS' },
    { key: 'employees:manage', scope: 'DESCENDANTS' },
    { key: 'attendance:view', scope: 'DESCENDANTS' },
    { key: 'attendance:manage', scope: 'DEPARTMENT' },
    { key: 'analytics:view', scope: 'DEPARTMENT' },
    { key: 'org:view', scope: 'COMPANY' }
  ];
  for (const p of deptPerms) {
    insertPerm.run(auth.generateId('PERM'), deptHeadRoleId, companyId, p.key, p.scope, now);
  }

  // 3. Team Lead
  const leadRoleId = auth.generateId('ROLE');
  insertRole.run(leadRoleId, companyId, 'Team Lead', 'Direct supervisor oversight for assigned team members.', 1, now, now);
  const leadPerms = [
    { key: 'employees:view', scope: 'DIRECT_REPORTS' },
    { key: 'employees:manage', scope: 'DIRECT_REPORTS' },
    { key: 'attendance:view', scope: 'DIRECT_REPORTS' },
    { key: 'org:view', scope: 'COMPANY' }
  ];
  for (const p of leadPerms) {
    insertPerm.run(auth.generateId('PERM'), leadRoleId, companyId, p.key, p.scope, now);
  }

  // 4. Employee (Standard)
  const staffRoleId = auth.generateId('ROLE');
  insertRole.run(staffRoleId, companyId, 'Employee', 'Standard workforce access for personal attendance and profile.', 1, now, now);
  const staffPerms = [
    { key: 'employees:view', scope: 'SELF' },
    { key: 'attendance:view', scope: 'SELF' }
  ];
  for (const p of staffPerms) {
    insertPerm.run(auth.generateId('PERM'), staffRoleId, companyId, p.key, p.scope, now);
  }
}

function validateAccessRoleBelongsToCompany(roleId, companyId) {
  if (!roleId) return null;
  const stmt = db.prepare('SELECT id, company_id, name, is_system_role FROM company_access_roles WHERE id = ?');
  const row = stmt.get(roleId);
  if (!row) {
    const err = new Error(`Access role '${roleId}' not found.`);
    err.code = 'ACCESS_ROLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  if (companyId && row.company_id !== companyId) {
    const err = new Error(`Access role '${roleId}' belongs to a different organization.`);
    err.code = 'CROSS_COMPANY_REFERENCE';
    err.statusCode = 400;
    throw err;
  }
  return row;
}

function createAccessRole({ id, companyId, name, description = '', isSystemRole = 0, permissions = [] }) {
  if (!companyId || typeof companyId !== 'string' || !companyId.trim()) {
    const err = new Error('Company ID is required to create an access role.');
    err.code = 'INVALID_COMPANY_ID';
    err.statusCode = 400;
    throw err;
  }
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    const err = new Error('Access role name must be at least 2 characters long.');
    err.code = 'INVALID_ROLE_NAME';
    err.statusCode = 400;
    throw err;
  }

  const cId = companyId.trim();
  const roleName = name.trim();

  const dup = db.prepare('SELECT id FROM company_access_roles WHERE company_id = ? AND LOWER(name) = ?').get(cId, roleName.toLowerCase());
  if (dup) {
    const err = new Error(`An access role named '${roleName}' already exists in this organization.`);
    err.code = 'DUPLICATE_ACCESS_ROLE';
    err.statusCode = 409;
    throw err;
  }

  const roleId = (id && typeof id === 'string' && id.trim()) ? id.trim() : auth.generateId('ROLE');
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    const insertRole = db.prepare(`
      INSERT INTO company_access_roles (id, company_id, name, description, is_system_role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertRole.run(roleId, cId, roleName, description || '', isSystemRole ? 1 : 0, now, now);

    if (Array.isArray(permissions) && permissions.length > 0) {
      const insertPerm = db.prepare(`
        INSERT INTO company_role_permissions (id, role_id, company_id, permission_key, scope, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const p of permissions) {
        const key = typeof p === 'string' ? p : p.key || p.permissionKey || p.permission_key;
        const scope = (typeof p === 'object' && (p.scope)) ? p.scope.toUpperCase() : 'COMPANY';
        if (!VALID_PERMISSION_KEYS.includes(key)) {
          const err = new Error(`Invalid permission key '${key}'. Supported permissions: ${VALID_PERMISSION_KEYS.join(', ')}`);
          err.code = 'INVALID_PERMISSION_KEY';
          err.statusCode = 400;
          throw err;
        }
        if (!VALID_PERMISSION_SCOPES.includes(scope)) {
          const err = new Error(`Invalid permission scope '${scope}'. Supported scopes: ${VALID_PERMISSION_SCOPES.join(', ')}`);
          err.code = 'INVALID_PERMISSION_SCOPE';
          err.statusCode = 400;
          throw err;
        }
        insertPerm.run(auth.generateId('PERM'), roleId, cId, key, scope, now);
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getAccessRoleById(roleId, cId);
}

function getAccessRoles(companyId) {
  if (!companyId || typeof companyId !== 'string') return [];
  const cId = companyId.trim();
  const roles = db.prepare(`
    SELECT r.*,
           (SELECT COUNT(*) FROM employees e WHERE e.access_role_id = r.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count
    FROM company_access_roles r
    WHERE r.company_id = ?
    ORDER BY r.is_system_role DESC, r.name ASC
  `).all(cId);

  const permStmt = db.prepare('SELECT id, permission_key, scope FROM company_role_permissions WHERE role_id = ?');
  return roles.map(r => ({
    ...r,
    is_system_role: Boolean(r.is_system_role),
    permissions: permStmt.all(r.id).map(p => ({
      id: p.id,
      key: p.permission_key,
      scope: p.scope
    }))
  }));
}

function getAccessRoleById(id, companyId = null) {
  if (!id) return null;
  let sql = `
    SELECT r.*,
           (SELECT COUNT(*) FROM employees e WHERE e.access_role_id = r.id AND (e.is_archived = 0 OR e.is_archived IS NULL)) AS employee_count
    FROM company_access_roles r
    WHERE r.id = ?
  `;
  const role = companyId ? db.prepare(sql + ' AND r.company_id = ?').get(id, companyId) : db.prepare(sql).get(id);
  if (!role) return null;

  const perms = db.prepare('SELECT id, permission_key, scope FROM company_role_permissions WHERE role_id = ?').all(id);
  return {
    ...role,
    is_system_role: Boolean(role.is_system_role),
    permissions: perms.map(p => ({
      id: p.id,
      key: p.permission_key,
      scope: p.scope
    }))
  };
}

function updateAccessRole({ id, companyId, name, description, permissions }) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Access Role ID is required.');
    err.code = 'INVALID_ROLE_ID';
    err.statusCode = 400;
    throw err;
  }
  const existing = getAccessRoleById(id, companyId);
  if (!existing) {
    const err = new Error(`Access role '${id}' not found in your organization.`);
    err.code = 'ACCESS_ROLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const cId = existing.company_id;
  let newName = existing.name;
  if (name !== undefined && name !== null) {
    if (existing.is_system_role && name.trim() !== existing.name) {
      const err = new Error('System role names cannot be renamed.');
      err.code = 'CANNOT_RENAME_SYSTEM_ROLE';
      err.statusCode = 400;
      throw err;
    }
    newName = name.trim();
  }

  if (newName.length < 2) {
    const err = new Error('Access role name must be at least 2 characters long.');
    err.code = 'INVALID_ROLE_NAME';
    err.statusCode = 400;
    throw err;
  }

  if (newName.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = db.prepare('SELECT id FROM company_access_roles WHERE company_id = ? AND LOWER(name) = ? AND id != ?').get(cId, newName.toLowerCase(), id);
    if (dup) {
      const err = new Error(`An access role named '${newName}' already exists in this organization.`);
      err.code = 'DUPLICATE_ACCESS_ROLE';
      err.statusCode = 409;
      throw err;
    }
  }

  const newDesc = (description !== undefined && description !== null) ? description : existing.description;
  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE company_access_roles
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ? AND company_id = ?
    `).run(newName, newDesc, now, id, cId);

    if (Array.isArray(permissions)) {
      db.prepare('DELETE FROM company_role_permissions WHERE role_id = ? AND company_id = ?').run(id, cId);
      const insertPerm = db.prepare(`
        INSERT INTO company_role_permissions (id, role_id, company_id, permission_key, scope, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const p of permissions) {
        const key = typeof p === 'string' ? p : p.key || p.permissionKey || p.permission_key;
        const scope = (typeof p === 'object' && (p.scope)) ? p.scope.toUpperCase() : 'COMPANY';
        if (!VALID_PERMISSION_KEYS.includes(key)) {
          const err = new Error(`Invalid permission key '${key}'. Supported permissions: ${VALID_PERMISSION_KEYS.join(', ')}`);
          err.code = 'INVALID_PERMISSION_KEY';
          err.statusCode = 400;
          throw err;
        }
        if (!VALID_PERMISSION_SCOPES.includes(scope)) {
          const err = new Error(`Invalid permission scope '${scope}'. Supported scopes: ${VALID_PERMISSION_SCOPES.join(', ')}`);
          err.code = 'INVALID_PERMISSION_SCOPE';
          err.statusCode = 400;
          throw err;
        }
        insertPerm.run(auth.generateId('PERM'), id, cId, key, scope, now);
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getAccessRoleById(id, cId);
}

function deleteAccessRole(id, companyId) {
  const existing = getAccessRoleById(id, companyId);
  if (!existing) {
    const err = new Error(`Access role '${id}' not found in your organization.`);
    err.code = 'ACCESS_ROLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }
  if (existing.is_system_role) {
    const err = new Error('System roles are protected and cannot be deleted.');
    err.code = 'CANNOT_DELETE_SYSTEM_ROLE';
    err.statusCode = 400;
    throw err;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE employees SET access_role_id = NULL WHERE access_role_id = ? AND company_id = ?')
      .run(id, existing.company_id);
    db.prepare('DELETE FROM company_role_permissions WHERE role_id = ? AND company_id = ?')
      .run(id, existing.company_id);
    db.prepare('DELETE FROM company_access_roles WHERE id = ? AND company_id = ?')
      .run(id, existing.company_id);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return { success: true, message: `Access role '${existing.name}' deleted successfully.` };
}

function getRolePermissions(roleId, companyId = null) {
  if (companyId) {
    return db.prepare('SELECT id, permission_key AS key, scope FROM company_role_permissions WHERE role_id = ? AND company_id = ?').all(roleId, companyId);
  }
  return db.prepare('SELECT id, permission_key AS key, scope FROM company_role_permissions WHERE role_id = ?').all(roleId);
}

function setRolePermissions(roleId, companyId, permissions) {
  const existing = getAccessRoleById(roleId, companyId);
  if (!existing) {
    const err = new Error(`Access role '${roleId}' not found.`);
    err.code = 'ACCESS_ROLE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('DELETE FROM company_role_permissions WHERE role_id = ? AND company_id = ?').run(roleId, existing.company_id);
    const insertPerm = db.prepare(`
      INSERT INTO company_role_permissions (id, role_id, company_id, permission_key, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of permissions) {
      const key = typeof p === 'string' ? p : p.key || p.permissionKey || p.permission_key;
      const scope = (typeof p === 'object' && p.scope) ? p.scope.toUpperCase() : 'COMPANY';
      if (!VALID_PERMISSION_KEYS.includes(key)) {
        const err = new Error(`Invalid permission key '${key}'. Supported: ${VALID_PERMISSION_KEYS.join(', ')}`);
        err.code = 'INVALID_PERMISSION_KEY';
        err.statusCode = 400;
        throw err;
      }
      if (!VALID_PERMISSION_SCOPES.includes(scope)) {
        const err = new Error(`Invalid permission scope '${scope}'. Supported: ${VALID_PERMISSION_SCOPES.join(', ')}`);
        err.code = 'INVALID_PERMISSION_SCOPE';
        err.statusCode = 400;
        throw err;
      }
      insertPerm.run(auth.generateId('PERM'), roleId, existing.company_id, key, scope, now);
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  return getRolePermissions(roleId, existing.company_id);
}

function getEmployeeEffectivePermissions(employeeId, companyId = null) {
  const emp = getEmployeeById(employeeId);
  if (!emp) return {};
  const cId = companyId || emp.companyId;

  let roleId = emp.accessRoleId;
  if (!roleId) {
    const defaultStaff = db.prepare("SELECT id FROM company_access_roles WHERE company_id = ? AND name = 'Employee'").get(cId);
    if (defaultStaff) roleId = defaultStaff.id;
  }

  if (!roleId) return {};

  const perms = db.prepare('SELECT permission_key, scope FROM company_role_permissions WHERE role_id = ?').all(roleId);
  const effective = {};
  for (const p of perms) {
    effective[p.permission_key] = p.scope;
  }
  return effective;
}

// ==========================================
// E. Reporting Hierarchy & Circular Cycle Detection
// ==========================================

function validateReportingAssignment(employeeId, newManagerId, companyId) {
  if (!newManagerId) {
    return { valid: true };
  }

  if (employeeId && employeeId === newManagerId) {
    const err = new Error('An employee cannot report to themselves.');
    err.code = 'SELF_REPORTING';
    err.statusCode = 400;
    throw err;
  }

  const mgr = getEmployeeById(newManagerId);
  if (!mgr) {
    const err = new Error(`Assigned manager with ID '${newManagerId}' not found.`);
    err.code = 'MANAGER_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  if (companyId && mgr.companyId !== companyId) {
    const err = new Error(`Reporting manager '${newManagerId}' belongs to a different organization.`);
    err.code = 'CROSS_COMPANY_REFERENCE';
    err.statusCode = 400;
    throw err;
  }

  if (mgr.isArchived) {
    const err = new Error(`Cannot assign archived employee '${mgr.name}' (${mgr.id}) as reporting manager.`);
    err.code = 'MANAGER_ARCHIVED';
    err.statusCode = 400;
    throw err;
  }

  if (employeeId) {
    // Trace upwards from newManagerId: if we hit employeeId, it's a circular relationship
    let currentId = newManagerId;
    const visited = new Set([employeeId]);
    const chain = [newManagerId];

    while (currentId) {
      const parentRow = db.prepare('SELECT id, name, manager_id, company_id FROM employees WHERE id = ?').get(currentId);
      if (!parentRow) break;
      if (companyId && parentRow.company_id !== companyId) {
        const err = new Error(`Manager '${currentId}' belongs to a different company.`);
        err.code = 'CROSS_COMPANY_REFERENCE';
        err.statusCode = 400;
        throw err;
      }
      if (parentRow.manager_id && visited.has(parentRow.manager_id)) {
        const cycleChain = [...chain, parentRow.manager_id].join(' -> ');
        const err = new Error(`Circular reporting relationship detected: assigning '${newManagerId}' as manager of '${employeeId}' creates a loop (${cycleChain}).`);
        err.code = 'CIRCULAR_REPORTING';
        err.statusCode = 400;
        throw err;
      }
      currentId = parentRow.manager_id;
      if (currentId) {
        visited.add(currentId);
        chain.push(currentId);
      }
    }
  }

  return { valid: true };
}

function detectCircularReporting(employeeId, newManagerId, companyId) {
  try {
    validateReportingAssignment(employeeId, newManagerId, companyId);
    return false;
  } catch (err) {
    if (err.code === 'CIRCULAR_REPORTING' || err.code === 'SELF_REPORTING') {
      return true;
    }
    throw err;
  }
}

function assignEmployeeOrgAndReporting({ employeeId, companyId, managerId, orgUnitId, jobTitleId, accessRoleId }) {
  if (!employeeId || typeof employeeId !== 'string') {
    const err = new Error('Employee ID is required.');
    err.code = 'INVALID_EMPLOYEE_ID';
    err.statusCode = 400;
    throw err;
  }

  const existing = getEmployeeById(employeeId);
  if (!existing) {
    const err = new Error(`Employee with ID '${employeeId}' not found.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  const cId = companyId || existing.companyId;
  if (existing.companyId !== cId) {
    const err = new Error(`Employee with ID '${employeeId}' not found in your organization.`);
    err.code = 'EMPLOYEE_NOT_FOUND';
    err.statusCode = 404;
    throw err;
  }

  let targetManagerId = existing.managerId;
  if (managerId !== undefined) {
    if (managerId !== null && typeof managerId === 'string' && managerId.trim()) {
      const cleanMgrId = managerId.trim();
      validateReportingAssignment(employeeId, cleanMgrId, cId);
      targetManagerId = cleanMgrId;
    } else {
      targetManagerId = null;
    }
  }

  let targetOrgUnitId = existing.orgUnitId;
  let targetDepartment = existing.department;
  if (orgUnitId !== undefined) {
    if (orgUnitId !== null && typeof orgUnitId === 'string' && orgUnitId.trim()) {
      const cleanUnitId = orgUnitId.trim();
      const unit = validateOrgUnitBelongsToCompany(cleanUnitId, cId);
      targetOrgUnitId = cleanUnitId;
      if (unit && unit.name) targetDepartment = unit.name;
    } else {
      targetOrgUnitId = null;
    }
  }

  let targetJobTitleId = existing.jobTitleId;
  let targetRole = existing.role;
  if (jobTitleId !== undefined) {
    if (jobTitleId !== null && typeof jobTitleId === 'string' && jobTitleId.trim()) {
      const cleanJobId = jobTitleId.trim();
      const job = validateJobTitleBelongsToCompany(cleanJobId, cId);
      targetJobTitleId = cleanJobId;
      if (job && job.title) targetRole = job.title;
    } else {
      targetJobTitleId = null;
    }
  }

  let targetAccessRoleId = existing.accessRoleId;
  if (accessRoleId !== undefined) {
    if (accessRoleId !== null && typeof accessRoleId === 'string' && accessRoleId.trim()) {
      const cleanRoleId = accessRoleId.trim();
      validateAccessRoleBelongsToCompany(cleanRoleId, cId);
      targetAccessRoleId = cleanRoleId;
    } else {
      targetAccessRoleId = null;
    }
  }

  const updateStmt = db.prepare(`
    UPDATE employees
    SET manager_id = ?, org_unit_id = ?, job_title_id = ?, access_role_id = ?,
        department = ?, role = ?
    WHERE id = ? AND company_id = ?
  `);
  updateStmt.run(
    targetManagerId, targetOrgUnitId, targetJobTitleId, targetAccessRoleId,
    targetDepartment, targetRole, employeeId, cId
  );

  return getEmployeeById(employeeId);
}

function getDirectReports(managerId, companyId = null) {
  if (!managerId) return [];
  let sql = `
    SELECT e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM employees e
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
    WHERE e.manager_id = ? AND (e.is_archived = 0 OR e.is_archived IS NULL)
  `;
  if (companyId) {
    sql += ' AND e.company_id = ?';
    return db.prepare(sql + ' ORDER BY e.name ASC').all(managerId, companyId).map(formatEmployeeRow);
  }
  return db.prepare(sql + ' ORDER BY e.name ASC').all(managerId).map(formatEmployeeRow);
}

function getRecursiveSubordinates(managerId, companyId) {
  if (!managerId || !companyId) return [];
  const stmt = db.prepare(`
    WITH RECURSIVE subordinates(id, manager_id, depth, path) AS (
      -- Anchor: direct reports
      SELECT id, manager_id, 1 AS depth, id AS path
      FROM employees
      WHERE manager_id = ? AND company_id = ? AND (is_archived = 0 OR is_archived IS NULL)
      
      UNION ALL
      
      -- Recursive: reports of reports
      SELECT e.id, e.manager_id, s.depth + 1, s.path || '/' || e.id
      FROM employees e
      JOIN subordinates s ON e.manager_id = s.id
      WHERE e.company_id = ? AND (e.is_archived = 0 OR e.is_archived IS NULL) AND s.depth < 50
    )
    SELECT s.depth, s.path,
           e.*, 
           a.account_status, 
           a.must_change_password,
           m.name AS manager_name,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM subordinates s
    JOIN employees e ON s.id = e.id
    LEFT JOIN employee_accounts a ON e.id = a.employee_id
    LEFT JOIN employees m ON e.manager_id = m.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
    ORDER BY s.depth ASC, e.name ASC
  `);

  return stmt.all(managerId, companyId, companyId).map(row => ({
    ...formatEmployeeRow(row),
    depth: row.depth,
    path: row.path
  }));
}

function getReportingChain(employeeId, companyId) {
  if (!employeeId || !companyId) return [];
  const stmt = db.prepare(`
    WITH RECURSIVE ancestors(id, manager_id, depth) AS (
      SELECT id, manager_id, 0 AS depth
      FROM employees
      WHERE id = ? AND company_id = ?
      
      UNION ALL
      
      SELECT e.id, e.manager_id, a.depth + 1
      FROM employees e
      JOIN ancestors a ON e.id = a.manager_id
      WHERE a.manager_id IS NOT NULL AND a.depth < 50
    )
    SELECT a.depth,
           e.*, 
           a.manager_id,
           u.name AS org_unit_name,
           j.title AS job_title_name,
           r.name AS access_role_name
    FROM ancestors a
    JOIN employees e ON a.id = e.id
    LEFT JOIN org_units u ON e.org_unit_id = u.id
    LEFT JOIN company_job_titles j ON e.job_title_id = j.id
    LEFT JOIN company_access_roles r ON e.access_role_id = r.id
    ORDER BY a.depth ASC
  `);

  return stmt.all(employeeId, companyId).map(row => ({
    ...formatEmployeeRow(row),
    depth: row.depth
  }));
}

function getOrgHierarchy(companyId) {
  if (!companyId) return null;
  const company = getCompanyById(companyId);
  if (!company) return null;

  const levels = getOrgLevels(companyId);
  const units = getOrgUnitHierarchy(companyId);
  const roles = getAccessRoles(companyId);
  const jobTitles = getJobTitles(companyId, true);
  const employees = getAllEmployees(companyId, false);

  return {
    company,
    levels,
    units,
    roles,
    jobTitles,
    totalEmployees: employees.length
  };
}

// =====================================================================
// Room Occupancy Tracking & Zone Monitoring Functions
// =====================================================================

// ------------ Room Management ------------

function getAllRooms(companyId = null) {
  let sql = 'SELECT * FROM rooms';
  const params = [];
  if (companyId) {
    sql += ' WHERE company_id = ?';
    params.push(companyId);
  }
  sql += ' ORDER BY name ASC';
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function getRoomById(roomId) {
  const stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
  return stmt.get(roomId);
}

function createRoom(roomData) {
  const now = new Date().toISOString();
  const roomId = auth.generateId('ROOM');

  const stmt = db.prepare(`
    INSERT INTO rooms
    (id, company_id, name, room_type, floor_number, building, capacity_normal, capacity_warning, capacity_critical, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    roomId,
    roomData.companyId,
    roomData.name,
    roomData.roomType || 'GENERAL',
    roomData.floorNumber || null,
    roomData.building || null,
    roomData.capacityNormal || 50,
    roomData.capacityWarning || 75,
    roomData.capacityCritical || 100,
    roomData.isActive !== undefined ? roomData.isActive : 1,
    now,
    now
  );

  return getRoomById(roomId);
}

function updateRoom(roomId, updates) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.roomType !== undefined) { fields.push('room_type = ?'); values.push(updates.roomType); }
  if (updates.floorNumber !== undefined) { fields.push('floor_number = ?'); values.push(updates.floorNumber); }
  if (updates.building !== undefined) { fields.push('building = ?'); values.push(updates.building); }
  if (updates.capacityNormal !== undefined) { fields.push('capacity_normal = ?'); values.push(updates.capacityNormal); }
  if (updates.capacityWarning !== undefined) { fields.push('capacity_warning = ?'); values.push(updates.capacityWarning); }
  if (updates.capacityCritical !== undefined) { fields.push('capacity_critical = ?'); values.push(updates.capacityCritical); }
  if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(roomId);

  const sql = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
  const stmt = db.prepare(sql);
  stmt.run(...values);

  return getRoomById(roomId);
}

// ------------ Reader Management ------------

function getReaderByDeviceId(deviceId) {
  const stmt = db.prepare('SELECT * FROM readers WHERE device_id = ?');
  return stmt.get(deviceId);
}

function getAllReaders(companyId = null) {
  let sql = 'SELECT * FROM readers';
  const params = [];
  if (companyId) {
    sql += ' WHERE company_id = ?';
    params.push(companyId);
  }
  sql += ' ORDER BY gate_name ASC';
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function createReader(readerData) {
  const now = new Date().toISOString();
  const readerId = auth.generateId('READER');

  const stmt = db.prepare(`
    INSERT INTO readers
    (id, company_id, device_id, reader_type, room_id, location_type, gate_name, is_active, firmware_version, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    readerId,
    readerData.companyId,
    readerData.deviceId,
    readerData.readerType || 'RFID_HF',
    readerData.roomId || null,
    readerData.locationType || 'ROOM_ENTRY',
    readerData.gateName,
    readerData.isActive !== undefined ? readerData.isActive : 1,
    readerData.firmwareVersion || null,
    now,
    now
  );

  return getReaderByDeviceId(readerData.deviceId);
}

function updateReaderHeartbeat(deviceId, timestamp) {
  const stmt = db.prepare(`
    UPDATE readers SET last_heartbeat = ?, updated_at = ? WHERE device_id = ?
  `);
  stmt.run(timestamp || new Date().toISOString(), new Date().toISOString(), deviceId);
}

// ------------ Occupancy Tracking ------------

function recordRoomEntry(empId, roomId, eventId) {
  const now = new Date().toISOString();
  const occupancyId = auth.generateId('OCC');

  // Check if already in room (prevent duplicates)
  const existing = db.prepare('SELECT id FROM room_occupancy WHERE room_id = ? AND emp_id = ?').get(roomId, empId);
  if (existing) {
    // Update last_seen if already present
    db.prepare('UPDATE room_occupancy SET last_seen = ? WHERE id = ?').run(now, existing.id);
    return existing.id;
  }

  // Get employee info for company_id
  const emp = getEmployeeById(empId);
  if (!emp) return null;

  const stmt = db.prepare(`
    INSERT INTO room_occupancy
    (id, company_id, room_id, emp_id, entry_time, entry_event_id, last_seen, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(occupancyId, emp.companyId, roomId, empId, now, eventId, now, now);
  return occupancyId;
}

function recordRoomExit(empId, roomId) {
  // Get current occupancy record
  const occupancy = db.prepare(`
    SELECT * FROM room_occupancy WHERE room_id = ? AND emp_id = ?
  `).get(roomId, empId);

  if (!occupancy) return; // Not in room

  const now = new Date().toISOString();
  const exitTime = now;
  const entryTime = new Date(occupancy.entry_time);
  const exitTimeDate = new Date(exitTime);
  const durationMinutes = Math.round((exitTimeDate - entryTime) / 60000);

  // Get employee info
  const emp = getEmployeeById(empId);
  if (!emp) return;

  // Insert into history
  const historyId = auth.generateId('HIST');
  db.prepare(`
    INSERT INTO room_occupancy_history
    (id, company_id, room_id, emp_id, emp_name, department, entry_time, exit_time, duration_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(historyId, occupancy.company_id, roomId, empId, emp.name, emp.department, occupancy.entry_time, exitTime, durationMinutes, now);

  // Remove from current occupancy
  db.prepare('DELETE FROM room_occupancy WHERE id = ?').run(occupancy.id);
}

function clearEmployeeRoomOccupancy(empId) {
  // Move all current occupancy to history
  const occupancies = db.prepare('SELECT * FROM room_occupancy WHERE emp_id = ?').all(empId);

  for (const occ of occupancies) {
    recordRoomExit(empId, occ.room_id);
  }
}

function getCurrentRoomOccupants(roomId) {
  const stmt = db.prepare(`
    SELECT ro.*, e.name, e.department, e.status
    FROM room_occupancy ro
    JOIN employees e ON ro.emp_id = e.id
    WHERE ro.room_id = ?
    ORDER BY ro.entry_time ASC
  `);
  return stmt.all(roomId);
}

function getEmployeeCurrentRoom(empId) {
  const stmt = db.prepare(`
    SELECT ro.*, r.name AS room_name
    FROM room_occupancy ro
    JOIN rooms r ON ro.room_id = r.id
    WHERE ro.emp_id = ?
    LIMIT 1
  `);
  return stmt.get(empId);
}

function getRoomOccupancy(roomId) {
  const room = getRoomById(roomId);
  if (!room) return null;

  const occupants = getCurrentRoomOccupants(roomId);
  const capacityInfo = evaluateRoomCapacity(roomId);

  return {
    room,
    occupants: occupants.map(occ => ({
      empId: occ.emp_id,
      name: occ.name,
      department: occ.department,
      entryTime: occ.entry_time,
      durationMinutes: Math.round((Date.now() - new Date(occ.entry_time)) / 60000),
      status: occ.status
    })),
    ...capacityInfo
  };
}

function evaluateRoomCapacity(roomId) {
  const room = getRoomById(roomId);
  if (!room) return null;

  const occupants = getCurrentRoomOccupants(roomId);
  const count = occupants.length;
  const capacity = room.capacity_normal;
  const percent = capacity > 0 ? Math.round((count / capacity) * 100) : 0;

  let alertLevel = 'green';
  if (percent >= 100) {
    alertLevel = 'red';
  } else if (percent >= 75) {
    alertLevel = 'yellow';
  }

  return { count, capacity, percent, alertLevel };
}

function getRoomOccupancySummary(companyId) {
  const rooms = getAllRooms(companyId);

  const summary = rooms.map(room => {
    const capacityInfo = evaluateRoomCapacity(room.id);
    return {
      roomId: room.id,
      name: room.name,
      roomType: room.room_type,
      ...capacityInfo
    };
  });

  // Calculate facility total
  const allEmployees = getAllEmployees(companyId, false);
  const present = allEmployees.filter(e => e.status === 'INSIDE').length;
  const total = allEmployees.length;
  const facilityPercent = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    rooms: summary,
    facilityTotal: {
      present,
      total,
      percent: facilityPercent
    }
  };
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
  resetEmployeeTemporaryPassword,
  updateEmployeeAccountStatus,
  createSession,
  getSession,
  deleteSession,
  deleteSessionsByAccount,
  cleanExpiredSessions,
  // Org Tree, Dynamic Roles, & Reporting Hierarchy Exports
  createOrgLevel,
  getOrgLevels,
  getOrgLevelById,
  updateOrgLevel,
  deleteOrgLevel,
  createOrgUnit,
  getOrgUnits,
  getOrgUnitById,
  updateOrgUnit,
  deleteOrgUnit,
  getOrgUnitHierarchy,
  detectCircularOrgUnits,
  createJobTitle,
  getJobTitles,
  getJobTitlesByUnit,
  getJobTitleById,
  updateJobTitle,
  deleteJobTitle,
  createAccessRole,
  getAccessRoles,
  getAccessRoleById,
  updateAccessRole,
  deleteAccessRole,
  getRolePermissions,
  setRolePermissions,
  getEmployeeEffectivePermissions,
  VALID_PERMISSION_KEYS,
  VALID_PERMISSION_SCOPES,
  validateReportingAssignment,
  detectCircularReporting,
  assignEmployeeOrgAndReporting,
  getDirectReports,
  getRecursiveSubordinates,
  getReportingChain,
  getOrgHierarchy,
  validateOrgUnitBelongsToCompany,
  validateJobTitleBelongsToCompany,
  validateAccessRoleBelongsToCompany,
  // Room Occupancy Tracking Exports
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  getReaderByDeviceId,
  getAllReaders,
  createReader,
  updateReaderHeartbeat,
  recordRoomEntry,
  recordRoomExit,
  clearEmployeeRoomOccupancy,
  getCurrentRoomOccupants,
  getEmployeeCurrentRoom,
  getRoomOccupancy,
  evaluateRoomCapacity,
  getRoomOccupancySummary
};

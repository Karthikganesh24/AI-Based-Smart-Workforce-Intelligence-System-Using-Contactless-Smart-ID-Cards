/**
 * database.js - Persistent SQLite Database Manager for SmartWorkforce
 * Powered by Node.js native `node:sqlite` (DatabaseSync).
 * Zero external dependencies required on Node 22.5+ / 24+.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'smartworkforce.db');

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

  // 3. Migrate Sample Employees (Seed only if table is currently empty)
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
      INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const emp of initialEmployees) {
      insertEmp.run(emp.id, emp.name, emp.department, emp.role, emp.uid, emp.status, emp.lastSeen, emp.avatarBg, now);
    }
  }

  // 4. Migrate Sample Attendance Events (Seed only if table is currently empty)
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
      INSERT INTO attendance_events (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const evt of initialEvents) {
      insertEvent.run(evt.id, evt.timestamp, evt.empId, evt.empName, evt.department, evt.eventType, evt.gate, evt.status, now);
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
    avatarBg: row.avatar_bg
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
    status: row.status
  };
}

// -------------------------------------------------------------
// Database Query Methods
// -------------------------------------------------------------

function getAllEmployees() {
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

function createEmployee({ id, name, department, role, uid, avatarBg }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO employees (id, name, department, role, uid, status, last_seen, avatar_bg, created_at)
    VALUES (?, ?, ?, ?, ?, 'OUTSIDE', 'Registered today', ?, ?)
  `);
  stmt.run(id, name, department, role, uid, avatarBg || '#0284C7', now);
  return getEmployeeById(id);
}

function getAllAttendanceEvents() {
  const stmt = db.prepare('SELECT * FROM attendance_events ORDER BY rowid ASC');
  return stmt.all().map(formatEventRow);
}

function recordCardScan({ empId, mode, gate }) {
  const emp = getEmployeeById(empId);
  if (!emp) {
    throw new Error(`Employee with ID ${empId} not found`);
  }

  let eventType = 'ENTRY';
  if (mode === 'AUTO') {
    eventType = emp.status === 'INSIDE' ? 'EXIT' : 'ENTRY';
  } else if (mode === 'ENTRY' || mode === 'EXIT') {
    eventType = mode;
  }

  const isEntry = eventType === 'ENTRY';
  const newStatus = isEntry ? 'INSIDE' : 'OUTSIDE';

  // Format timestamp (YYYY-MM-DD HH:mm:ss)
  const now = new Date();
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

  const gateLocation = gate || 'Gate 01 - Main Facility Turnstile';
  const isoNow = now.toISOString();

  // Execute in transaction: insert event + update employee
  db.exec('BEGIN TRANSACTION;');
  try {
    const insertEvent = db.prepare(`
      INSERT INTO attendance_events (id, timestamp, emp_id, emp_name, department, event_type, gate, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'VERIFIED', ?)
    `);
    insertEvent.run(logId, formattedTimestamp, emp.id, emp.name, emp.department, eventType, gateLocation, isoNow);

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
    event: {
      id: logId,
      timestamp: formattedTimestamp,
      empId: emp.id,
      empName: emp.name,
      department: emp.department,
      eventType: eventType,
      gate: gateLocation,
      status: 'VERIFIED'
    },
    employee: getEmployeeById(emp.id)
  };
}

function clearAttendanceEvents() {
  db.exec('DELETE FROM attendance_events;');
  return { success: true, count: 0 };
}

function resetDatabase() {
  db.exec('DROP TABLE IF EXISTS attendance_events;');
  db.exec('DROP TABLE IF EXISTS employees;');
  initDatabase();
  return { success: true };
}

// Run table creation and seed check
initDatabase();

module.exports = {
  db,
  DB_PATH,
  initDatabase,
  resetDatabase,
  getAllEmployees,
  getEmployeeById,
  getEmployeeByUid,
  createEmployee,
  getAllAttendanceEvents,
  recordCardScan,
  clearAttendanceEvents
};

-- ====================================================================
-- SmartWorkforce SQLite Schema
-- Native Node.js `node:sqlite` (DatabaseSync) Compatible DDL
-- Multi-Tenant Workforce & Enterprise Authentication
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. Companies Table (Multi-tenant Enterprise Workspaces)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

-- 2. Company User Accounts Table (COMPANY_HEAD & COMPANY_ADMIN)
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

-- 3. Operational Employees Table (Workforce Presence & Contactless ID)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  uid TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'OUTSIDE',
  last_seen TEXT NOT NULL DEFAULT 'Not detected today',
  avatar_bg TEXT NOT NULL DEFAULT '#0284C7',
  created_at TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id)
);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_uid ON employees(uid);

-- 4. Employee Accounts Table (Dedicated Employee Authentication Credentials)
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

-- 5. Sessions Table (Server-side Session State with CSRF Protection)
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

-- 6. Attendance Events Log Table (Contactless Tap Telemetry Transactions)
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

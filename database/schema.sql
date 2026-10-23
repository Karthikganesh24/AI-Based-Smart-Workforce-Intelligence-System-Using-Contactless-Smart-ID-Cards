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
  uid TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'OUTSIDE',
  last_seen TEXT NOT NULL DEFAULT 'Not detected today',
  avatar_bg TEXT NOT NULL DEFAULT '#0284C7',
  created_at TEXT NOT NULL,
  company_id TEXT REFERENCES companies(id),
  email TEXT,
  phone TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  org_unit_id TEXT REFERENCES org_units(id) ON DELETE SET NULL,
  job_title_id TEXT REFERENCES company_job_titles(id) ON DELETE SET NULL,
  access_role_id TEXT REFERENCES company_access_roles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_uid ON employees(uid);
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON employees(is_archived);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_company_email ON employees(company_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_unit_id ON employees(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_title_id ON employees(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employees_access_role_id ON employees(access_role_id);

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

-- 7. Organizational Hierarchy Levels (Configurable Tiers / Ranks per Company)
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

-- 8. Organizational Units (Departments, Divisions, Teams, Plants per Company)
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

-- 9. Company Job Titles (Dynamic HR Designations decoupled from Access Permissions)
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

-- 10. Company Access Roles (Configurable Security & Authorization Roles)
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

-- 11. Company Role Permissions (Granular Permission Grants with Scopes)
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

-- 12. Schema Migrations Ledger
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

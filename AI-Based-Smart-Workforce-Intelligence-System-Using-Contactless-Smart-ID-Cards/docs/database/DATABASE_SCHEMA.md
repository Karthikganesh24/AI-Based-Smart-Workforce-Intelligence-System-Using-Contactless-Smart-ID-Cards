# SmartWorkforce — Database Architecture & Schema Specification

This document provides a technical reference for the SQLite database architecture, entity relationships, indexing strategy, recursive CTE queries, and migration mechanisms implemented in SmartWorkforce.

---

## 1. Database Configuration & Engine

- **Database Engine**: Native Node.js `node:sqlite` (`DatabaseSync` API, zero third-party drivers).
- **Default Storage Location**: `database/smartworkforce.db` (overrideable at runtime via `process.env.DB_PATH`).
- **Journal Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for concurrent read access without read-write blocking.
- **Foreign Key Integrity**: Strictly enabled on every connection (`PRAGMA foreign_keys = ON;`).
- **Safety Policy**: The production database is isolated from automated tests; tests operate against temporary databases (e.g. `tests/isolated_*.db`).

---

## 2. Entity-Relationship Overview

```text
               ┌───────────────────────┐
               │       companies       │
               └───────────┬───────────┘
                           │ 1
                           ├──────────────────────┬──────────────────────┐
                           │ *                    │ *                    │ *
               ┌───────────▼───────────┐ ┌────────▼───────────┐ ┌────────▼───────────┐
               │     company_users     │ │     org_levels     │ │company_access_roles│
               └───────────────────────┘ └────────┬───────────┘ └────────┬───────────┘
                                                  │ 1                    │ 1
                                                  │ *                    │ *
                                         ┌────────▼───────────┐ ┌────────▼───────────┐
                                         │     org_units      │ │company_role_perms  │
                                         └────────┬───────────┘ └────────────────────┘
                                                  │ 1
                                                  │ *
                                         ┌────────▼───────────┐
                           ┌─────────────┤     employees      │◄──────────┐ (reports to)
                           │             └────────┬───────────┘           │ manager_id
                           │ 1                    │ 1                     │
                           │ *                    │ 1                     │
               ┌───────────▼───────────┐ ┌────────▼───────────┐           │
               │   attendance_events   │ │ employee_accounts  │           │
               └───────────────────────┘ └────────────────────┘           │
                           │                                              │
                           └──────────────────────────────────────────────┘
```

---

## 3. Detailed Table Specifications

### 3.1 `companies`
Multi-tenant enterprise workspaces.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique company ID (e.g., `COMP-9D8741D968CC`). |
| `name` | TEXT | NOT NULL | Registered legal name of organization. |
| `industry` | TEXT | NOT NULL | Business industry sector. |
| `email` | TEXT | UNIQUE, NOT NULL | Primary administrative contact email. |
| `created_at` | TEXT | NOT NULL | ISO-8601 creation timestamp. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 update timestamp. |

### 3.2 `company_users`
Company Administrators and Company Heads.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | User identifier (e.g., `USR-ADMIN-01`). |
| `company_id` | TEXT | FK `companies(id)` ON DELETE CASCADE | Associated tenant ID. |
| `email` | TEXT | UNIQUE, NOT NULL | Sign-in email address. |
| `full_name` | TEXT | NOT NULL | Full name of administrator. |
| `password_hash`| TEXT | NOT NULL | Scrypt derived cryptographic hash. |
| `password_salt`| TEXT | NOT NULL | Cryptographic random salt (16 bytes hex). |
| `role` | TEXT | CHECK IN (`COMPANY_HEAD`, `COMPANY_ADMIN`) | Administrative role. |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp. |

### 3.3 `employees`
Enrolled workforce members with contactless credentials, presence state, and reporting lines.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique Employee ID (e.g., `EMP-101`). |
| `name` | TEXT | NOT NULL | Employee full legal name. |
| `department` | TEXT | NOT NULL | Legacy/display department label. |
| `role` | TEXT | NOT NULL | Legacy/display job designation label. |
| `uid` | TEXT | UNIQUE, NULLABLE | Physical 13.56 MHz RFID/NFC UID (e.g. `7E:A1:39:B2`). |
| `status` | TEXT | DEFAULT `'OUTSIDE'` | Live presence state (`INSIDE` or `OUTSIDE`). |
| `last_seen` | TEXT | DEFAULT `'Not detected today'` | Time string of most recent checkpoint detection. |
| `avatar_bg` | TEXT | DEFAULT `'#0284C7'` | Hex color code for UI avatar badge. |
| `created_at` | TEXT | NOT NULL | ISO-8601 creation timestamp. |
| `company_id` | TEXT | FK `companies(id)` | Tenant identifier. |
| `email` | TEXT | NULLABLE | Contact and notification email address. |
| `phone` | TEXT | NULLABLE | Contact telephone (used for temporary password derivation). |
| `is_archived` | INTEGER | DEFAULT `0` | Soft-delete flag (`0` = active, `1` = archived). |
| `archived_at` | TEXT | NULLABLE | Soft-delete timestamp. |
| `manager_id` | TEXT | FK `employees(id)` ON DELETE SET NULL | Reporting manager reference. |
| `org_unit_id` | TEXT | FK `org_units(id)` ON DELETE SET NULL | Assigned organizational unit. |
| `job_title_id` | TEXT | FK `company_job_titles(id)` ON DELETE SET NULL | Assigned dynamic job title. |
| `access_role_id`| TEXT | FK `company_access_roles(id)` ON DELETE SET NULL| Assigned RBAC access role. |

### 3.4 `employee_accounts`
Dedicated credentials and authentication state for employee portal login.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Account identifier (e.g., `ACC-1001`). |
| `employee_id` | TEXT | UNIQUE, FK `employees(id)` ON DELETE CASCADE | 1-to-1 linkage to employee. |
| `company_id` | TEXT | FK `companies(id)` ON DELETE CASCADE | Associated tenant ID. |
| `password_hash`| TEXT | NOT NULL | Scrypt derived cryptographic hash. |
| `password_salt`| TEXT | NOT NULL | Cryptographic random salt. |
| `must_change_password` | INTEGER | DEFAULT `1` | First-login password change enforcement flag (`1` = true). |
| `account_status` | TEXT | DEFAULT `'ACTIVE'` CHECK IN (`ACTIVE`, `SUSPENDED`, `PENDING`) | Account authorization status. |
| `password_updated_at` | TEXT | NULLABLE | Timestamp of last permanent password update. |

### 3.5 `attendance_events`
Immutable physical and virtual turnstile tap transactions.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique log identifier (e.g., `LOG-1001`). |
| `timestamp` | TEXT | NOT NULL | Formatted local timestamp string (`DD/MM/YYYY, HH:MM:SS`). |
| `emp_id` | TEXT | NOT NULL | Employee ID. |
| `emp_name` | TEXT | NOT NULL | Employee name snapshot. |
| `department` | TEXT | NOT NULL | Department snapshot. |
| `event_type` | TEXT | CHECK IN (`ENTRY`, `EXIT`) | Checkpoint transition direction. |
| `gate` | TEXT | NOT NULL | Facility turnstile location (e.g., `Gate 01 - Main Turnstile`). |
| `status` | TEXT | DEFAULT `'VERIFIED'` | Verification status (`VERIFIED`, `FLAGGED`). |
| `created_at` | TEXT | NOT NULL | ISO-8601 server timestamp. |
| `company_id` | TEXT | FK `companies(id)` ON DELETE CASCADE | Multi-tenant company ID. |

### 3.6 Organizational Hierarchy & RBAC Tables
- **`org_levels`**: Hierarchy tiers (`Executive`, `Department Head`, `Team Lead`, `Staff`) with uniqueness constraint on `(company_id, rank)`.
- **`org_units`**: Tree nodes (`Division`, `Department`, `Team`) with self-referencing `parent_unit_id` and assigned `manager_id`.
- **`company_job_titles`**: Dynamic HR designations scoped to tenant.
- **`company_access_roles`**: System and custom RBAC roles (`Administrator`, `Department Head`, `Team Lead`, `Employee`).
- **`company_role_permissions`**: Scoped permission mapping (`key`, `scope` IN `SELF`, `DIRECT_REPORTS`, `DESCENDANTS`, `DEPARTMENT`, `COMPANY`).

---

## 4. Key Recursive Common Table Expressions (CTEs)

### 4.1 Upward Reporting Lineage (`getReportingChain`)
Traverses upwards from the employee through managers up to the organization's executive leadership:

```sql
WITH RECURSIVE reporting_chain(id, name, department, role, manager_id, org_unit_id, job_title_id, access_role_id, depth) AS (
  SELECT id, name, department, role, manager_id, org_unit_id, job_title_id, access_role_id, 0 AS depth
  FROM employees
  WHERE id = ? AND company_id = ? AND is_archived = 0

  UNION ALL

  SELECT e.id, e.name, e.department, e.role, e.manager_id, e.org_unit_id, e.job_title_id, e.access_role_id, rc.depth + 1
  FROM employees e
  INNER JOIN reporting_chain rc ON e.id = rc.manager_id
  WHERE e.company_id = ? AND e.is_archived = 0 AND rc.depth < 30
)
SELECT rc.*, u.name as orgUnitName, j.title as jobTitleName, r.name as accessRoleName
FROM reporting_chain rc
LEFT JOIN org_units u ON rc.org_unit_id = u.id
LEFT JOIN company_job_titles j ON rc.job_title_id = j.id
LEFT JOIN company_access_roles r ON rc.access_role_id = r.id
ORDER BY depth ASC;
```

### 4.2 Recursive Subordinate Tree (`getRecursiveSubordinates`)
Traverses downwards from a manager to identify all direct and indirect descendants:

```sql
WITH RECURSIVE subordinates(id, name, department, role, manager_id, depth) AS (
  SELECT id, name, department, role, manager_id, 1 AS depth
  FROM employees
  WHERE manager_id = ? AND company_id = ? AND is_archived = 0

  UNION ALL

  SELECT e.id, e.name, e.department, e.role, e.manager_id, s.depth + 1
  FROM employees e
  INNER JOIN subordinates s ON e.manager_id = s.id
  WHERE e.company_id = ? AND e.is_archived = 0 AND s.depth < 30
)
SELECT * FROM subordinates ORDER BY depth ASC;
```

---

## 5. Migration Strategy

The migration engine (`database/migrate.js`):
1. Verifies database connectivity and disables foreign keys temporarily during schema alterations.
2. Takes an automatic file snapshot to `archive/backups/pre_auth_db_snapshots/` prior to mutations.
3. Executes inside an atomic `BEGIN TRANSACTION ... COMMIT` block.
4. Records applied versions in `schema_migrations` to guarantee 100% idempotency.
5. Runs `PRAGMA foreign_key_check` and count assertions before and after to guarantee zero record loss.

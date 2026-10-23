# SmartWorkforce — Automated Testing Guide & Quality Assurance

This document details the automated testing architecture, test categorization (unit vs. integration), isolation principles, and test execution procedures for the SmartWorkforce project.

---

## 1. Testing Philosophy & Strict Safety Rules

The SmartWorkforce test suite adheres to strict safety guarantees:
1. **Production Database Immutability**: Tests **NEVER** write to or modify `database/smartworkforce.db`.
2. **Database Isolation**: Every test runner provisions a dedicated temporary SQLite database (e.g., `tests/isolated_phase6_validation.db`) by setting `process.env.DB_PATH` prior to requiring database modules.
3. **Multi-Tenant Segregation**: Tests register at least two distinct organizations (e.g., *Horizon Technologies* and *Summit Dynamics*) to ensure zero cross-tenant data leakage.
4. **Zero Mocks for Business Logic**: Tests execute actual HTTP requests against live server instances, asserting true database mutations, session state, and cryptographic password verifications.

---

## 2. Test Suite Structure & Index

The test suite is organized into two primary categories:

```text
tests/
├── unit/                                   # Isolated Unit Tests
│   ├── test_employee_contact.js            # Temporary password rule & contact normalization
│   └── test_password_reset.js              # Admin temporary password reset mechanics
│
├── integration/                            # End-to-End Integration Tests
│   ├── test_persistence_analytics.js       # SQLite persistence, restart resilience & AI analytics
│   ├── test_employee_crud.js               # Employee CRUD, account suspension, soft-delete & restore
│   ├── test_org_tree.js                    # Org hierarchy data layer, circular defenses & CTEs
│   ├── test_api_authorization.js           # REST endpoints, permission scopes, CSRF & escalation
│   ├── test_admin_frontend.js              # Admin frontend DOM contracts, modals & selectors
│   ├── test_employee_manager_portal.js     # Employee profile, reporting breadcrumbs & team roster
│   └── test_system_integration.js          # Master workflow integration & security boundary audit
│
└── README.md                               # Test index & directory guide
```

---

## 3. Running Tests

### 3.1 Execute Complete Test Suite (Unit + Integration)
```bash
npm test
# or:
npm run test:all
```
This runs `node scripts/run_all_tests.js`, which executes all 9 test suites sequentially and presents an aggregated summary.

### 3.2 Execute Unit Tests Only
```bash
npm run test:unit
```
Runs:
- `node tests/unit/test_employee_contact.js`
- `node tests/unit/test_password_reset.js`

### 3.3 Execute Integration Tests Only
```bash
npm run test:integration
```
Runs:
- `node tests/integration/test_persistence_analytics.js`
- `node tests/integration/test_employee_crud.js`
- `node tests/integration/test_org_tree.js`
- `node tests/integration/test_api_authorization.js`
- `node tests/integration/test_admin_frontend.js`
- `node tests/integration/test_employee_manager_portal.js`
- `node tests/integration/test_system_integration.js`

### 3.4 Execute Individual Test Suites
```bash
# Test Core Persistence & Analytics:
node tests/integration/test_persistence_analytics.js

# Test System Security & Business Workflow:
node tests/integration/test_system_integration.js

# Test Organizational Hierarchy & CTE Traversal:
node tests/integration/test_org_tree.js
```

---

## 4. Test Coverage Summary

| Test Suite | Assertions | Core Validations |
| :--- | :---: | :--- |
| `test_employee_contact.js` | 14 | `Name[:4] + Phone[-4:]` rule, invalid contact format rejections, scrypt storage. |
| `test_password_reset.js` | 11 | Admin temporary password reset, session termination, credential rotation. |
| `test_persistence_analytics.js` | 84 | SQLite persistence, server restart, 5s debounce, AI analytics, hardware simulation. |
| `test_employee_crud.js` | 31 | Full employee CRUD, email uniqueness per company, soft-delete archiving, restore. |
| `test_org_tree.js` | 41 | Custom tiers, units, job titles, roles, self/circular reporting cycle rejection, CTEs. |
| `test_api_authorization.js` | 67 | REST endpoints, permission scopes (`SELF` -> `COMPANY`), privilege escalation rejection. |
| `test_admin_frontend.js` | 34 | Admin portal HTML delivery, DOM contracts, modals, controls, and selectors. |
| `test_employee_manager_portal.js` | 36 | Profile metadata, reporting breadcrumb chain, manager live presence roster, modals. |
| `test_system_integration.js` | 28 | End-to-end multi-tier enrollment, password change lifecycle, security boundary audit. |
| **Total Test Suite** | **346** | **100% Automated Coverage Across Core Application** |

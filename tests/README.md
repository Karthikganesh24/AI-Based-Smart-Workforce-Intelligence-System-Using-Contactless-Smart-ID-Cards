# SmartWorkforce — Automated Test Suite

This directory contains the comprehensive, multi-layer automated test suite for the **SmartWorkforce** platform.

Every test suite runs with **zero external testing frameworks**, utilizing native Node.js (`node:test`, `assert`, `http`, `child_process`, and `node:sqlite`).

---

## 📁 Directory Structure

```
tests/
├── README.md                                  # This documentation
├── unit/                                      # Unit & algorithmic test suites
│   ├── test_employee_contact.js               # Temporary password rule & contact normalization (14 assertions)
│   └── test_password_reset.js                 # Admin temporary password reset mechanics (11 assertions)
└── integration/                               # Multi-tier system & end-to-end integration tests
    ├── test_persistence_analytics.js          # SQLite persistence, restart resilience & AI analytics (84 assertions)
    ├── test_employee_crud.js                  # Employee CRUD, account suspension, soft-delete & restore (31 assertions)
    ├── test_org_tree.js                       # Org hierarchy data layer, circular defenses & CTEs (41 assertions)
    ├── test_api_authorization.js              # REST endpoints, permission scopes, CSRF & escalation (67 assertions)
    ├── test_admin_frontend.js                 # Admin frontend DOM contracts, modals & selectors (34 assertions)
    ├── test_employee_manager_portal.js        # Employee profile, reporting breadcrumbs & team roster (36 assertions)
    └── test_system_integration.js             # Master workflow integration & security boundary audit (28 assertions)
```

---

## 🛡️ Production Database Isolation Guarantee

Every test suite strictly adheres to the **Zero Production Mutation Principle**:
1. At process launch, each test points `process.env.DB_PATH` to an isolated database file in `tests/` (e.g., `tests/isolated_phase3_api.db`).
2. Modules load after `DB_PATH` is assigned, guaranteeing that all queries, migrations, and transactions operate on the temporary database.
3. The production database file (`database/smartworkforce.db`, 294,912 bytes) is **never touched, modified, deleted, or recreated**.
4. The test runner (`scripts/run_all_tests.js`) asserts byte-exact file size and timestamp immutability before and after every test execution.
5. All isolated databases are automatically wiped before and after test runs.

---

## 🚀 Test Execution Commands

| Command | Action | Test Target |
| :--- | :--- | :--- |
| `npm test` | Run complete automated suite | Unit (2 suites) + Integration (7 suites) |
| `npm run test:all` | Run complete automated suite | Unit (2 suites) + Integration (7 suites) |
| `npm run test:unit` | Run unit tests only | `tests/unit/*.js` |
| `npm run test:integration` | Run integration tests only | `tests/integration/*.js` |
| `npm run test:e2e` | Run persistence & analytics suite | `tests/integration/test_persistence_analytics.js` |

### Running Individual Test Files

You can execute any individual test directly using Node.js:

```bash
# Unit tests
node tests/unit/test_employee_contact.js
node tests/unit/test_password_reset.js

# Integration tests
node tests/integration/test_persistence_analytics.js
node tests/integration/test_employee_crud.js
node tests/integration/test_org_tree.js
node tests/integration/test_api_authorization.js
node tests/integration/test_admin_frontend.js
node tests/integration/test_employee_manager_portal.js
node tests/integration/test_system_integration.js
```

---

## 📊 Test Suite Coverage Matrix

| Category | Suite | Assertions | Focus Areas |
| :--- | :--- | :---: | :--- |
| **Unit** | `test_employee_contact.js` | 14 | Name[:4] + Phone[-4:] algorithmic rule, accent & whitespace stripping, regex phone validation. |
| **Unit** | `test_password_reset.js` | 11 | Admin temporary password reset, session invalidation, scrypt hashing, mandatory first-login flag. |
| **Integration** | `test_persistence_analytics.js` | 84 | SQLite disk durability across server restarts, RFID debouncing, AI workforce punctuality & risk analytics. |
| **Integration** | `test_employee_crud.js` | 31 | Full employee lifecycle: creation, update, suspension, session termination, soft-delete, and restoration. |
| **Integration** | `test_org_tree.js` | 41 | Relational schema migrations, recursive CTEs (`getReportingChain`, `getRecursiveSubordinates`), cycle defenses. |
| **Integration** | `test_api_authorization.js` | 67 | REST API contracts, Anti-CSRF token verification, role-based access control, privilege escalation blocks. |
| **Integration** | `test_admin_frontend.js` | 34 | Admin portal HTML structure, modals, CSS classes, DOM selectors, client API controller methods. |
| **Integration** | `test_employee_manager_portal.js` | 36 | Employee self-service, manager team matrix, direct vs indirect reports, department head scope. |
| **Integration** | `test_system_integration.js` | 28 | Cross-phase end-to-end integration, multi-tenant boundaries, zero credential leakage in responses. |
| **Total** | **9 Test Suites** | **346** | **100% Automated Coverage** |

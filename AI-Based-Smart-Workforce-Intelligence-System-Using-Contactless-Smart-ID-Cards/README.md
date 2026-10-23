# SmartWorkforce — AI-Based Smart Workforce Intelligence System

> **Enterprise Workforce Intelligence & Presence Management System**  
> Native Node.js • Contactless Smart ID Cards (13.56 MHz HF/NFC & UHF RFID) • Persistent SQLite Storage

---

## 🏢 Overview

SmartWorkforce is an end-to-end industrial attendance tracking and workforce presence intelligence platform. It bridges physical edge IoT hardware (ESP32 microcontrollers and RFID readers) with a resilient multi-tenant enterprise management tier.

### Core Capabilities
- **Zero Third-Party Dependencies:** Built entirely with native Node.js standard libraries (`node:sqlite`, `node:http`, `node:fs`, `node:crypto`).
- **Multi-Tenant Enterprise Hierarchy:** Custom organizational tiers, departmental trees, dynamically configurable job titles, access roles, and recursive CTE reporting breadcrumbs.
- **Role-Based Portals:** Dedicated web interfaces for **Company Administrators**, **Supervising Managers**, and **Employees**.
- **Contactless RFID Gateway:** Edge hardware integration supporting high-frequency (HF) 13.56 MHz and ultra-high frequency (UHF) smart badges with cryptographically verified gateway API keys.
- **Fraud Protection & Debounce Engine:** 5-second burst duplicate protection per badge and gate preventing accidental or fraudulent double-scans.
- **Explainable AI Analytics:** Punctuality tracking, automated overtime ledgering, heuristic absenteeism-risk forecasting, and sequence discrepancy auditing.
- **High-Performance Persistence:** SQLite running in Write-Ahead Logging (WAL) mode with strict ACID transaction guarantees.

---

## 📁 Project Directory Structure

```text
SmartWorkforce/
├── backend/                              # Backend application runtime
│   ├── server.js                         # Native HTTP server, REST router, session gate & static server
│   ├── auth.js                           # Scrypt hashing, CSRF tokens, session manager & auth middleware
│   └── analytics.js                      # Workforce punctuality, overtime, risk & anomaly engine
├── database/                             # SQLite persistence layer
│   ├── database.js                       # DatabaseSync connection manager, queries & recursive CTEs
│   ├── migrate.js                        # Idempotent incremental migration runner
│   ├── schema.sql                        # SQLite DDL schema, foreign key constraints & indexes
│   └── smartworkforce.db                 # Persistent production database (WAL mode)
├── frontend/                             # Multi-portal responsive client application
│   ├── login/                            # Authentication & Company Registration Portal
│   │   ├── index.html                    # Sign-in UI with Company Admin & Employee tabs
│   │   └── login.js                      # Authentication controller & session initializer
│   ├── admin/                            # Company Operations Command Center
│   │   ├── index.html                    # Presence KPIs, Org Tree, Roles, RFID Terminal, Analytics
│   │   └── admin.js                      # Admin UI controller, SVG chart builder, live sync
│   ├── employee/                         # Employee & Manager Self-Service Portal
│   │   ├── index.html                    # Digital ID badge, self-punch, team matrix & roster
│   │   ├── employee.js                   # Employee & manager portal controller
│   │   └── employee.css                  # Specialized portal styling
│   ├── shared/                           # Unified Design System tokens and shared modules
│   │   ├── css/
│   │   │   └── style.css                 # Master CSS variables, responsive grid & animations
│   │   └── js/
│   │       └── common.js                 # Shared API client, Web Audio chimes, toast notifications
│   └── assets/                           # Static branding & photography
│       └── office_building.jpg           # Campus architecture hero image
├── hardware/                             # Physical edge IoT & gateway integration
│   ├── README.md                         # ESP32 pinouts, wiring schematics & communication protocols
│   └── simulator/
│       └── simulate_rfid_gateway.js      # ESP32 Wi-Fi & RFID microcontroller terminal simulator
├── scripts/                              # Developer and operational utilities
│   ├── run_all_tests.js                  # Master test runner with timing & DB isolation audits
│   └── simulate_esp32.js                 # Backward-compatible CLI delegate to hardware simulator
├── tests/                                # Automated quality assurance suite (346 assertions)
│   ├── README.md                         # Comprehensive test documentation & execution guide
│   ├── unit/                             # Algorithmic and unit test suites
│   │   ├── test_employee_contact.js      # Temporary password rule & contact normalization
│   │   └── test_password_reset.js        # Admin temporary password reset mechanics
│   └── integration/                      # Multi-tier integration and end-to-end tests
│       ├── test_persistence_analytics.js # SQLite persistence, restart resilience & AI analytics
│       ├── test_employee_crud.js         # Employee CRUD, account suspension & soft-delete
│       ├── test_org_tree.js              # Org hierarchy data layer, circular defenses & CTEs
│       ├── test_api_authorization.js     # REST API contracts, permission scopes & anti-CSRF
│       ├── test_admin_frontend.js        # Admin frontend DOM contracts, modals & selectors
│       ├── test_employee_manager_portal.js# Employee profile, reporting breadcrumbs & team roster
│       └── test_system_integration.js    # Master workflow integration & security boundary audit
├── docs/                                 # Technical documentation suite
│   ├── README.md                         # Documentation index and navigation map
│   ├── architecture/
│   │   └── ARCHITECTURE.md               # Multi-tier topology, security & component interaction
│   ├── api/
│   │   └── API.md                        # Exhaustive REST API specification & payloads
│   ├── database/
│   │   └── DATABASE_SCHEMA.md            # Schema definitions, foreign keys & recursive CTEs
│   ├── testing/
│   │   └── TESTING_GUIDE.md              # Quality assurance philosophy & test execution guide
│   └── project-report/
│       └── PROJECT_REPORT.md             # Comprehensive capstone engineering project report
├── archive/                              # Preserved historical snapshots & legacy scratch
│   ├── README.md                         # Catalog of historical phase archives
│   ├── backups/                          # Consolidated historical phase backups
│   └── scratch/                          # Preserved diagnostic and verification scripts
├── package.json                          # Project manifest, dependencies, and execution scripts
└── README.md                             # Top-level system documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version **22.5.0** or higher (tested with Node 22+ / 24+).
- **External Dependencies**: **None required**. No `npm install` required.

### 1. Launch the Server
```bash
npm start
```
The server launches by default on port **3000** (or automatically detects the next available port if 3000 is occupied).

Open your browser and navigate to:
- **Authentication & Registration:** [http://localhost:3000/](http://localhost:3000/) or `/login`
- **Company Operations Command Center:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Employee & Manager Self-Service:** [http://localhost:3000/employee](http://localhost:3000/employee)

---

## 🧪 Automated Testing

SmartWorkforce includes 9 automated test suites comprising **346 distinct assertions**. All tests run against isolated temporary databases and guarantee zero modifications to the production database.

```bash
# Execute the complete automated test suite (Unit + Integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run the 38-step persistence and AI analytics suite
npm run test:e2e
```

For more details on the testing methodology and coverage matrix, see [tests/README.md](tests/README.md) and [docs/testing/TESTING_GUIDE.md](docs/testing/TESTING_GUIDE.md).

---

## 📡 Hardware & RFID Simulation

### CLI Hardware Gateway Simulator
The system includes an ESP32 microcontroller emulator transmitting telemetry over HTTP with RF distance and RSSI simulation:

```bash
# Single scan using a registered workforce card UID
npm run simulate:esp32 -- --uid 7E:A1:39:B2

# Stream continuous scans across facility gates
npm run simulate:stream

# Test 5-second duplicate read debounce rejection
node hardware/simulator/simulate_rfid_gateway.js --debounce-test

# Test rejection of unregistered smart cards
node hardware/simulator/simulate_rfid_gateway.js --unknown-test
```

> **Backward Compatibility:** `node scripts/simulate_esp32.js` remains fully operational and transparently delegates to the hardware simulator.

### In-Browser Virtual Simulator
Visit `/admin`, navigate to the **RFID Terminal & Simulator** tab, and run:
1. **Single Scan:** Process an individual badge presentation with configurable simulated distance and RSSI signal strength.
2. **Burst Repeat Scan:** Test rapid successive taps to verify the 5-second debounce window.
3. **Unknown Card Test:** Present an unassigned badge UID and observe graceful 404 rejection with zero state change.
4. **Multi-Employee Rush Simulation:** Simulate a shift transition where multiple employees present cards in rapid sequence.

---

## 📚 Technical Documentation Suite

Complete technical references and project deliverables are available in `docs/`:
- **[Documentation Catalog](docs/README.md):** Central navigation map for all technical documentation.
- **[System Architecture](docs/architecture/ARCHITECTURE.md):** Architectural patterns, security boundaries, and data flow pipelines.
- **[REST API Specification](docs/api/API.md):** Complete endpoint reference, authentication headers, and JSON contracts.
- **[Database Schema & Data Dictionary](docs/database/DATABASE_SCHEMA.md):** Table schemas, constraints, and recursive CTE query designs.
- **[Testing & Quality Assurance Guide](docs/testing/TESTING_GUIDE.md):** Automated testing philosophy, suite execution commands, and matrix.
- **[Engineering Project Report](docs/project-report/PROJECT_REPORT.md):** Academic capstone report detailing system engineering, methodology, and performance.
- **[IoT & Hardware Specifications](hardware/README.md):** Microcontroller pinouts, RC522 SPI wiring, and gateway protocols.
- **[Historical Archive Catalog](archive/README.md):** Inventory of preserved phase backups and diagnostic assets.

---

## 📄 License
ISC License • SmartWorkforce Engineering Team

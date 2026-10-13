# SmartWorkforce System Architecture

The **SmartWorkforce Intelligence System** is an industrial-grade attendance tracking, real-time presence monitoring, and workforce analytics platform. It simulates contactless smart ID cards (13.56 MHz HF/NFC and UHF EPC Gen2) communicating with smart door checkpoints and turnstiles.

---

## 1. Directory Structure

```text
SmartWorkforce/
├── frontend/                     # Multi-portal user interface
│   ├── login/                    # Authentication & company registration portal
│   │   ├── index.html
│   │   └── login.js
│   ├── admin/                    # Company Administrator command center
│   │   ├── index.html
│   │   └── admin.js
│   ├── employee/                 # Employee self-service & smart badge portal
│   │   ├── index.html
│   │   └── employee.js
│   ├── assets/                   # Photography & visual branding assets
│   │   └── office_building.jpg
│   └── shared/                   # Common frontend assets
│       ├── css/
│       │   └── style.css         # Unified Design System tokens & layout rules
│       └── js/
│           └── common.js         # Shared API client, Web Audio chimes, toasts
├── backend/                      # Server runtime & analytics engine
│   ├── server.js                 # Native HTTP server, static file router, REST API
│   └── analytics.js              # Explainable heuristic workforce analytics models
├── database/                     # SQLite persistence layer
│   ├── database.js               # Node.js native DatabaseSync connection manager
│   ├── smartworkforce.db         # Persistent SQLite database (WAL mode)
│   └── schema.sql                # Complete SQL DDL schema & index definitions
├── scripts/                      # Hardware simulators & developer tools
│   └── simulate_esp32.js         # Hardware-free ESP32 + RFID contactless terminal simulator
├── tests/                        # Automated verification test suites
│   └── test_persistence.js       # 38-step isolated verification test suite
├── docs/                         # System architecture & API documentation
│   ├── ARCHITECTURE.md           # Architecture overview & component relationships
│   └── API.md                    # REST API endpoint reference
├── .backup_phase2/               # Preserved historical backup (inactive)
├── .gitignore                    # Git exclusions for databases, env files & logs
├── package.json                  # Node.js package definition & scripts
└── README.md                     # Getting started and operations guide
```

---

## 2. Core Modules & Responsibilities

### Frontend Layer
- **Login Portal (`frontend/login/`):** Unified authentication entry point with tab switching for Company Administrators and Employees, company registration onboarding, and direct dashboard access.
- **Admin Dashboard (`frontend/admin/`):** Comprehensive operations center providing real-time headcount KPIs, presence rosters, interactive 4-scenario virtual RFID terminal simulator, employee roster directory, exportable gate event logs, and AI analytics.
- **Employee Portal (`frontend/employee/`):** Dedicated staff member interface showing personal presence status, assigned NFC card UID, last check-in timestamp, simulated self-tap punch station, and personal attendance history.
- **Shared Layer (`frontend/shared/`):** Unified modern CSS design system with light/dark theme switching, Web Audio API industrial scan chimes, toast notifications, and client-side `SmartWorkforceAPI` async fetch wrappers.

### Backend Layer
- **HTTP Server (`backend/server.js`):** Built entirely with Node.js standard library (`node:http`, `node:fs`, `node:path`). Dispatches requests to 12 REST API endpoints, provides CORS headers, parses JSON request bodies, and resolves static file serving for all portals with traversal protection and backwards-compatible legacy route mappings.
- **Analytics Engine (`backend/analytics.js`):** Transparent, explainable heuristic models for schedule-based punctuality (09:00 AM shift with 15-minute grace), overtime tracking, department attendance ratios, absenteeism risk factors, and gate sequence anomalies (unpaired entry/exit and rapid transitions).

### Database Layer
- **SQLite Database Manager (`database/database.js`):** Powered by Node 22.5+ native `node:sqlite` (`DatabaseSync`). Configures WAL (Write-Ahead Logging) mode and foreign key enforcement. Implements transactional atomic writes (event log insertion + employee status updates) and a configurable 5-second duplicate-read debounce cache.
- **Persistent Database (`database/smartworkforce.db`):** Local persistent storage retaining workforce rosters, assigned badge UIDs, and historical gate logs across application restarts.

### Hardware Simulator Layer
- **ESP32 Simulator (`scripts/simulate_esp32.js`):** Standalone CLI utility simulating physical micro-controllers and UHF/HF contactless readers transmitting HTTP requests with card UIDs, gate IDs, and simulated signal strength (RSSI).

---

## 3. Data Flow Architecture

```text
[ Browser / ESP32 Simulator ]
             │
             ▼ HTTP (Port 3000)
    ┌─────────────────┐
    │ backend/server  │
    └────────┬────────┘
             │
      ┌──────┴───────────────────────────┐
      ▼                                  ▼
[ Static Multi-Portal Routing ]    [ REST API Router (/api/*) ]
- /login    -> frontend/login/                  │
- /admin    -> frontend/admin/         ┌────────┴────────┐
- /employee -> frontend/employee/      ▼                 ▼
                                [ database.js ]   [ analytics.js ]
                                       │                 │
                                       ▼                 │
                         [ database/smartworkforce.db ] ◄┘
```

---

## 4. Security & Isolation Guarantees

1. **Zero Production Mutation in Tests:** `tests/test_persistence.js` points `DB_PATH` to an isolated temporary file (`tests/temp_test.db`) and asserts that `database/smartworkforce.db` size and timestamp remain untouched before and after test execution.
2. **Debounce Protection:** Scans received within 5 seconds at the same gate for the same badge are identified as duplicate reads and logged with zero state mutation.
3. **Directory Traversal Protection:** Static file resolution strictly checks path boundaries against the `frontend/` directory root.

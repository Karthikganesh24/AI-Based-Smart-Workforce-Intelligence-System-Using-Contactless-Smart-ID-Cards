# SmartWorkforce Intelligence System

> **AI-Powered Industrial Workforce Attendance & Presence Management System**  
> Native Node.js • Contactless Smart ID Cards (13.56 MHz HF/NFC & UHF RFID) • Persistent SQLite Storage

---

## 🏢 Overview

SmartWorkforce is an end-to-end industrial attendance tracking and workforce presence intelligence system. It models contactless smart badge presentations across facility checkpoints and provides real-time headcounts, shift punctuality ledgers, explainable absenteeism risk models, and gate sequence anomaly auditing.

### Key Highlights
- **Zero Third-Party Dependencies:** Built entirely with native Node.js standard libraries (`node:sqlite`, `node:http`, `node:fs`).
- **Multi-Portal Architecture:** Organized into dedicated portals for **Company Admin**, **Employees**, and **Authentication**.
- **Hardware-Free Simulation:** Built-in ESP32 & RFID terminal simulator with RF distance and RSSI telemetry simulation.
- **5-Second Fraud Protection:** Intelligent gate debounce engine prevents duplicate reads within 5 seconds.
- **High-Performance Persistence:** SQLite running in WAL mode with transactional atomicity for event logging and presence transitions.

---

## 📁 Project Directory Structure

```text
SmartWorkforce/
├── frontend/                     # Modern multi-portal frontend
│   ├── login/                    # Authentication & Company Registration Portal
│   │   ├── index.html            # Sign-in UI with Company Admin & Employee tabs
│   │   └── login.js              # Authentication controller & portal navigation
│   ├── admin/                    # Company Admin Operations Command Center
│   │   ├── index.html            # Presence KPIs, Roster, Virtual Simulator, Logs, AI Analytics
│   │   └── admin.js              # Admin UI controller, SVG chart builder, live sync
│   ├── employee/                 # Employee Self-Service Portal
│   │   ├── index.html            # Personal smart ID badge, presence indicator, punch station
│   │   └── employee.js           # Self-tap simulation controller & personal attendance log
│   ├── assets/                   # Static branding & photography
│   │   └── office_building.jpg   # Campus architecture hero image
│   └── shared/                   # Shared styles and client utilities
│       ├── css/
│       │   └── style.css         # Unified Design System tokens & responsive layout
│       └── js/
│           └── common.js         # Shared API client, Web Audio chimes, toast notifications
├── backend/                      # Backend application runtime
│   ├── server.js                 # Native HTTP server, multi-portal static router, REST API
│   └── analytics.js              # Heuristic workforce analytics & sequence anomaly engine
├── database/                     # SQLite persistence layer
│   ├── database.js               # Node.js DatabaseSync connection manager & query routines
│   ├── smartworkforce.db         # Persistent SQLite database (WAL mode, foreign keys)
│   └── schema.sql                # Complete SQLite DDL schema and index definitions
├── scripts/                      # Developer and hardware simulation utilities
│   └── simulate_esp32.js         # ESP32 Wi-Fi & RFID microcontroller terminal simulator
├── tests/                        # Automated quality assurance
│   └── test_persistence.js       # 38-step automated verification test suite
├── docs/                         # Technical documentation
│   ├── ARCHITECTURE.md           # Deep-dive architecture and data flow documentation
│   └── API.md                    # REST API endpoint reference and payload specifications
├── .backup_phase2/               # Preserved historical backup (inactive)
├── .gitignore                    # Excludes production DB files, secrets, and logs
├── package.json                  # Project manifest, entry point, and execution scripts
└── README.md                     # Getting started and operations guide
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version **22.5.0** or higher (tested with Node 22+ / 24+).
- **External Dependencies**: **None required**. No `npm install` needed.

### 1. Start the Application
```bash
npm start
```
By default, the server launches on port **3000** (or the next available port if in use).

Open your browser and navigate to:
- **Authentication Portal:** [http://localhost:3000/](http://localhost:3000/) or `/login`
- **Company Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)
- **Employee Portal:** [http://localhost:3000/employee](http://localhost:3000/employee)

---

## 🧪 Running Automated Tests

Run the complete 38-step test suite:
```bash
npm test
```
The test suite operates against an isolated temporary database (`tests/temp_test.db`) on an isolated test port (`3099`). The production database `database/smartworkforce.db` is strictly guaranteed to remain 100% untouched.

---

## 📡 Hardware & RFID Simulation

### Run the CLI ESP32 Simulator
Simulate an ESP32 micro-controller transmitting card scans over Wi-Fi:
```bash
# Single scan using a registered workforce card UID:
npm run simulate:esp32 -- --uid 7E:A1:39:B2

# Stream continuous scans across different facility gates:
npm run simulate:stream

# Test 5-second duplicate read debounce rejection:
node scripts/simulate_esp32.js --debounce-test

# Test rejection of unregistered smart cards:
node scripts/simulate_esp32.js --unknown-test
```

### In-Browser Virtual Simulator
Visit `/admin`, switch to the **RFID Terminal & Simulator** tab, and run:
1. **Single Scan:** Process an individual badge presentation with configurable simulated distance and RSSI signal strength.
2. **Burst Repeat Scan:** Test rapid successive taps to verify the 5-second debounce window.
3. **Unknown Card Test:** Present an unassigned badge UID and observe graceful 404 rejection with zero state change.
4. **Multi-Employee Rush Simulation:** Simulate a shift transition where multiple employees present cards in rapid sequence.

---

## 🗄️ Database Management

- **Database File:** Located at [`database/smartworkforce.db`](file:///k:/final%20project/SmartWorkforce/database/smartworkforce.db).
- **Reset to Clean Seed:**
  ```bash
  npm run reset-db
  ```
  *(Caution: Re-seeds employees to the initial 12 baseline records and attendance events).*

---

## 📖 Technical Documentation

- **Architecture Deep-Dive:** [`docs/ARCHITECTURE.md`](file:///k:/final%20project/SmartWorkforce/docs/ARCHITECTURE.md)
- **REST API Specifications:** [`docs/API.md`](file:///k:/final%20project/SmartWorkforce/docs/API.md)

---

## 📄 License
ISC License • SmartWorkforce Engineering Team

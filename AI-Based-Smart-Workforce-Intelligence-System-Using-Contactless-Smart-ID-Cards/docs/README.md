# SmartWorkforce — Documentation Suite

Welcome to the technical documentation library for **SmartWorkforce: AI-Based Smart Workforce Intelligence System Using Contactless Smart ID Cards**.

This directory houses technical specifications, architectural designs, API references, schema dictionaries, verification guides, and the comprehensive engineering project report.

---

## 📚 Documentation Index

| Section | Document | Description |
| :--- | :--- | :--- |
| **System Architecture** | [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Multi-tier architectural topology, security boundaries, multi-tenancy model, component interactions, and data flow pipelines. |
| **REST API Specification** | [api/API.md](api/API.md) | Exhaustive REST endpoint catalog, request/response contracts, authentication headers, error envelopes, and sample payloads. |
| **Database Schema** | [database/DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md) | Relational schema definitions, column constraints, indexing strategy, foreign key graphs, and recursive CTE query patterns. |
| **Testing & Quality Assurance** | [testing/TESTING_GUIDE.md](testing/TESTING_GUIDE.md) | Automated testing philosophy, suite execution commands, mock vs. live database isolation, and test suite matrix. |
| **IEEE Research Paper** | [IEEE_RESEARCH_PAPER.md](IEEE_RESEARCH_PAPER.md) | Publication-ready IEEE conference/journal manuscript covering BLE iBeacon spatial presence sensing, 40-50m room occupancy, recursive CTEs, and Explainable AI. |
| **Engineering Project Report** | [project-report/PROJECT_REPORT.md](project-report/PROJECT_REPORT.md) | Academic/engineering project report covering problem statement, system engineering, IoT integration, performance metrics, and societal impact. |
| **IoT & RFID Hardware** | [../hardware/README.md](../hardware/README.md) | ESP32 microcontroller specifications, RC522 RFID reader wiring schematics, LED/Buzzer circuits, and gateway simulation. |
| **Historical Archive** | [../archive/README.md](../archive/README.md) | Catalog of preserved phase backups, historical schema snapshots, and legacy diagnostic scripts. |

---

## 🏛️ System Overview

SmartWorkforce is an end-to-end enterprise solution bridging physical edge IoT hardware with cloud-ready enterprise management.

```
+-------------------------------------------------------------+
|                     Physical Edge Layer                     |
|  ESP32 MCU  +  MFRC522 (SPI)  +  Status LED / Active Buzzer |
+-------------------------------------------------------------+
                              |
                     HTTP POST /api/rfid-tap
                     (Shared Secret Header)
                              v
+-------------------------------------------------------------+
|                      Backend API Server                     |
|           Node.js (Native HTTP) + Session Auth Gate         |
+-------------------------------------------------------------+
      |                       |                       |
      v                       v                       v
+---------------+     +---------------+     +-----------------+
| Admin Portal  |     | Manager Portal|     | Employee Portal |
| (Vanillajs/CSS|     | (Team Matrix) |     | (Self-Service)  |
+---------------+     +---------------+     +-----------------+
                              |
                              v
+-------------------------------------------------------------+
|                     Data Persistence Layer                  |
|    SQLite (WAL Mode) + Recursive CTEs + Strict Isolation    |
+-------------------------------------------------------------+
```

---

## 🚀 Quick Navigation for Engineers & Reviewers

1. **New to the project?** Start with the [System Architecture](architecture/ARCHITECTURE.md) to understand how the system is structured.
2. **Developing frontend or API integrations?** Refer to the [REST API Specification](api/API.md) for full endpoint definitions.
3. **Database migrations or queries?** Review [Database Schema](database/DATABASE_SCHEMA.md) for table definitions and relational constraints.
4. **Verifying system stability?** Consult the [Testing Guide](testing/TESTING_GUIDE.md) and run `npm test`.
5. **Academic / Capstone evaluation?** Read the comprehensive [Engineering Project Report](project-report/PROJECT_REPORT.md).
6. **Setting up physical hardware?** Inspect [Hardware Guide](../hardware/README.md) for breadboard schematics and simulator usage.

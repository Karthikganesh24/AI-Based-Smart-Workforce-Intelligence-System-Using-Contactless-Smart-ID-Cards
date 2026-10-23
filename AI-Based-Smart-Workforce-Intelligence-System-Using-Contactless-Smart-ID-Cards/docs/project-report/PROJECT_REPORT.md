# AI-Based Smart Workforce Intelligence System Using Contactless Smart ID Cards

## Final-Year Engineering Project Technical Report

---

## 1. Abstract

Traditional enterprise attendance tracking systems rely heavily on manual logs, biometric fingerprint scanners, or facial recognition cameras. These legacy approaches suffer from hygiene bottlenecks, high false-rejection rates, vulnerability to spoofing, and significant privacy concerns. 

**SmartWorkforce** is an intelligent, privacy-preserving workforce presence and facility access management system built around **Contactless Smart ID Cards** (13.56 MHz High-Frequency NFC and Ultra-High-Frequency RFID). Developed using native Node.js and persistent SQLite storage, the system combines real-time turnstile telemetry with an explainable AI analytics engine to monitor facility occupancy, compute shift punctuality ledgers, evaluate absenteeism risk factors, and audit gate sequence discrepancies. 

The architecture features a native multi-tenant data layer, dynamic organizational hierarchies with recursive Common Table Expressions (CTEs), fine-grained Role-Based Access Control (RBAC), and dedicated portals for Company Administrators, Employees, and Managers.

---

## 2. Problem Statement & Motivation

Industrial facilities, manufacturing plants, and modern corporate campuses face distinct workforce management challenges:
1. **Throughput Bottlenecks**: Contact-based fingerprint readers create physical congestion at facility gates during peak shift changes.
2. **Privacy & Legal Liabilities**: Camera-based biometric facial recognition poses severe compliance risks under global data protection regulations (GDPR, ISO 27701).
3. **Ghost Presence & Tailgating**: Simple barcode or unauthenticated punch cards enable fraudulent buddy punching.
4. **Data Isolation in Multi-Tenant Environments**: Traditional systems are single-tenant or lack strict cryptographic boundary enforcement between business units.

**SmartWorkforce** resolves these issues by using cryptographically unique smart badge UIDs, intelligent 5-second gate debounce windows, hardware-free simulation telemetry, and multi-tenant isolation.

---

## 3. System Architecture & Methodology

The system is constructed across three decoupled architectural tiers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (HTML5/CSS3/ES6)              │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌────────────────┐ │
│  │ Authentication Portal│  │ Admin Command Ctr │  │ Employee/Team  │ │
│  │       (/login)       │  │      (/admin)      │  │  (/employee)   │ │
│  └──────────────────────┘  └────────────────────┘  └────────────────┘ │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ HTTP/REST (JSON, Cookies, CSRF)
┌────────────────────────────────────▼───────────────────────────────────┐
│                      APPLICATION SERVICES (Native Node.js)             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ server.js: HTTP Server, Static Asset Delivery & REST API Router  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ auth.js: Scrypt Crypto, Session Mgmt & Temporary Password Rule   │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │ analytics.js: Absenteeism Risks, Punctuality & Anomaly Detection │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────▲───────────────────────────────────┘
                                     │ SQLite DatabaseSync API (WAL Mode)
┌────────────────────────────────────▼───────────────────────────────────┐
│                      DATA PERSISTENCE TIER (SQLite)                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Multi-Tenant Schema: companies, employees, org_units, accounts   │  │
│  │ Recursive CTE Lineage: getReportingChain & getRecursiveSubs      │  │
│  │ Atomic Transactional Integrity: recordCardScan with 5s Debounce  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Contactless Smart Badge Integration
Each physical employee badge embeds a high-frequency passive transponder (MFRC522/PN532). The ESP32 gateway node reads the transponder's 4-byte or 7-byte hexadecimal UID over SPI/I2C and transmits it to the backend REST API over Wi-Fi.

### 3.2 5-Second Fraud Protection Engine (Debounce)
To eliminate duplicate reads caused by accidental proximity taps or reader oscillation, the system enforces a 5-second sliding debounce window. If the same card UID is detected at the same gate within 5,000 milliseconds of the last event, the read is flagged as `DUPLICATE_READ_PROTECTION`, discarded from status mutations, and logged to session metrics without polluting permanent attendance history.

### 3.3 Explainable AI Workforce Intelligence Models
- **Absenteeism Risk Heuristic**: Evaluates historical presence ratios, consecutive absence days, shift punctuality consistency, and anomaly frequencies to assign a risk score (`LOW`, `MEDIUM`, `HIGH`) with documented human-interpretable factors.
- **Sequence Discrepancy Auditing**: Detects unpaired facility transitions (`UNPAIRED_ENTRY`, `UNPAIRED_EXIT`) without accusatory misconduct labels, enabling physical security to inspect gate telemetry.

---

## 4. Multi-Tenant Organizational Hierarchy

The system models complex enterprise corporate governance:
1. **Organizational Levels**: User-defined tiers (`Executive`, `Department Head`, `Team Lead`, `Staff`).
2. **Organizational Units**: Self-referencing tree nodes (`Division`, `Department`, `Team`) with manager assignments and parent-child linkage.
3. **Dynamic Job Titles**: Company-scoped designations decoupled from permissions.
4. **Granular Scoped RBAC**: Permissions mapped to scopes (`SELF`, `DIRECT_REPORTS`, `DESCENDANTS`, `DEPARTMENT`, `COMPANY`).
5. **Cycle-Safe Reporting Traversal**:
   - `getReportingChain`: Upward recursive CTE generating top-down lineage breadcrumbs (`Leadership ➔ Director ➔ Lead ➔ Current Employee`).
   - `getRecursiveSubordinates`: Downward recursive CTE evaluating entire descendant reporting trees.
   - Anti-Cycle Validation: Rejects self-reporting (`A -> A`) and multi-level cyclical dependencies (`A -> B -> C -> A`).

---

## 5. Security & Boundary Defenses

- **Scrypt Password Hashing**: Passwords hashed using Node's native `crypto.scryptSync` with unique 16-byte random salts.
- **Temporary Password Rule**: Server generates reproducible temporary passwords (`First 4 letters of name + Last 4 digits of phone`) enforcing mandatory password change upon initial login.
- **Session Protection**: HttpOnly Lax session cookies with separate anti-CSRF token verification on all state-changing endpoints.
- **Zero Existence Disclosure**: Cross-tenant resource queries return `404 Not Found` rather than `403 Forbidden` to prevent adversarial tenant enumeration.
- **Zero Credential Exposure**: API responses are audited to guarantee that password hashes and salts are never leaked.

---

## 6. Implementation & Experimental Results

The SmartWorkforce application was validated through an automated testing suite comprising **346 distinct test assertions** across 9 test suites:

| Milestone / Subsystem | Test Assertions | Result |
| :--- | :---: | :---: |
| Password Rule & Contact Normalization | 14 | **100% PASS** |
| Admin Password Reset Mechanics | 11 | **100% PASS** |
| Core Persistence & Analytics | 84 | **100% PASS** |
| Employee CRUD & Soft-Delete Archiving | 31 | **100% PASS** |
| Organizational Tree & CTE Lineage | 41 | **100% PASS** |
| REST API & Backend Access Control | 67 | **100% PASS** |
| Admin Frontend DOM Contracts | 34 | **100% PASS** |
| Employee & Manager Portal Integration | 36 | **100% PASS** |
| System Integration & Security Defenses | 28 | **100% PASS** |
| **Complete System Verification** | **346** | **100% PASS** |

Production database immutability was maintained at **294,912 bytes** throughout all verification cycles.

---

## 7. Conclusion & Future Scope

SmartWorkforce demonstrates that a high-performance, enterprise-grade workforce intelligence system can be constructed using native Node.js and persistent SQLite storage without external framework dependencies. The system provides immediate physical facility security, hygienic contactless throughput, explainable workforce insights, and strict multi-tenant corporate privacy.

Future enhancements include WebSocket push notifications for sub-second live presence streaming and automated CI/CD Playwright visual regression testing.

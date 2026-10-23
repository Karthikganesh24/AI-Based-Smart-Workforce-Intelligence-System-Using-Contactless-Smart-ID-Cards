# SmartWorkforce REST API Specification

The SmartWorkforce backend exposes a high-performance REST API over HTTP with JSON payloads.

---

## 1. Employee Management

### `GET /api/employees`
Returns a list of all enrolled workforce members.

**Response `200 OK`:**
```json
[
  {
    "id": "EMP-101",
    "name": "Aravind Kumar",
    "department": "Production",
    "role": "CNC Lead Operator",
    "uid": "7E:A1:39:B2",
    "status": "OUTSIDE",
    "lastSeen": "03:58:28 PM",
    "avatarBg": "#0284C7"
  }
]
```

### `POST /api/employees`
Enrolls a new workforce member and assigns an RFID Smart Card UID.

**Request Body:**
```json
{
  "id": "EMP-113",
  "name": "Rahul Sharma",
  "department": "Production",
  "role": "PLC Programmer",
  "uid": "8A:4F:19:CE",
  "avatarBg": "#0284C7"
}
```

**Response `201 Created`:**
Returns the newly created employee object.

**Error Responses:**
- `400 Bad Request`: Missing required fields.
- `409 Conflict`: Duplicate Employee ID or Smart Card UID already assigned.

---

## 2. Attendance & Smart Card Telemetry

### `GET /api/attendance/logs`
Retrieves chronological card scan transactions.

**Response `200 OK`:**
```json
[
  {
    "id": "LOG-1001",
    "timestamp": "2026-10-10 08:35:40",
    "empId": "EMP-108",
    "empName": "Karthik Raja",
    "department": "Maintenance",
    "eventType": "ENTRY",
    "gate": "Gate 04 - Maintenance Workshop Gate",
    "status": "VERIFIED"
  }
]
```

### `POST /api/attendance/scan`
Processes a contactless badge presentation (simulated or hardware-originated).

**Request Body:**
```json
{
  "uid": "7E:A1:39:B2",
  "gate": "Gate 01 - Main Turnstile",
  "mode": "AUTO",
  "deviceId": "ESP32-GATEWAY-A1",
  "simulatedDistance": 1.2,
  "simulatedRssi": -58
}
```

**Parameters:**
- `uid` *(string, required if no `empId`)*: 13.56 MHz HF or UHF card identifier.
- `empId` *(string, optional backward-compatibility fallback)*: Employee ID.
- `gate` *(string, optional)*: Checkpoint descriptor (default: `"Gate 01 - Main Facility Turnstile"`).
- `mode` *(string, optional)*: `"AUTO"` (toggles state), `"ENTRY"` (forces entrance), or `"EXIT"` (forces exit).
- `deviceId` *(string, optional)*: Gateway micro-controller identifier.
- `simulatedDistance` *(number, optional)*: Distance in meters from antenna.
- `simulatedRssi` *(number, optional)*: Signal strength in dBm.

**Response `200 OK` (Accepted):**
```json
{
  "ignored": false,
  "event": {
    "id": "LOG-1028",
    "timestamp": "2026-10-13 12:45:00",
    "empId": "EMP-101",
    "empName": "Aravind Kumar",
    "department": "Production",
    "eventType": "ENTRY",
    "gate": "Gate 01 - Main Turnstile",
    "status": "VERIFIED"
  },
  "employee": {
    "id": "EMP-101",
    "status": "INSIDE",
    "lastSeen": "12:45:00 PM"
  }
}
```

**Response `200 OK` (Debounced):**
```json
{
  "ignored": true,
  "reason": "DUPLICATE_READ_PROTECTION",
  "message": "Repeated card read ignored for Aravind Kumar (EMP-101) at Gate 01. Debounce window: 5s.",
  "debounceMs": 5000,
  "timeRemainingMs": 3420
}
```

**Error Responses:**
- `400 Bad Request`: Invalid identifier format or invalid mode.
- `401 Unauthorized`: Missing or invalid `X-Gateway-Key` header when key authentication is enforced.
- `404 Not Found`: Smart Card UID is not assigned to any enrolled workforce member.

### `DELETE /api/attendance/logs`
Clears attendance event history without affecting enrolled employees.

---

## 3. Workforce Analytics & Intelligence

### `GET /api/analytics/overview`
High-level summary of headcount, on-time percentage, department counts, risk tallies, and gate anomalies.

### `GET /api/analytics/departments`
Department-by-department attendance headcount, inside ratio, and punctuality matrix.

### `GET /api/analytics/punctuality`
Late arrivals (after 09:15 AM), early departures (before 05:00 PM), and overtime hours ledger.

### `GET /api/analytics/risks`
Transparent, heuristic absenteeism risk factors and scores (0–100) based on verified attendance consistency.

### `GET /api/analytics/anomalies`
Audit log of gate sequence discrepancies (e.g. consecutive entries without exits, rapid transitions between non-adjacent portals).

---

## 4. Virtual Simulation Metrics

### `GET /api/simulation/report`
Audit metrics for the active simulation session (attempts, accepted scans, debounced reads, unknown card rejections, sequence anomalies).

### `DELETE /api/simulation/report`
Safely resets in-memory simulation run metrics to zero without touching persistent database records.

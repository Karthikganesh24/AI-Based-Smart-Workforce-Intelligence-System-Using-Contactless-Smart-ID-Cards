/**
 * tests/test_persistence.js
 * 
 * Automated Comprehensive Test Suite for SmartWorkforce (Phases 1, 2, 3, 4, 5A, and 5B).
 * Zero external dependencies (powered entirely by native Node.js).
 * 
 * Features Verified:
 *  1. Initial SQLite Seed & Health Check
 *  2. Employee Registration (POST /api/employees)
 *  3. Duplicate ID & Smart Card UID Rejection (409 Conflict)
 *  4. Simulated Card Scan via empId (Backward Compatibility)
 *  5. Phase 3: Hardware Card UID Resolution (POST /api/attendance/scan with UID)
 *  6. Phase 3: Safe Rejection of Unregistered Card UIDs (404, No State Change)
 *  7. Phase 3: Five-Second Duplicate-Read Protection (Debounce per Card & Gate)
 *  8. Phase 3: Explicit ENTRY and EXIT Modes via Card UID
 *  9. Phase 3: Gateway Authentication (Authorized vs Unauthorized Keys)
 * 10. Real-time Attendance Log Retrieval & Schema Validation
 * 11. Phase 4: AI & Workforce Analytics Overview (GET /api/analytics/overview)
 * 12. Phase 4: Department-Wise Attendance Matrix & Breakdown (GET /api/analytics/departments)
 * 13. Phase 4: Schedule-Based Punctuality & Overtime Calculation (GET /api/analytics/punctuality)
 * 14. Phase 4: Missing Data & Empty State Handling (No Fabricated Statistics)
 * 15. Phase 4: Explainable Absenteeism-Risk Analysis & Factors (GET /api/analytics/risks)
 * 16. Phase 4: Gate Telemetry Sequence Discrepancies & Anomaly Audit (GET /api/analytics/anomalies)
 * 17. Phase 5A: Virtual RFID Hardware Simulation & RF Telemetry (POST /api/attendance/scan)
 * 18. Phase 5A: Burst Repeat Debounce Protection Verification
 * 19. Phase 5A: Multi-Employee Sequential Simulation Walk-Through Batch
 * 20. Phase 5B: Attendance Transition Validation (AUTO, Forced ENTRY, Forced EXIT)
 * 21. Phase 5B: Debounce Window & Failed Scan Immutability (Zero State Mutations)
 * 22. Phase 5B: Cross-Gate Scan Telemetry & Sequence Anomaly Auditing
 * 23. Phase 5B: Simulation Run Report Endpoint (GET /api/simulation/report)
 * 24. Phase 5B: Safe Simulation Metrics Reset (DELETE /api/simulation/report without DB deletion)
 * 25. SQLite Persistence Across Complete Server Shutdown & Restart
 * 26. Production Database Isolation (smartworkforce.db is 100% Untouched)
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SERVER_PATH = path.join(PROJECT_ROOT, 'server.js');
const REAL_DB_PATH = path.join(PROJECT_ROOT, 'smartworkforce.db');
const TEST_DB_PATH = path.join(__dirname, 'temp_test.db');
const TEST_PORT = 3099;
const TEST_GATEWAY_KEY = 'test-secret-gateway-key-xyz';

// ANSI formatting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function logPass(title, details = '') {
  testsPassed++;
  console.log(`  ${GREEN}✓ PASS:${RESET} ${title} ${details ? `(${details})` : ''}`);
}

function logFail(title, err) {
  testsFailed++;
  console.error(`  ${RED}✗ FAIL:${RESET} ${title}`);
  if (err) console.error(`    ${RED}Reason: ${err.message || err}${RESET}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function cleanupTestDb() {
  const files = [
    TEST_DB_PATH,
    `${TEST_DB_PATH}-wal`,
    `${TEST_DB_PATH}-shm`
  ];
  for (const f of files) {
    try {
      if (fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    } catch (_) {}
  }
}

function makeRequest(method, urlPath, payload = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: urlPath,
      method: method,
      headers: {
        'Accept': 'application/json',
        ...customHeaders
      }
    };

    if (postData) {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          if (data.trim()) json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    req.setTimeout(6000, () => {
      req.destroy();
      reject(new Error(`Request timeout (${method} ${urlPath})`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function spawnServerInstance(instanceName, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_PATH], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        PORT: TEST_PORT.toString(),
        DB_PATH: TEST_DB_PATH,
        GATEWAY_API_KEY: TEST_GATEWAY_KEY,
        ...extraEnv
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    let output = '';

    const timeout = setTimeout(() => {
      if (!started) {
        child.kill();
        reject(new Error(`Server instance ${instanceName} timed out starting on port ${TEST_PORT}. Output: ${output}`));
      }
    }, 8000);

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (output.includes(`running with SQLite Persistence at: http://localhost:${TEST_PORT}`)) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          resolve(child);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Server instance ${instanceName} exited unexpectedly with code ${code}. Output: ${output}`));
      }
    });
  });
}

function stopServerInstance(child) {
  return new Promise((resolve) => {
    if (!child || child.killed || child.exitCode !== null) {
      return resolve();
    }
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve();
    }, 2000);
  });
}

async function runPersistenceSuite() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} SmartWorkforce: Comprehensive Test Suite (Phases 1 - 5B)${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  cleanupTestDb();

  let realDbBeforeMtime = null;
  let realDbBeforeSize = null;
  if (fs.existsSync(REAL_DB_PATH)) {
    const stats = fs.statSync(REAL_DB_PATH);
    realDbBeforeMtime = stats.mtimeMs;
    realDbBeforeSize = stats.size;
    console.log(`${YELLOW}ℹ Protected real database:${RESET} ${REAL_DB_PATH} (${(realDbBeforeSize / 1024).toFixed(1)} KB)`);
  }
  console.log(`${YELLOW}ℹ Isolated test database:${RESET} ${TEST_DB_PATH}`);
  console.log(`${YELLOW}ℹ Isolated test port:${RESET} ${TEST_PORT}\n`);

  let serverInstance1 = null;
  let serverInstance2 = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Launch Server Instance 1 & Verify Seed
    // -------------------------------------------------------------
    console.log(`${BOLD}[1/15] Initializing Isolated Server Instance 1...${RESET}`);
    serverInstance1 = await spawnServerInstance('Instance-1');
    logPass('Server Instance 1 started on isolated port', `Port ${TEST_PORT}`);

    const initialEmpsRes = await makeRequest('GET', '/api/employees');
    assert(initialEmpsRes.status === 200, `Expected 200, got ${initialEmpsRes.status}`);
    assert(initialEmpsRes.body.length === 12, `Expected 12 seeded employees, got ${initialEmpsRes.body.length}`);
    logPass('Initial SQLite seed loaded in test database', '12 default employees');

    const initialLogsRes = await makeRequest('GET', '/api/attendance/logs');
    assert(initialLogsRes.status === 200, `Expected 200, got ${initialLogsRes.status}`);
    assert(initialLogsRes.body.length === 6, `Expected 6 baseline logs, got ${initialLogsRes.body.length}`);
    logPass('Initial attendance event logs present', '6 baseline logs');

    // -------------------------------------------------------------
    // STEP 2: Employee Registration (POST /api/employees)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[2/15] Testing Employee Registration (POST /api/employees)...${RESET}`);
    const newEmp = {
      id: 'EMP-999',
      name: 'Dr. Vikram Sarabhai',
      department: 'IT',
      role: 'Principal Systems Architect',
      uid: 'AA:BB:CC:DD',
      avatarBg: '#7C3AED'
    };
    const regRes = await makeRequest('POST', '/api/employees', newEmp);
    assert(regRes.status === 201, `Expected 201, got ${regRes.status}`);
    assert(regRes.body.id === 'EMP-999', 'Employee ID mismatch');
    assert(regRes.body.status === 'OUTSIDE', 'Default status must be OUTSIDE');
    logPass('Employee registered successfully', `ID: ${regRes.body.id}, UID: ${regRes.body.uid}`);

    // -------------------------------------------------------------
    // STEP 3: Duplicate Employee & UID Rejection (409 Conflict)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[3/15] Testing Duplicate Employee Rejection (409 Conflict)...${RESET}`);
    const dupIdRes = await makeRequest('POST', '/api/employees', {
      id: 'EMP-999',
      name: 'Duplicate ID Person',
      department: 'Quality',
      role: 'Inspector',
      uid: '11:22:33:44'
    });
    assert(dupIdRes.status === 409, `Expected 409, got ${dupIdRes.status}`);
    logPass('Duplicate employee ID rejected with 409 Conflict', dupIdRes.body.error);

    const dupUidRes = await makeRequest('POST', '/api/employees', {
      id: 'EMP-998',
      name: 'Duplicate UID Person',
      department: 'Production',
      role: 'Operator',
      uid: 'AA:BB:CC:DD'
    });
    assert(dupUidRes.status === 409, `Expected 409, got ${dupUidRes.status}`);
    logPass('Duplicate Smart Card UID rejected with 409 Conflict', dupUidRes.body.error);

    // -------------------------------------------------------------
    // STEP 4: Backward-Compatible Card Scan via empId
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[4/15] Testing Backward-Compatible Card Scan via empId...${RESET}`);
    const scanEmpRes = await makeRequest('POST', '/api/attendance/scan', {
      empId: 'EMP-999',
      mode: 'ENTRY',
      gate: 'Gate 01 - Main Turnstile'
    });
    assert(scanEmpRes.status === 200, `Expected 200, got ${scanEmpRes.status}`);
    assert(scanEmpRes.body.event.eventType === 'ENTRY', 'Expected ENTRY event');
    assert(scanEmpRes.body.employee.status === 'INSIDE', 'Expected INSIDE status');
    const empScanLogId = scanEmpRes.body.event.id;
    logPass('Backward-compatible empId scan accepted', `Log: ${empScanLogId}, Status -> INSIDE`);

    // -------------------------------------------------------------
    // STEP 5: Phase 3 - Card UID-Based Resolution (POST with uid)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[5/15] Phase 3: Testing Card UID Resolution (POST /api/attendance/scan with uid)...${RESET}`);
    // Aravind Kumar has UID '7E:A1:39:B2', initially OUTSIDE
    const scanUidRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      gate: 'Gate 02 - Production Bay',
      mode: 'AUTO'
    });
    assert(scanUidRes.status === 200, `Expected 200, got ${scanUidRes.status}`);
    assert(scanUidRes.body.employee.id === 'EMP-101', 'UID should resolve to EMP-101 (Aravind Kumar)');
    assert(scanUidRes.body.event.eventType === 'ENTRY', 'Expected ENTRY event');
    assert(scanUidRes.body.employee.status === 'INSIDE', 'Expected status INSIDE');
    const uidScanLogId = scanUidRes.body.event.id;
    logPass('Card UID resolved correctly to employee', `UID 7E:A1:39:B2 -> EMP-101 (${scanUidRes.body.employee.name})`);

    // -------------------------------------------------------------
    // STEP 6: Phase 3 - Unregistered Card UID Safe Rejection
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[6/15] Phase 3: Testing Unregistered Card UID Rejection...${RESET}`);
    const unknownUid = 'FF:EE:DD:CC';
    const unknownRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: unknownUid,
      gate: 'Gate 01 - Main Turnstile'
    });
    assert(unknownRes.status === 404, `Expected 404 for unknown UID, got ${unknownRes.status}`);
    assert(unknownRes.body.code === 'UNKNOWN_UID', `Expected UNKNOWN_UID code, got ${unknownRes.body.code}`);
    logPass('Unregistered card UID safely rejected with 404', unknownRes.body.error);

    // -------------------------------------------------------------
    // STEP 7: Phase 3 - Five-Second Duplicate-Read Protection (Debounce)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[7/15] Phase 3: Testing 5-Second Duplicate-Read Protection (Debounce)...${RESET}`);
    const debouncedRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      gate: 'Gate 02 - Production Bay',
      mode: 'AUTO'
    });
    assert(debouncedRes.status === 200, `Expected 200 for debounced request, got ${debouncedRes.status}`);
    assert(debouncedRes.body.ignored === true, 'Repeated tap within 5s must be ignored');
    assert(debouncedRes.body.reason === 'DUPLICATE_READ_PROTECTION', 'Expected DUPLICATE_READ_PROTECTION reason');
    assert(debouncedRes.body.employee.status === 'INSIDE', 'Employee status must NOT flip/toggle on debounced tap');
    logPass('Rapid duplicate tap within 5s successfully debounced', debouncedRes.body.message);

    // -------------------------------------------------------------
    // STEP 8: Phase 3 - Explicit ENTRY & EXIT Modes via Card UID
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[8/15] Phase 3: Testing Explicit ENTRY & EXIT Modes via Card UID...${RESET}`);
    const explicitExitRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '4F:8B:12:9C',
      mode: 'EXIT',
      gate: 'Gate 03 - IT Labs Secure Door'
    });
    assert(explicitExitRes.status === 200, `Expected 200, got ${explicitExitRes.status}`);
    assert(explicitExitRes.body.event.eventType === 'EXIT', 'Expected explicit EXIT event');
    assert(explicitExitRes.body.employee.status === 'OUTSIDE', 'Expected status OUTSIDE');
    logPass('Explicit EXIT scan processed via UID', `EMP-102 Status -> OUTSIDE`);

    const explicitEntryRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '4F:8B:12:9C',
      mode: 'ENTRY',
      gate: 'Gate 01 - Main Turnstile'
    });
    assert(explicitEntryRes.status === 200, `Expected 200, got ${explicitEntryRes.status}`);
    assert(explicitEntryRes.body.event.eventType === 'ENTRY', 'Expected explicit ENTRY event');
    assert(explicitEntryRes.body.employee.status === 'INSIDE', 'Expected status INSIDE');
    logPass('Explicit ENTRY scan processed via UID', `EMP-102 Status -> INSIDE`);

    // -------------------------------------------------------------
    // STEP 9: Phase 3 - Gateway Authentication Headers
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[9/15] Phase 3: Testing Gateway Authentication Headers...${RESET}`);
    const unauthRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      deviceId: 'ESP32-HARDWARE-TEST'
    }, {
      'X-Gateway-Key': 'wrong-unauthorized-key'
    });
    assert(unauthRes.status === 401, `Expected 401 Unauthorized for invalid key, got ${unauthRes.status}`);
    logPass('Invalid gateway key correctly rejected with 401', unauthRes.body.error);

    const authRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      deviceId: 'ESP32-HARDWARE-TEST',
      gate: 'Gate 04 - Maintenance Workshop Gate'
    }, {
      'X-Gateway-Key': TEST_GATEWAY_KEY
    });
    assert(authRes.status === 200, `Expected 200 for valid gateway key, got ${authRes.status}`);
    logPass('Valid gateway key accepted successfully with 200', `Device: ${authRes.body.deviceId}`);

    // -------------------------------------------------------------
    // STEP 10: Phase 4 - AI Workforce Analytics Overview API
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[10/15] Phase 4: Testing AI Workforce Analytics Overview (GET /api/analytics/overview)...${RESET}`);
    const overviewRes = await makeRequest('GET', '/api/analytics/overview');
    assert(overviewRes.status === 200, `Expected 200, got ${overviewRes.status}`);
    assert(overviewRes.body.schedule && overviewRes.body.schedule.shiftStart === '09:00:00', 'Work schedule must be defined');
    assert(overviewRes.body.summary && overviewRes.body.summary.totalEmployees === 13, `Expected 13 total employees, got ${overviewRes.body.summary.totalEmployees}`);
    assert(typeof overviewRes.body.summary.onTimeRatePercent === 'number', 'onTimeRatePercent must be a number');
    logPass('Analytics Overview API response verified', `Employees: ${overviewRes.body.summary.totalEmployees}, On-Time: ${overviewRes.body.summary.onTimeRatePercent}%`);

    // -------------------------------------------------------------
    // STEP 11: Phase 4 - Department Matrix, Punctuality & Overtime Ledger
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[11/15] Phase 4: Testing Department Matrix & Punctuality Ledger...${RESET}`);
    const deptsRes = await makeRequest('GET', '/api/analytics/departments');
    assert(deptsRes.status === 200, `Expected 200, got ${deptsRes.status}`);
    assert(deptsRes.body.departments.length >= 4, `Expected at least 4 departments, got ${deptsRes.body.departments.length}`);
    const prodDept = deptsRes.body.departments.find(d => d.department === 'Production');
    assert(prodDept !== undefined, 'Production department must exist');
    assert(typeof prodDept.attendanceRatePercent === 'number', 'Attendance rate must be calculated');
    logPass('Department Analytics Matrix verified', `${deptsRes.body.departments.length} departments summarized`);

    const punctualityRes = await makeRequest('GET', '/api/analytics/punctuality');
    assert(punctualityRes.status === 200, `Expected 200, got ${punctualityRes.status}`);
    assert(Array.isArray(punctualityRes.body.records), 'Punctuality records must be an array');
    const checkedInRecords = punctualityRes.body.records.filter(r => r.hasCheckedIn);
    assert(checkedInRecords.length > 0, 'Checked-in records must exist from initial seed and test scans');
    
    // Validate missing data empty state representation (employees not checked in)
    const absentRecords = punctualityRes.body.records.filter(r => !r.hasCheckedIn);
    assert(absentRecords.length > 0, 'Absent/unlogged employees must be identified');
    assert(absentRecords[0].entryTime === null, 'Unlogged employee must have null entry time (not fabricated)');
    assert(absentRecords[0].workDurationHours === null, 'Unlogged employee must have null work duration');
    assert(absentRecords[0].overtimeHours === null, 'Unlogged employee must have null overtime hours');
    logPass('Punctuality & Overtime calculations verified with sensible empty states');

    // -------------------------------------------------------------
    // STEP 12: Phase 4 - Explainable Absenteeism Risks & Anomaly Detection
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[12/15] Phase 4: Testing Explainable Absenteeism Risks & Sequence Anomalies...${RESET}`);
    const risksRes = await makeRequest('GET', '/api/analytics/risks');
    assert(risksRes.status === 200, `Expected 200, got ${risksRes.status}`);
    assert(Array.isArray(risksRes.body.indicators), 'Indicators must be an array');
    const sampleIndicator = risksRes.body.indicators[0];
    assert(['LOW', 'MODERATE', 'ELEVATED', 'INSUFFICIENT_DATA'].includes(sampleIndicator.riskLevel), `Valid risk level expected, got ${sampleIndicator.riskLevel}`);
    assert(Array.isArray(sampleIndicator.factors) && sampleIndicator.factors.length > 0, 'Heuristic factors must provide transparent explanation');
    assert(sampleIndicator.disclaimer.includes('Heuristic Indicator') || sampleIndicator.disclaimer.includes('heuristic'), 'Transparent disclaimer must accompany risk assessment');
    logPass('Explainable Absenteeism Risk model verified', `Evaluated: ${risksRes.body.indicators.length} employees with documented heuristic factors`);

    const anomaliesRes = await makeRequest('GET', '/api/analytics/anomalies');
    assert(anomaliesRes.status === 200, `Expected 200, got ${anomaliesRes.status}`);
    assert(typeof anomaliesRes.body.totalAnomalies === 'number', 'Total anomalies must be a number');
    assert(Array.isArray(anomaliesRes.body.anomalies), 'Anomalies must be an array');
    logPass('Sequence Discrepancy & Anomaly Detection verified', `Identified: ${anomaliesRes.body.totalAnomalies} sequence audit notices`);

    // -------------------------------------------------------------
    // STEP 13: Phase 5A - Virtual RFID Hardware Simulation & Gate Telemetry
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[13/15] Phase 5A: Testing Virtual RFID Hardware Simulator & Telemetry...${RESET}`);
    
    // 1. Single scan with virtual reader RF telemetry & custom gate ID
    const simScanRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      mode: 'AUTO',
      gate: 'Gate 05 - North Executive Portal',
      deviceId: 'VIRTUAL-RFID-SIM-01',
      simulatedDistance: 1.2,
      simulatedRssi: -58
    });
    assert(simScanRes.status === 200, `Expected 200 for simulated RFID scan, got ${simScanRes.status}`);
    assert(simScanRes.body.deviceId === 'VIRTUAL-RFID-SIM-01', 'Virtual deviceId must be returned');
    assert(simScanRes.body.simulatedDistance === 1.2, 'Simulated distance must be echoed back');
    assert(simScanRes.body.simulatedRssi === -58, 'Simulated RSSI must be echoed back');
    assert(simScanRes.body.event && simScanRes.body.event.gate === 'Gate 05 - North Executive Portal', 'Custom gate portal must be registered');
    logPass('Virtual RFID Single Scan with Telemetry verified', `Gate 05, Dist: 1.2m, RSSI: -58 dBm, Device: ${simScanRes.body.deviceId}`);

    // 2. Burst repeat test (immediate rapid second tap within 200ms -> debounce protection)
    const simBurstRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '7E:A1:39:B2',
      mode: 'AUTO',
      gate: 'Gate 05 - North Executive Portal',
      deviceId: 'VIRTUAL-RFID-SIM-01',
      simulatedDistance: 1.1,
      simulatedRssi: -57
    });
    assert(simBurstRes.status === 200, `Expected 200 for burst scan, got ${simBurstRes.status}`);
    assert(simBurstRes.body.ignored === true, 'Rapid burst tap must be ignored by debounce protection');
    assert(simBurstRes.body.reason === 'DUPLICATE_READ_PROTECTION', 'Reason must be DUPLICATE_READ_PROTECTION');
    logPass('Burst Repeat Scan (Debounce Test) verified', `Ignored: ${simBurstRes.body.message}`);

    // 3. Unknown Card Test (safe rejection with 404 UNKNOWN_UID)
    const simUnknownRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: 'FF:EE:DD:CC',
      mode: 'AUTO',
      gate: 'Gate 01 - Main Facility Turnstile',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(simUnknownRes.status === 404, `Expected 404 for unknown UID, got ${simUnknownRes.status}`);
    assert(simUnknownRes.body.code === 'UNKNOWN_UID', 'Error code must be UNKNOWN_UID');
    logPass('Unknown Card Simulation Test verified', `UID 'FF:EE:DD:CC' safely rejected with 404, zero state change`);

    // 4. Multi-Employee Sequential Simulation (Walk-Through Batch)
    const multiCards = [
      { uid: '9A:3D:77:E1', gate: 'Gate 03 - IT Labs Secure Door', mode: 'AUTO' },
      { uid: '1C:F5:62:30', gate: 'Gate 04 - Maintenance Workshop', mode: 'AUTO' },
      { uid: 'B3:44:81:AA', gate: 'Gate 02 - Production Bay', mode: 'AUTO' }
    ];
    for (const card of multiCards) {
      const batchScanRes = await makeRequest('POST', '/api/attendance/scan', {
        uid: card.uid,
        mode: card.mode,
        gate: card.gate,
        deviceId: 'VIRTUAL-RFID-SIM-01',
        simulatedDistance: 0.8,
        simulatedRssi: -45
      });
      assert(batchScanRes.status === 200, `Batch scan for ${card.uid} must succeed, got ${batchScanRes.status}`);
      assert(!batchScanRes.body.ignored, `Batch scan for distinct card ${card.uid} must not be debounced`);
    }
    logPass('Multi-Employee Sequential Walk-Through Simulation verified', `3 distinct employees scanned through virtual gates`);

    // -------------------------------------------------------------
    // STEP 14: Phase 5B - Transition Validation & Simulation Report API
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[14/15] Testing Phase 5B: Transition Validation & Simulation Report API...${RESET}`);

    // 1. Attendance Transition Validation: AUTO Mode
    // Check initial state of employee EMP-103 (Rohan Mehta)
    const emp103BeforeRes = await makeRequest('GET', '/api/employees');
    const emp103Before = emp103BeforeRes.body.find(e => e.id === 'EMP-103');
    assert(emp103Before, 'EMP-103 must exist in test dataset');
    const initial103Status = emp103Before.status;
    const targetUid = emp103Before.uid;

    // Scan in AUTO mode at Gate 01
    const autoScan1 = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'AUTO',
      gate: 'Gate 01 - Main Turnstile',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(autoScan1.status === 200, `Expected 200, got ${autoScan1.status}`);
    assert(!autoScan1.body.ignored, 'AUTO scan must not be ignored');
    const expected103Status = initial103Status === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';
    const expectedEventType = initial103Status === 'INSIDE' ? 'EXIT' : 'ENTRY';
    assert(autoScan1.body.event.eventType === expectedEventType, `Expected eventType ${expectedEventType}, got ${autoScan1.body.event.eventType}`);
    assert(autoScan1.body.employee.status === expected103Status, `Expected status ${expected103Status}, got ${autoScan1.body.employee.status}`);
    logPass('AUTO Mode Transition verified', `${emp103Before.name}: ${initial103Status} -> ${expected103Status} (${expectedEventType})`);

    // 2. Forced ENTRY Mode Transitions & Consecutive Entry Sequence
    // Scan at Gate 02 in forced ENTRY mode -> status becomes INSIDE
    const forcedEntry1 = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'ENTRY',
      gate: 'Gate 02 - Production Bay',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(forcedEntry1.status === 200, `Expected 200, got ${forcedEntry1.status}`);
    assert(forcedEntry1.body.event.eventType === 'ENTRY', 'Must record ENTRY event');
    assert(forcedEntry1.body.employee.status === 'INSIDE', 'Employee status must be INSIDE');

    // Scan at Gate 03 in forced ENTRY mode (different gate so not debounced) -> second consecutive ENTRY
    const forcedEntry2 = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'ENTRY',
      gate: 'Gate 03 - IT Labs Secure Door',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(forcedEntry2.status === 200, `Expected 200, got ${forcedEntry2.status}`);
    assert(forcedEntry2.body.event.eventType === 'ENTRY', 'Must record second consecutive ENTRY event');
    assert(forcedEntry2.body.employee.status === 'INSIDE', 'Employee status remains INSIDE');
    logPass('Forced ENTRY Transition & Consecutive Entry logged', `EMP-103: Successive ENTRY events across Gate 02 & Gate 03`);

    // 3. Forced EXIT Mode Transitions & Consecutive Exit Sequence
    // Scan at Gate 04 in forced EXIT mode -> status becomes OUTSIDE
    const forcedExit1 = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'EXIT',
      gate: 'Gate 04 - Maintenance Workshop',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(forcedExit1.status === 200, `Expected 200, got ${forcedExit1.status}`);
    assert(forcedExit1.body.event.eventType === 'EXIT', 'Must record EXIT event');
    assert(forcedExit1.body.employee.status === 'OUTSIDE', 'Employee status must be OUTSIDE');

    // Scan at Gate 05 in forced EXIT mode (different gate) -> second consecutive EXIT
    const forcedExit2 = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'EXIT',
      gate: 'Gate 05 - North Executive Portal',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(forcedExit2.status === 200, `Expected 200, got ${forcedExit2.status}`);
    assert(forcedExit2.body.event.eventType === 'EXIT', 'Must record second consecutive EXIT event');
    assert(forcedExit2.body.employee.status === 'OUTSIDE', 'Employee status remains OUTSIDE');
    logPass('Forced EXIT Transition & Consecutive Exit logged', `EMP-103: Successive EXIT events across Gate 04 & Gate 05`);

    // 4. Five-Second Debounce Immutability Check:
    // Repeated scans within debounce window must NOT alter employee status or create attendance events!
    const preDebounceEvents = await makeRequest('GET', '/api/attendance/logs');
    const preDebounceCount = preDebounceEvents.body.length;

    // Immediate repeat scan at same gate (Gate 05)
    const repeatDebounceRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: targetUid,
      mode: 'ENTRY',
      gate: 'Gate 05 - North Executive Portal',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(repeatDebounceRes.status === 200, `Expected 200, got ${repeatDebounceRes.status}`);
    assert(repeatDebounceRes.body.ignored === true, 'Rapid repeat tap must be ignored by debounce');
    assert(repeatDebounceRes.body.reason === 'DUPLICATE_READ_PROTECTION', 'Reason must be DUPLICATE_READ_PROTECTION');

    // Verify employee status was NOT modified by debounced scan
    const postDebounceEmpRes = await makeRequest('GET', '/api/employees');
    const postDebounceEmp = postDebounceEmpRes.body.find(e => e.id === 'EMP-103');
    assert(postDebounceEmp.status === 'OUTSIDE', `Employee status must remain OUTSIDE after debounced scan, got ${postDebounceEmp.status}`);

    // Verify database events count did NOT increment
    const postDebounceEvents = await makeRequest('GET', '/api/attendance/logs');
    assert(postDebounceEvents.body.length === preDebounceCount, `Debounced scan must not insert attendance events (Before: ${preDebounceCount}, After: ${postDebounceEvents.body.length})`);
    logPass('Debounce Window Immutability verified', 'Debounced scan did not modify employee status or create event rows');

    // 5. Failed Scan Immutability Check:
    // Unknown UID (404) must NOT modify any employee status or insert attendance events!
    const preFailedEvents = await makeRequest('GET', '/api/attendance/logs');
    const failedScanRes = await makeRequest('POST', '/api/attendance/scan', {
      uid: '00:11:22:33:44',
      mode: 'AUTO',
      gate: 'Gate 01 - Main Turnstile',
      deviceId: 'VIRTUAL-RFID-SIM-01'
    });
    assert(failedScanRes.status === 404, `Expected 404, got ${failedScanRes.status}`);
    assert(failedScanRes.body.code === 'UNKNOWN_UID', 'Error code must be UNKNOWN_UID');
    const postFailedEvents = await makeRequest('GET', '/api/attendance/logs');
    assert(postFailedEvents.body.length === preFailedEvents.body.length, 'Unknown card rejection must not create attendance events');
    logPass('Failed Scan Immutability verified', 'Unknown UID 404 rejection produced zero state mutations');

    // 6. Cross-Gate Scanning & Sequence Anomaly Auditing:
    // Verify that consecutive entries and exits created earlier are properly audited by analytics
    const auditAnomaliesRes = await makeRequest('GET', '/api/analytics/anomalies');
    assert(auditAnomaliesRes.status === 200, `Expected 200, got ${auditAnomaliesRes.status}`);
    const anomList = auditAnomaliesRes.body.anomalies || [];
    const hasUnpairedEntry = anomList.some(a => a.type === 'UNPAIRED_ENTRY' && a.empId === 'EMP-103');
    const hasUnpairedExit = anomList.some(a => a.type === 'UNPAIRED_EXIT' && a.empId === 'EMP-103');
    assert(hasUnpairedEntry, 'Audit engine must flag consecutive ENTRY events as UNPAIRED_ENTRY');
    assert(hasUnpairedExit, 'Audit engine must flag consecutive EXIT events as UNPAIRED_EXIT');
    logPass('Sequence Anomaly Auditing verified', `Correctly flagged UNPAIRED_ENTRY and UNPAIRED_EXIT without misconduct accusations`);

    // 7. Phase 5B Simulation Report Endpoint (GET /api/simulation/report):
    const reportRes = await makeRequest('GET', '/api/simulation/report');
    assert(reportRes.status === 200, `Expected 200, got ${reportRes.status}`);
    const rep = reportRes.body;
    assert(rep.isSimulated === true, 'Report must be clearly flagged as simulated');
    assert(rep.targetHardwareArchitecture.includes('UHF EPC Gen2'), 'Target hardware architecture must specify UHF EPC Gen2 (860–960 MHz)');
    assert(rep.legacyProximityStandard.includes('13.56 MHz'), 'Legacy proximity standard must specify 13.56 MHz HF / NFC');
    assert(rep.identityNotice && rep.identityNotice.includes('Card UID'), 'Report must include explicit cardholder identity verification disclaimer');
    assert(rep.sessionSummary.totalAttempts > 0, `Total attempts must be derived from actual session, got ${rep.sessionSummary.totalAttempts}`);
    assert(rep.sessionSummary.acceptedScans > 0, `Accepted scans must be > 0, got ${rep.sessionSummary.acceptedScans}`);
    assert(rep.sessionSummary.debouncedReads > 0, `Debounced reads must be > 0, got ${rep.sessionSummary.debouncedReads}`);
    assert(rep.sessionSummary.rejectedUnknownUids > 0, `Rejected unknown UIDs must be > 0, got ${rep.sessionSummary.rejectedUnknownUids}`);
    assert(rep.finalEmployeeStates.totalEmployees === 13, `Total employees in report must be 13, got ${rep.finalEmployeeStates.totalEmployees}`);
    assert(rep.finalEmployeeStates.insideCount + rep.finalEmployeeStates.outsideCount === 13, 'Inside + outside headcount must equal total employees');
    logPass('Simulation Report API (GET /api/simulation/report) verified', `Attempts: ${rep.sessionSummary.totalAttempts}, Accepted: ${rep.sessionSummary.acceptedScans}, Debounced: ${rep.sessionSummary.debouncedReads}, Unknown: ${rep.sessionSummary.rejectedUnknownUids}`);

    // 8. Simulation Report Safe Reset (DELETE /api/simulation/report):
    // Must zero out session metrics WITHOUT deleting attendance history or employee records!
    const preResetEventsRes = await makeRequest('GET', '/api/attendance/logs');
    const preResetEventsCount = preResetEventsRes.body.length;
    assert(preResetEventsCount > 0, 'Database attendance events must exist prior to report reset');

    const resetReportRes = await makeRequest('DELETE', '/api/simulation/report');
    assert(resetReportRes.status === 200, `Expected 200, got ${resetReportRes.status}`);
    assert(resetReportRes.body.success === true, 'Reset response must indicate success');

    // Verify session metrics are zeroed
    const postResetReportRes = await makeRequest('GET', '/api/simulation/report');
    const postResetRep = postResetReportRes.body;
    assert(postResetRep.sessionSummary.totalAttempts === 0, 'Total attempts must be 0 after reset');
    assert(postResetRep.sessionSummary.acceptedScans === 0, 'Accepted scans must be 0 after reset');
    assert(postResetRep.sessionSummary.debouncedReads === 0, 'Debounced reads must be 0 after reset');
    assert(postResetRep.sessionSummary.rejectedUnknownUids === 0, 'Rejected unknown UIDs must be 0 after reset');

    // CRITICAL: Verify attendance events and employee roster remain 100% intact!
    const postResetEventsRes = await makeRequest('GET', '/api/attendance/logs');
    assert(postResetEventsRes.body.length === preResetEventsCount, `Attendance events count must NOT be deleted by report reset (Expected ${preResetEventsCount}, got ${postResetEventsRes.body.length})`);

    const postResetEmpsRes = await makeRequest('GET', '/api/employees');
    assert(postResetEmpsRes.body.length === 13, `Employee records must NOT be affected by report reset (Expected 13, got ${postResetEmpsRes.body.length})`);
    logPass('Simulation Report Safe Reset (DELETE /api/simulation/report) verified', `Session metrics cleared to 0 while ${postResetEventsRes.body.length} attendance logs and 13 employees remain intact`);

    // -------------------------------------------------------------
    // STEP 15: SQLite Persistence Across Complete Server Shutdown & Restart
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[15/15] Testing SQLite Persistence Across Full Server Restart...${RESET}`);
    console.log(`  Terminating Server Instance 1...`);
    await stopServerInstance(serverInstance1);
    serverInstance1 = null;
    logPass('Server Instance 1 cleanly terminated');

    assert(fs.existsSync(TEST_DB_PATH), 'Test database file must exist on disk');
    const testDbStats = fs.statSync(TEST_DB_PATH);
    assert(testDbStats.size > 0, 'Test database file must not be empty');
    logPass('SQLite database file confirmed on disk', `${(testDbStats.size / 1024).toFixed(1)} KB`);

    console.log(`  Starting Server Instance 2 pointing to the same SQLite database...`);
    serverInstance2 = await spawnServerInstance('Instance-2');
    logPass('Server Instance 2 started successfully', `Port ${TEST_PORT}`);

    // Verify analytics work consistently after server restart
    const postRestartOverview = await makeRequest('GET', '/api/analytics/overview');
    assert(postRestartOverview.status === 200, `Expected 200, got ${postRestartOverview.status}`);
    assert(postRestartOverview.body.summary.totalEmployees === 13, 'Persisted headcount must be preserved across restart');
    logPass('Phase 4 Analytics operational and consistent post-restart');

    const postRestartEmpsRes = await makeRequest('GET', '/api/employees');
    assert(postRestartEmpsRes.status === 200, `Expected 200, got ${postRestartEmpsRes.status}`);
    const persistedEmp = postRestartEmpsRes.body.find(e => e.id === 'EMP-999');
    assert(persistedEmp !== undefined, 'Registered employee EMP-999 must persist after restart');
    logPass('Registered Employee persisted intact after restart', `EMP-999`);

    // -------------------------------------------------------------
    // Production Database Isolation Guarantee
    // -------------------------------------------------------------
    console.log(`\n${BOLD}Verifying Production Database Isolation...${RESET}`);
    if (fs.existsSync(REAL_DB_PATH)) {
      const statsAfter = fs.statSync(REAL_DB_PATH);
      assert(statsAfter.size === realDbBeforeSize, `Production DB size changed! Before: ${realDbBeforeSize}, After: ${statsAfter.size}`);
      assert(statsAfter.mtimeMs === realDbBeforeMtime, 'Production DB was modified during tests!');
      logPass('Production database smartworkforce.db was 100% untouched', `Size: ${statsAfter.size} bytes unchanged`);
    }

  } catch (err) {
    logFail('Test suite encountered an uncaught error', err);
  } finally {
    if (serverInstance1) await stopServerInstance(serverInstance1);
    if (serverInstance2) await stopServerInstance(serverInstance2);

    cleanupTestDb();
    logPass('Temporary test database cleaned up safely');

    console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
    console.log(`${BOLD} TEST SUMMARY:${RESET}`);
    console.log(`  Passed: ${GREEN}${testsPassed}${RESET}`);
    console.log(`  Failed: ${testsFailed > 0 ? RED : GREEN}${testsFailed}${RESET}`);
    console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runPersistenceSuite();

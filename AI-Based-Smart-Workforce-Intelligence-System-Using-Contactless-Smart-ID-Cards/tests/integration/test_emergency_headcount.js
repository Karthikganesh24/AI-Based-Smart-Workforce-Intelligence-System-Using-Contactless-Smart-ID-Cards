/**
 * tests/integration/test_emergency_headcount.js
 *
 * Integration tests for the Emergency Headcount System.
 * Runs against an isolated temporary database.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Isolated DB setup
const tempDbPath = path.resolve(__dirname, '..', 'isolated_emergency_test.db');
if (fs.existsSync(tempDbPath)) {
  try { fs.unlinkSync(tempDbPath); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
}

process.env.DB_PATH = tempDbPath;

const db = require('../../database/database.js');
const { startServer } = require('../../backend/server.js');
const auth = require('../../backend/auth.js');

let passedTests = 0;
let totalTests = 0;
let serverUrl;
let server;

function logPass(msg) {
  passedTests++;
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function logFail(msg, err) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
  if (err) console.error(`    ${err.message || err}`);
}

function httpRequest(url, options, bodyData) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(options.path, url);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) }
    };

    let postBody = null;
    if (bodyData !== undefined && bodyData !== null) {
      postBody = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      reqOpts.headers['Content-Type'] = 'application/json';
      reqOpts.headers['Content-Length'] = Buffer.byteLength(postBody);
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        const cookies = res.headers['set-cookie'] || [];
        resolve({ status: res.statusCode, data: parsed, headers: res.headers, cookies });
      });
    });
    req.on('error', reject);
    if (postBody) req.write(postBody);
    req.end();
  });
}

function extractCookieValue(cookies, name) {
  for (const c of cookies) {
    const match = c.match(new RegExp(`${name}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

async function loginAsAdmin() {
  const res = await httpRequest(serverUrl, {
    method: 'POST',
    path: '/api/auth/login'
  }, { identity: 'admin@smartworkforce.internal', password: 'SmartWorkforce2024!' });

  assert.strictEqual(res.status, 200, 'Admin login should succeed');
  const sessionCookie = extractCookieValue(res.cookies, 'sw_session');
  const csrfToken = res.data.csrfToken;
  return { sessionCookie, csrfToken };
}

function authHeaders(sessionCookie, csrfToken) {
  return {
    Cookie: `sw_session=${sessionCookie}`,
    'X-CSRF-Token': csrfToken
  };
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}═══ Emergency Headcount System Tests ═══${RESET}\n`);

  // Start server
  server = startServer(0);
  await new Promise(resolve => server.on('listening', resolve));
  const addr = server.address();
  serverUrl = `http://localhost:${addr.port}`;
  console.log(`  Test server at ${serverUrl}\n`);

  let adminAuth;
  let evacuationId;

  // ─── Test: Admin login ───
  totalTests++;
  try {
    adminAuth = await loginAsAdmin();
    assert.ok(adminAuth.sessionCookie, 'Should have session cookie');
    assert.ok(adminAuth.csrfToken, 'Should have CSRF token');
    logPass('Admin login successful');
  } catch (err) {
    logFail('Admin login', err);
    cleanup();
    return;
  }

  const hdrs = authHeaders(adminAuth.sessionCookie, adminAuth.csrfToken);

  // ─── Test: No active evacuation initially ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: '/api/emergency/evacuations/active', headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.active, false);
    assert.strictEqual(res.data.evacuation, null);
    logPass('No active evacuation initially');
  } catch (err) {
    logFail('No active evacuation initially', err);
  }

  // ─── Test: Unauthenticated access denied ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/emergency/evacuations' }, { eventName: 'Test' });
    assert.strictEqual(res.status, 401);
    logPass('Unauthenticated evacuation start rejected');
  } catch (err) {
    logFail('Unauthenticated access denied', err);
  }

  // ─── Test: Missing event name ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/emergency/evacuations', headers: hdrs }, { eventName: 'ab' });
    assert.strictEqual(res.status, 400);
    logPass('Short event name rejected');
  } catch (err) {
    logFail('Short event name rejected', err);
  }

  // ─── Test: Start evacuation ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/emergency/evacuations', headers: hdrs }, {
      eventName: 'Fire Alarm — Building A',
      building: 'Building A',
      notes: 'Test evacuation'
    });
    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert.ok(res.data.evacuation, 'Should have evacuation object');
    assert.strictEqual(res.data.evacuation.status, 'ACTIVE');
    assert.strictEqual(res.data.evacuation.eventName, 'Fire Alarm — Building A');
    assert.ok(res.data.stats, 'Should have stats');
    assert.ok(res.data.stats.total > 0, 'Should have participants');
    assert.strictEqual(res.data.stats.accounted, 0, 'No one should be accounted for initially');
    assert.strictEqual(res.data.stats.missing, res.data.stats.expected, 'All expected should be missing');
    evacuationId = res.data.evacuation.id;
    logPass(`Evacuation started (${res.data.stats.total} participants)`);
  } catch (err) {
    logFail('Start evacuation', err);
    cleanup();
    return;
  }

  // ─── Test: Cannot start duplicate evacuation ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/emergency/evacuations', headers: hdrs }, { eventName: 'Second Alarm' });
    assert.strictEqual(res.status, 409);
    logPass('Duplicate active evacuation prevented');
  } catch (err) {
    logFail('Duplicate evacuation prevention', err);
  }

  // ─── Test: Active evacuation returned ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: '/api/emergency/evacuations/active', headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.active, true);
    assert.strictEqual(res.data.evacuation.id, evacuationId);
    logPass('Active evacuation retrieved');
  } catch (err) {
    logFail('Active evacuation retrieved', err);
  }

  // ─── Test: Get headcount ───
  let firstEmpId;
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: `/api/emergency/evacuations/${evacuationId}/headcount`, headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.headcount), 'Headcount should be an array');
    assert.ok(res.data.headcount.length > 0, 'Should have participants');
    firstEmpId = res.data.headcount[0].empId;
    const allMissing = res.data.headcount.every(p => p.headcountStatus === 'MISSING');
    assert.ok(allMissing, 'All should be MISSING initially');
    logPass(`Headcount list returned (${res.data.headcount.length} people)`);
  } catch (err) {
    logFail('Get headcount', err);
  }

  // ─── Test: Verify person as accounted for ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: firstEmpId,
      status: 'ACCOUNTED_FOR',
      verificationMethod: 'MANUAL',
      note: 'Confirmed at assembly point'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.changed, true);
    assert.strictEqual(res.data.previousStatus, 'MISSING');
    assert.strictEqual(res.data.newStatus, 'ACCOUNTED_FOR');
    assert.strictEqual(res.data.stats.accounted, 1);
    logPass('Person verified as accounted for');
  } catch (err) {
    logFail('Verify person', err);
  }

  // ─── Test: Duplicate verification (same status) returns changed:false ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: firstEmpId,
      status: 'ACCOUNTED_FOR',
      verificationMethod: 'MANUAL'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.changed, false);
    logPass('Duplicate verification returns changed:false');
  } catch (err) {
    logFail('Duplicate verification', err);
  }

  // ─── Test: Correct a verification (accounted → missing) ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: firstEmpId,
      status: 'MISSING',
      verificationMethod: 'MANUAL',
      note: 'Correction — wrong person identified'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.changed, true);
    assert.strictEqual(res.data.previousStatus, 'ACCOUNTED_FOR');
    assert.strictEqual(res.data.newStatus, 'MISSING');
    logPass('Verification corrected (accounted → missing)');
  } catch (err) {
    logFail('Correct verification', err);
  }

  // ─── Test: Invalid status rejected ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: firstEmpId,
      status: 'INVALID_STATUS'
    });
    assert.strictEqual(res.status, 400);
    logPass('Invalid headcount status rejected');
  } catch (err) {
    logFail('Invalid status rejection', err);
  }

  // ─── Test: Non-existent employee rejected ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: 'EMP-NONEXISTENT',
      status: 'ACCOUNTED_FOR'
    });
    assert.strictEqual(res.status, 404);
    logPass('Non-existent participant rejected');
  } catch (err) {
    logFail('Non-existent participant rejection', err);
  }

  // ─── Test: Zone summary ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: `/api/emergency/evacuations/${evacuationId}/zones`, headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'Zone summary should be an array');
    if (res.data.length > 0) {
      assert.ok('zone' in res.data[0], 'Should have zone field');
      assert.ok('missing' in res.data[0], 'Should have missing count');
    }
    logPass(`Zone summary returned (${res.data.length} zones)`);
  } catch (err) {
    logFail('Zone summary', err);
  }

  // ─── Test: Audit trail ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: `/api/emergency/evacuations/${evacuationId}/audit`, headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'Audit trail should be an array');
    assert.ok(res.data.length >= 2, 'Should have at least 2 audit entries from previous verifications');
    assert.ok(res.data[0].verifiedByName, 'Should have verifier name');
    logPass(`Audit trail returned (${res.data.length} records)`);
  } catch (err) {
    logFail('Audit trail', err);
  }

  // ─── Test: Get evacuation details ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: `/api/emergency/evacuations/${evacuationId}`, headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.evacuation, 'Should have evacuation');
    assert.ok(res.data.stats, 'Should have stats');
    assert.ok(res.data.stats.completionPercentage >= 0, 'Should have completion percentage');
    logPass('Evacuation details retrieved');
  } catch (err) {
    logFail('Get evacuation details', err);
  }

  // ─── Test: Close evacuation ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/close`, headers: hdrs }, {
      reason: 'All clear — test complete'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.evacuation.status, 'CLOSED');
    assert.ok(res.data.evacuation.closedAt, 'Should have closedAt');
    logPass('Evacuation closed');
  } catch (err) {
    logFail('Close evacuation', err);
  }

  // ─── Test: Cannot modify closed evacuation ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/verify`, headers: hdrs }, {
      empId: firstEmpId,
      status: 'ACCOUNTED_FOR'
    });
    assert.strictEqual(res.status, 400);
    logPass('Verification on closed evacuation rejected');
  } catch (err) {
    logFail('Closed evacuation verification rejection', err);
  }

  // ─── Test: Cannot close already closed evacuation ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${evacuationId}/close`, headers: hdrs }, {});
    assert.strictEqual(res.status, 400);
    logPass('Closing already-closed evacuation rejected');
  } catch (err) {
    logFail('Double-close rejection', err);
  }

  // ─── Test: No active evacuation after close ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: '/api/emergency/evacuations/active', headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.active, false);
    logPass('No active evacuation after close');
  } catch (err) {
    logFail('No active after close', err);
  }

  // ─── Test: History includes closed event ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { path: '/api/emergency/evacuations/history', headers: hdrs });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data), 'History should be an array');
    assert.ok(res.data.length >= 1, 'Should have at least 1 past evacuation');
    assert.strictEqual(res.data[0].id, evacuationId);
    logPass('Evacuation history returned');
  } catch (err) {
    logFail('Evacuation history', err);
  }

  // ─── Test: Can start new evacuation after closing ───
  totalTests++;
  try {
    const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/emergency/evacuations', headers: hdrs }, {
      eventName: 'Second Drill — Building B'
    });
    assert.strictEqual(res.status, 201);
    logPass('New evacuation started after closing previous');
    // Close it for cleanup
    const id2 = res.data.evacuation.id;
    await httpRequest(serverUrl, { method: 'POST', path: `/api/emergency/evacuations/${id2}/close`, headers: hdrs }, { reason: 'Cleanup' });
  } catch (err) {
    logFail('Start new evacuation after close', err);
  }

  // ─── Summary ───
  cleanup();
}

function cleanup() {
  console.log(`\n${BOLD}${CYAN}═══ Results ═══${RESET}`);
  console.log(`  ${GREEN}Passed: ${passedTests}${RESET} / ${totalTests}`);
  const failed = totalTests - passedTests;
  if (failed > 0) {
    console.log(`  ${RED}Failed: ${failed}${RESET}`);
  }
  console.log('');

  if (server) {
    server.close();
  }

  // Cleanup temp DB
  try { fs.unlinkSync(tempDbPath); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error(`${RED}Test suite crashed:${RESET}`, err);
  cleanup();
});

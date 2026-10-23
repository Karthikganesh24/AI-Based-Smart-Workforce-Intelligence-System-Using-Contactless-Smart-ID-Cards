/**
 * tests/unit/test_password_reset.js
 * Isolated Test Suite for Admin Reset Temporary Password Workflow.
 * 
 * Verifies:
 * 1. Unauthenticated requests are rejected (401).
 * 2. Employee role users are rejected (403 Forbidden).
 * 3. CSRF protection enforces valid tokens (403 Forbidden).
 * 4. Multi-tenant company isolation rejects cross-company admins (404 Not Found).
 * 5. Rejection of archived/soft-deleted employees (400 Bad Request).
 * 6. Rejection of deactivated/suspended employee accounts (400 Bad Request).
 * 7. Rejection of employees with invalid/missing phone or name (400 Bad Request).
 * 8. Successful temporary password reset for EMP-113:
 *    - Format: First 4 alphabetic letters of name + last 4 digits of phone ('ramk0022')
 *    - Response returns generated password once to administrator
 *    - Must change password flag is set to 1
 *    - Stored as scrypt hash + fresh salt, never plaintext
 *    - Invalidation of previous sessions
 *    - Old password ('EmployeePass2024!') fails
 *    - Example password ('ramk1234') fails
 *    - New temporary password succeeds (200)
 *    - Mandatory password change enforced on first login
 *    - Self-service password change clears must_change_password to 0
 * 9. Preservation of employee records, RFID UID, and attendance history.
 * 
 * Runs against an isolated temporary database.
 * Does NOT modify production database.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const tempDbPath = path.resolve(__dirname, '..', 'isolated_reset_pwd_test.db');
const prodDbPath = path.resolve(__dirname, '../../database/smartworkforce.db');

// Clean any previous test artifacts
if (fs.existsSync(tempDbPath)) {
  try { fs.unlinkSync(tempDbPath); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
}

// Seed isolated DB from production snapshot
fs.copyFileSync(prodDbPath, tempDbPath);

// Point DB_PATH to isolated test database
process.env.DB_PATH = tempDbPath;

const db = require('../../database/database.js');
const { startServer } = require('../../backend/server.js');
const auth = require('../../backend/auth.js');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ${GREEN}✓${RESET} ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ${RED}✗${RESET} ${desc}`);
    console.error(err);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ${GREEN}✓${RESET} ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ${RED}✗${RESET} ${desc}`);
    console.error(err);
    failed++;
  }
}

// HTTP Helper for testing
function httpRequest({ port, path: reqPath, method = 'GET', headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = { ...headers };
    if (postData) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTestSuite() {
  console.log(`\n${BOLD}=== SmartWorkforce: Admin Reset Temporary Password Isolated Test Suite ===${RESET}\n`);

  // Start test server on dedicated isolated port
  const testPort = 3993;
  const server = startServer(testPort);

  // Wait for server to bind
  await new Promise(r => setTimeout(r, 500));

  try {
    // ----------------------------------------------------
    // SETUP: Provision Test Sessions
    // ----------------------------------------------------
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

    // 1. Authorized Admin session (COMP-DEFAULT-01)
    const adminToken = auth.generateOpaqueToken();
    const adminTokenHash = auth.hashToken(adminToken);
    const adminCsrf = auth.generateCsrfToken();
    db.createSession({
      id: adminTokenHash,
      accountId: 'USR-ADMIN-01',
      userType: 'COMPANY_HEAD',
      companyId: 'COMP-DEFAULT-01',
      csrfToken: adminCsrf,
      expiresAt: expiresAt
    });
    const adminCookie = `sw_session=${adminToken}`;

    // 2. Cross-Company Admin session (COMP-TEST-ISOLATED)
    db.createCompany({
      id: 'COMP-TEST-ISOLATED',
      name: 'Isolated Foreign Corp',
      industry: 'Logistics',
      email: 'foreign@isolated.test'
    });
    const foreignSalt = auth.generateSalt();
    const foreignHash = auth.hashPassword('ForeignPass123!', foreignSalt);
    db.createCompanyUser({
      id: 'USR-FOREIGN-01',
      companyId: 'COMP-TEST-ISOLATED',
      email: 'admin@foreign.test',
      fullName: 'Foreign Admin',
      passwordHash: foreignHash,
      passwordSalt: foreignSalt,
      role: 'COMPANY_ADMIN'
    });
    const foreignToken = auth.generateOpaqueToken();
    const foreignTokenHash = auth.hashToken(foreignToken);
    const foreignCsrf = auth.generateCsrfToken();
    db.createSession({
      id: foreignTokenHash,
      accountId: 'USR-FOREIGN-01',
      userType: 'COMPANY_ADMIN',
      companyId: 'COMP-TEST-ISOLATED',
      csrfToken: foreignCsrf,
      expiresAt: expiresAt
    });
    const foreignCookie = `sw_session=${foreignToken}`;

    // 3. Employee session (EMP-113)
    const empToken = auth.generateOpaqueToken();
    const empTokenHash = auth.hashToken(empToken);
    const empCsrf = auth.generateCsrfToken();
    db.createSession({
      id: empTokenHash,
      accountId: 'EMP-113',
      userType: 'EMPLOYEE',
      companyId: 'COMP-DEFAULT-01',
      csrfToken: empCsrf,
      expiresAt: expiresAt
    });
    const empCookie = `sw_session=${empToken}`;

    // ----------------------------------------------------
    // TEST 1: Unauthenticated Request
    // ----------------------------------------------------
    await itAsync('Rejects unauthenticated reset requests with 401', async () => {
      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        body: {}
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.data.error, 'Authentication required to reset employee credentials.');
    });

    // ----------------------------------------------------
    // TEST 2: Employee Role Attempt
    // ----------------------------------------------------
    await itAsync('Rejects reset requests from regular employee accounts with 403', async () => {
      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: empCookie,
          'X-CSRF-Token': empCsrf
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.error, 'Permission denied: Administrator privileges required.');
    });

    // ----------------------------------------------------
    // TEST 3: CSRF Protection
    // ----------------------------------------------------
    await itAsync('Rejects admin requests with missing or invalid CSRF token with 403', async () => {
      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'X-CSRF-Token': 'bogus-csrf-token-12345'
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.data.error, 'Invalid or missing CSRF token.');
    });

    // ----------------------------------------------------
    // TEST 4: Cross-Company Access Denial
    // ----------------------------------------------------
    await itAsync('Enforces multi-tenant isolation: foreign admin cannot reset employee from another company', async () => {
      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: foreignCookie,
          'X-CSRF-Token': foreignCsrf
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 404);
      assert.ok(res.data.error.includes("not found in your organization"));
    });

    // ----------------------------------------------------
    // TEST 5: Archived Employee Rejection
    // ----------------------------------------------------
    await itAsync('Rejects password reset for archived employee with 400', async () => {
      // Archive EMP-113 temporarily
      db.deleteOrArchiveEmployee('EMP-113', 'COMP-DEFAULT-01');

      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'X-CSRF-Token': adminCsrf
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.data.error.includes('Cannot reset password for an archived employee'));

      // Restore EMP-113 for subsequent tests
      db.restoreArchivedEmployee('EMP-113', 'COMP-DEFAULT-01');
    });

    // ----------------------------------------------------
    // TEST 6: Suspended Employee Rejection
    // ----------------------------------------------------
    await itAsync('Rejects password reset for suspended/deactivated employee account with 400', async () => {
      // Deactivate account
      db.deactivateEmployee('EMP-113', 'COMP-DEFAULT-01');

      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'X-CSRF-Token': adminCsrf
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.data.error.includes('Cannot reset password for an inactive employee account'));

      // Reactivate account
      db.reactivateEmployee('EMP-113', 'COMP-DEFAULT-01');
    });

    // ----------------------------------------------------
    // TEST 7: Invalid / Missing Contact Details
    // ----------------------------------------------------
    await itAsync('Rejects password reset if employee phone number is missing or invalid', async () => {
      // Create employee with no phone
      db.createEmployee({
        id: 'EMP-NOPHO-01',
        name: 'No Phone Worker',
        department: 'Operations',
        role: 'Technician',
        uid: 'E0:AA:BB:01',
        companyId: 'COMP-DEFAULT-01',
        email: 'nopho@smartworkforce.test',
        phone: null
      });

      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-NOPHO-01/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'X-CSRF-Token': adminCsrf
        },
        body: {}
      });
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.data.error.includes('phone number is required'));
    });

    // ----------------------------------------------------
    // TEST 8: Successful Temporary Password Reset for EMP-113
    // ----------------------------------------------------
    let generatedPassword = null;
    await itAsync('Successfully resets temporary password for EMP-113 following Name[:4] + Phone[-4:] rule', async () => {
      const empBefore = db.getEmployeeById('EMP-113');
      assert.strictEqual(empBefore.name, 'ram kumar');
      assert.strictEqual(empBefore.phone, '+916385490022');

      const res = await httpRequest({
        port: testPort,
        path: '/api/employees/EMP-113/reset-temporary-password',
        method: 'POST',
        headers: {
          Cookie: adminCookie,
          'X-CSRF-Token': adminCsrf
        },
        body: {}
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.employeeId, 'EMP-113');
      assert.strictEqual(res.data.mustChangePassword, true);

      // Verify rule: 'ram ' -> 'ramk', '+916385490022' -> '0022' => 'ramk0022'
      generatedPassword = res.data.temporaryPassword;
      assert.strictEqual(generatedPassword, 'ramk0022');

      // Verify database stored scrypt hash and fresh salt, not plaintext
      const acc = db.getEmployeeAccountByEmpId('EMP-113');
      assert.strictEqual(acc.must_change_password, 1);
      assert.notStrictEqual(acc.password_hash, 'ramk0022');
      assert.strictEqual(typeof acc.password_salt, 'string');
      assert.strictEqual(acc.password_salt.length, 32); // 16 bytes hex

      const isValidStored = auth.verifyPassword('ramk0022', acc.password_salt, acc.password_hash);
      assert.strictEqual(isValidStored, true);
    });

    // ----------------------------------------------------
    // TEST 9: Invalidation of Previous Sessions
    // ----------------------------------------------------
    it('Verifies previous active employee sessions were invalidated upon reset', () => {
      const sessionAfter = db.getSession(empTokenHash);
      assert.strictEqual(sessionAfter, undefined, 'Session should have been deleted upon reset');
    });

    // ----------------------------------------------------
    // TEST 10: Authentication Verification: Old vs New Passwords
    // ----------------------------------------------------
    await itAsync('Verifies previous passwords fail and new temporary password succeeds', async () => {
      // 1. Example password 'ramk1234' must fail
      const resExample = await httpRequest({
        port: testPort,
        path: '/api/auth/login',
        method: 'POST',
        body: {
          identity: 'EMP-113',
          password: 'ramk1234',
          portalMode: 'EMPLOYEE'
        }
      });
      assert.strictEqual(resExample.statusCode, 401);

      // 2. Old baseline password 'EmployeePass2024!' must fail
      const resOld = await httpRequest({
        port: testPort,
        path: '/api/auth/login',
        method: 'POST',
        body: {
          identity: 'EMP-113',
          password: 'EmployeePass2024!',
          portalMode: 'EMPLOYEE'
        }
      });
      assert.strictEqual(resOld.statusCode, 401);

      // 3. New generated password 'ramk0022' must succeed and enforce mustChangePassword
      const resNew = await httpRequest({
        port: testPort,
        path: '/api/auth/login',
        method: 'POST',
        body: {
          identity: 'EMP-113',
          password: generatedPassword,
          portalMode: 'EMPLOYEE'
        }
      });
      assert.strictEqual(resNew.statusCode, 200);
      assert.strictEqual(resNew.data.mustChangePassword, true);
      assert.strictEqual(resNew.data.redirectTo, '/employee?action=change-password');
      assert.strictEqual(resNew.data.user.id, 'EMP-113');

      // Extract employee session cookie for password change
      const setCookieHeader = resNew.headers['set-cookie'];
      const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
      const swSessionMatch = rawCookie.match(/sw_session=([^;]+)/);
      assert.ok(swSessionMatch, 'Expected sw_session cookie in login response');
      const newEmpCookie = `sw_session=${swSessionMatch[1]}`;
      const newEmpCsrf = resNew.data.csrfToken;

      // 4. Employee restricted from normal endpoints until password is changed
      const resBlocked = await httpRequest({
        port: testPort,
        path: '/api/employee/me',
        method: 'GET',
        headers: { Cookie: newEmpCookie }
      });
      assert.strictEqual(resBlocked.statusCode, 403);
      assert.strictEqual(resBlocked.data.code, 'PASSWORD_CHANGE_REQUIRED');

      // 5. Employee changes password to their private choice
      const privatePassword = 'MySecretPrivate2026!';
      const resChange = await httpRequest({
        port: testPort,
        path: '/api/employee/change-password',
        method: 'POST',
        headers: {
          Cookie: newEmpCookie,
          'X-CSRF-Token': newEmpCsrf
        },
        body: {
          currentPassword: generatedPassword,
          newPassword: privatePassword,
          confirmPassword: privatePassword
        }
      });
      assert.strictEqual(resChange.statusCode, 200);
      assert.strictEqual(resChange.data.mustChangePassword, false);

      // 6. Account in DB now has must_change_password = 0
      const accFinal = db.getEmployeeAccountByEmpId('EMP-113');
      assert.strictEqual(accFinal.must_change_password, 0);

      // 7. Employee now has full access to employee/me
      const resAllowed = await httpRequest({
        port: testPort,
        path: '/api/employee/me',
        method: 'GET',
        headers: { Cookie: newEmpCookie }
      });
      assert.strictEqual(resAllowed.statusCode, 200);
      assert.strictEqual(resAllowed.data.employee.id, 'EMP-113');
    });

    // ----------------------------------------------------
    // TEST 11: Database & Attendance Log Integrity
    // ----------------------------------------------------
    it('Preserves employee ID, contact details, RFID UID, and attendance history without duplicates', () => {
      const emp = db.getEmployeeById('EMP-113');
      assert.strictEqual(emp.id, 'EMP-113');
      assert.strictEqual(emp.name, 'ram kumar');
      assert.strictEqual(emp.department, 'IT');
      assert.strictEqual(emp.role, 'java');
      assert.strictEqual(emp.uid, '3B:67:E0:F8');
      assert.strictEqual(emp.email, 'karthikganeshg.student@saveetha.ac.in');
      assert.strictEqual(emp.phone, '+916385490022');

      // Check attendance events
      const events = db.getAttendanceEventsForEmployee('EMP-113');
      assert.strictEqual(events.length, 4, 'All historical attendance events for EMP-113 must remain intact');

      // Check employee accounts count for EMP-113 (strict uniqueness)
      const accounts = db.db.prepare('SELECT COUNT(*) as c FROM employee_accounts WHERE employee_id = ?').get('EMP-113').c;
      assert.strictEqual(accounts, 1, 'Exactly one employee_accounts record must exist for EMP-113');
    });

  } finally {
    // Gracefully shut down test server
    server.close();

    // Clean up isolated test database
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch (_) {}
      try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
      try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
    }
  }

  console.log(`\n${BOLD}Test Results: ${GREEN}${passed} passed${RESET}, ${failed > 0 ? RED : GREEN}${failed} failed${RESET}\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});

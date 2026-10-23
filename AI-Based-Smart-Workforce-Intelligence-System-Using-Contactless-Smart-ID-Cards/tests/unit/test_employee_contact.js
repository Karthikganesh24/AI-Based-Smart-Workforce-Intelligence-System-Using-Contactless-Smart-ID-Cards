/**
 * tests/unit/test_employee_contact.js
 * Isolated Test Suite for Employee Email, Phone, and Temporary Password Rule
 * 
 * Verifies:
 * 1. Required temporary password format:
 *    First 4 alphabetic letters of employee name + last 4 digits of phone number.
 *    - Example 1: Arun Kumar, 9876543210 -> 'Arun3210'
 *    - Example 2: Priya Sharma, 9123456789 -> 'Priy6789'
 * 2. Normalization: ignoring spaces and punctuation when extracting first 4 letters.
 * 3. Extraction: last 4 numeric digits from phone number.
 * 4. Input rejection: invalid names (< 4 letters) and invalid phones (< 4 digits).
 * 5. Security: scrypt password hash and salt stored in DB, zero plaintext passwords.
 * 6. Multi-tenancy: duplicate email in same company rejected (409), allowed across different companies.
 * 7. First-login password change: mandatory change enforced and successfully updated.
 * 
 * Runs against an isolated temporary database.
 * Does NOT modify production database.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const tempDbPath = path.resolve(__dirname, '..', 'isolated_contact_test.db');
if (fs.existsSync(tempDbPath)) {
  fs.unlinkSync(tempDbPath);
}

// Point to isolated database
process.env.DB_PATH = tempDbPath;

const db = require('../../database/database.js');
const { startServer } = require('../../backend/server.js');
const auth = require('../../backend/auth.js');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedTests = 0;
let totalTests = 0;

function logPass(msg) {
  passedTests++;
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function logFail(msg, err) {
  console.log(`  ${RED}✗${RESET} ${msg}`);
  if (err) console.error(err);
}

// Helper to make HTTP requests
function httpRequest(serverUrl, options, bodyData) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(options.path, serverUrl);
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: { ...(options.headers || {}) }
    };

    let postBody = null;
    if (bodyData) {
      postBody = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      reqOpts.headers['Content-Type'] = 'application/json';
      reqOpts.headers['Content-Length'] = Buffer.byteLength(postBody);
    }

    const req = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);
    if (postBody) req.write(postBody);
    req.end();
  });
}

function getCookie(res, cookieName) {
  const setCookies = res.headers['set-cookie'] || [];
  for (const c of setCookies) {
    const match = c.match(new RegExp(`^${cookieName}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} SmartWorkforce: Temporary Password Rule & Contact Isolation Test Suite ${RESET}`);
  console.log(`${BOLD}${CYAN} Running against isolated database: ${tempDbPath}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // -------------------------------------------------------------
  // UNIT TESTS: auth.generateEmployeeTemporaryPassword
  // -------------------------------------------------------------
  console.log(`${BOLD}[Unit Test] Verifying auth.generateEmployeeTemporaryPassword core rule...${RESET}`);
  
  // Example 1
  totalTests++;
  const ex1 = auth.generateEmployeeTemporaryPassword('Arun Kumar', '9876543210');
  assert.strictEqual(ex1, 'Arun3210', `Expected 'Arun3210', got '${ex1}'`);
  logPass("Example 1 verified: 'Arun Kumar' + '9876543210' -> 'Arun3210'");

  // Example 2
  totalTests++;
  const ex2 = auth.generateEmployeeTemporaryPassword('Priya Sharma', '9123456789');
  assert.strictEqual(ex2, 'Priy6789', `Expected 'Priy6789', got '${ex2}'`);
  logPass("Example 2 verified: 'Priya Sharma' + '9123456789' -> 'Priy6789'");

  // Normalization: spaces, dots, hyphens, punctuation
  totalTests++;
  const norm1 = auth.generateEmployeeTemporaryPassword('Dr. Vikram Sarabhai', '+91 98765 43210');
  assert.strictEqual(norm1, 'DrVi3210', `Expected 'DrVi3210', got '${norm1}'`);
  const norm2 = auth.generateEmployeeTemporaryPassword('Mary-Jane Watson', '1-800-555-0199');
  assert.strictEqual(norm2, 'Mary0199', `Expected 'Mary0199', got '${norm2}'`);
  const norm3 = auth.generateEmployeeTemporaryPassword("O'Connor, John", '(555) 012-3456');
  assert.strictEqual(norm3, 'OCon3456', `Expected 'OCon3456', got '${norm3}'`);
  logPass('Name & phone normalization verified: ignores spaces and punctuation, extracts last 4 digits');

  // Input rejection in unit function
  totalTests++;
  assert.throws(() => auth.generateEmployeeTemporaryPassword('Bo', '9876543210'), /at least 4 alphabetic letters/);
  assert.throws(() => auth.generateEmployeeTemporaryPassword('A B C', '9876543210'), /at least 4 alphabetic letters/);
  assert.throws(() => auth.generateEmployeeTemporaryPassword('Rahul', '123'), /at least 4 numeric digits/);
  logPass('Unit validation strictly throws for names < 4 letters or phones < 4 digits');

  // -------------------------------------------------------------
  // INTEGRATION TESTS: HTTP API Server Flow
  // -------------------------------------------------------------
  const testPort = 3991;
  const server = startServer(testPort);
  await new Promise(r => setTimeout(r, 600));
  const serverUrl = `http://localhost:${testPort}`;

  try {
    // SETUP: Register two distinct companies
    console.log(`\n${BOLD}[Setup] Registering two distinct companies for multi-tenancy tests...${RESET}`);
    
    // Company 1: Apex Industrial Solutions
    const regC1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Apex Industrial Solutions',
      industry: 'Advanced Automation',
      adminFullName: 'Ravi Teja',
      email: 'admin@apex-industry.com',
      password: 'ApexSecurePass2026!'
    });
    assert.strictEqual(regC1.status, 201, `Failed to register Company 1: ${JSON.stringify(regC1.body)}`);
    const c1Id = regC1.body.company.id;

    // Login Company 1 Head
    const loginC1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'admin@apex-industry.com',
      password: 'ApexSecurePass2026!'
    });
    assert.strictEqual(loginC1.status, 200, `Failed to login Company 1: ${JSON.stringify(loginC1.body)}`);
    const c1Session = getCookie(loginC1, 'sw_session');
    const c1Csrf = loginC1.body.csrfToken;
    const c1Headers = {
      'Cookie': `sw_session=${c1Session}; sw_csrf=${c1Csrf}`,
      'X-CSRF-Token': c1Csrf
    };
    logPass('Company 1 registered and authenticated successfully');

    // Company 2: Titan Automation Corp
    const regC2 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Titan Automation Corp',
      industry: 'Heavy Robotics',
      adminFullName: 'Sunita Rao',
      email: 'admin@titan-robotics.com',
      password: 'TitanSecurePass2026!'
    });
    assert.strictEqual(regC2.status, 201, `Failed to register Company 2: ${JSON.stringify(regC2.body)}`);
    const c2Id = regC2.body.company.id;

    // Login Company 2 Head
    const loginC2 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'admin@titan-robotics.com',
      password: 'TitanSecurePass2026!'
    });
    assert.strictEqual(loginC2.status, 200, `Failed to login Company 2: ${JSON.stringify(loginC2.body)}`);
    const c2Session = getCookie(loginC2, 'sw_session');
    const c2Csrf = loginC2.body.csrfToken;
    const c2Headers = {
      'Cookie': `sw_session=${c2Session}; sw_csrf=${c2Csrf}`,
      'X-CSRF-Token': c2Csrf
    };
    logPass('Company 2 registered and authenticated successfully');

    // -------------------------------------------------------------
    // TEST 1: Register Arun Kumar -> Arun3210 (Example 1)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 1] Registering Arun Kumar (9876543210) -> Must produce 'Arun3210'...${RESET}`);
    totalTests++;
    const arunRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
      name: 'Arun Kumar',
      department: 'Production',
      role: 'CNC Lead Machinist',
      email: 'arun.kumar@apex-industry.com',
      phone: '9876543210',
      uid: 'AR:UN:32:10'
    });
    assert.strictEqual(arunRes.status, 201, `Expected 201, got ${arunRes.status}: ${JSON.stringify(arunRes.body)}`);
    assert.strictEqual(arunRes.body.temporaryPassword, 'Arun3210', `Expected temporaryPassword 'Arun3210', got '${arunRes.body.temporaryPassword}'`);
    assert.strictEqual(arunRes.body.credentials.temporaryPassword, 'Arun3210');
    assert.strictEqual(arunRes.body.credentials.mustChangePassword, true);
    assert.strictEqual(arunRes.body.email, 'arun.kumar@apex-industry.com');
    assert.strictEqual(arunRes.body.phone, '9876543210');
    logPass("Example 1 HTTP registration verified: 'Arun Kumar' + '9876543210' -> generated 'Arun3210'");

    // -------------------------------------------------------------
    // TEST 2: Register Priya Sharma -> Priy6789 (Example 2)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 2] Registering Priya Sharma (9123456789) -> Must produce 'Priy6789'...${RESET}`);
    totalTests++;
    const priyaRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
      name: 'Priya Sharma',
      department: 'Quality',
      role: 'Quality Assurance Lead',
      email: 'priya.sharma@apex-industry.com',
      phone: '9123456789'
    });
    assert.strictEqual(priyaRes.status, 201, `Expected 201, got ${priyaRes.status}: ${JSON.stringify(priyaRes.body)}`);
    assert.strictEqual(priyaRes.body.temporaryPassword, 'Priy6789', `Expected temporaryPassword 'Priy6789', got '${priyaRes.body.temporaryPassword}'`);
    assert.strictEqual(priyaRes.body.credentials.temporaryPassword, 'Priy6789');
    assert.strictEqual(priyaRes.body.credentials.mustChangePassword, true);
    assert.strictEqual(priyaRes.body.email, 'priya.sharma@apex-industry.com');
    assert.strictEqual(priyaRes.body.phone, '9123456789');
    logPass("Example 2 HTTP registration verified: 'Priya Sharma' + '9123456789' -> generated 'Priy6789'");

    // -------------------------------------------------------------
    // TEST 3: Reject Invalid Name (< 4 letters)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 3] Rejecting invalid employee names (< 4 letters) (400 Bad Request)...${RESET}`);
    const shortNames = ['Bo', 'Li', 'A B C', '---'];
    totalTests++;
    for (const shortName of shortNames) {
      const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
        name: shortName,
        department: 'IT',
        role: 'Technician',
        email: `test.${shortName.replace(/[^a-zA-Z]/g, '') || 'x'}@apex-industry.com`,
        phone: '9876543210'
      });
      assert.strictEqual(res.status, 400, `Expected 400 for short name "${shortName}", got ${res.status}`);
      assert.ok(res.body.error && (res.body.error.includes('4 alphabetic letters') || res.body.error.includes('at least 2 characters')), `Expected validation error: ${res.body.error}`);
    }
    logPass(`All ${shortNames.length} names with < 4 letters rejected with 400 Bad Request`);

    // -------------------------------------------------------------
    // TEST 4: Reject Invalid Phone (< 4 digits or bad format)
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 4] Rejecting invalid phone numbers (< 4 digits or non-numeric) (400 Bad Request)...${RESET}`);
    const badPhones = ['123', 'phone123456', 'abc-defg-hijk', '12'];
    totalTests++;
    for (const badPhone of badPhones) {
      const res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
        name: 'Valid Name Person',
        department: 'Quality',
        role: 'Inspector',
        email: `valid.email.${badPhone.replace(/\D/g, '') || 'none'}@apex-industry.com`,
        phone: badPhone
      });
      assert.strictEqual(res.status, 400, `Expected 400 for bad phone "${badPhone}", got ${res.status}`);
      assert.ok(res.body.error && res.body.error.toLowerCase().includes('phone'), `Error should mention phone: ${res.body.error}`);
    }
    logPass(`All ${badPhones.length} invalid phone numbers rejected with 400 Bad Request`);

    // -------------------------------------------------------------
    // TEST 5: Password Hashing Verification in SQLite Database
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 5] Verifying scrypt password hash & salt storage in SQLite...${RESET}`);
    totalTests++;
    const arunAccount = db.getEmployeeAccountByEmpId(arunRes.body.id);
    assert.ok(arunAccount, 'Account record must exist in employee_accounts');
    assert.ok(arunAccount.password_hash, 'password_hash must be present');
    assert.ok(arunAccount.password_salt, 'password_salt must be present');
    assert.strictEqual(arunAccount.password_hash.length, 128, 'scrypt 64-byte key must produce 128 hex chars');
    assert.strictEqual(arunAccount.password_salt.length, 32, '16-byte salt must produce 32 hex chars');
    // Verify plaintext password is NOT in database
    assert.ok(!arunAccount.password_hash.includes('Arun3210'), 'Plaintext password must NEVER be stored in DB');
    // Verify cryptographic scrypt match
    const isValidScrypt = auth.verifyPassword('Arun3210', arunAccount.password_salt, arunAccount.password_hash);
    assert.strictEqual(isValidScrypt, true, 'Stored hash must verify against temporary password Arun3210');
    const isInvalidScrypt = auth.verifyPassword('WrongPassword123!', arunAccount.password_salt, arunAccount.password_hash);
    assert.strictEqual(isInvalidScrypt, false, 'Stored hash must reject wrong password');
    logPass('Database stores scrypt hash & salt; plaintext temporary password is never persisted');

    // -------------------------------------------------------------
    // TEST 6: First-Login Password Change Enforcement
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 6] Testing employee login with temporary password & mandatory password change...${RESET}`);
    totalTests++;
    // Login with temporary password 'Arun3210'
    const arunLoginRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: arunRes.body.id,
      password: 'Arun3210',
      portalMode: 'EMPLOYEE'
    });
    assert.strictEqual(arunLoginRes.status, 200, `Employee login failed: ${JSON.stringify(arunLoginRes.body)}`);
    assert.strictEqual(arunLoginRes.body.mustChangePassword, true, 'mustChangePassword flag must be true on initial login');
    assert.strictEqual(arunLoginRes.body.user.id, arunRes.body.id);
    assert.ok(arunLoginRes.body.redirectTo.includes('change-password'), 'Expected redirect to change-password');

    const arunSession = getCookie(arunLoginRes, 'sw_session');
    const arunCsrf = arunLoginRes.body.csrfToken;
    const arunHeaders = {
      'Cookie': `sw_session=${arunSession}; sw_csrf=${arunCsrf}`,
      'X-CSRF-Token': arunCsrf
    };

    // Attempting to access dashboard before password change must be blocked (403)
    const blockMeRes = await httpRequest(serverUrl, { method: 'GET', path: '/api/employee/me', headers: arunHeaders });
    assert.strictEqual(blockMeRes.status, 403, 'Employee must be blocked from dashboard before password change');
    assert.strictEqual(blockMeRes.body.mustChangePassword, true);

    // Perform mandatory password change
    const changePassRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/change-password', headers: arunHeaders }, {
      currentPassword: 'Arun3210',
      newPassword: 'PermanentArunPass2026!',
      confirmPassword: 'PermanentArunPass2026!'
    });
    assert.strictEqual(changePassRes.status, 200, `Password change failed: ${JSON.stringify(changePassRes.body)}`);
    assert.strictEqual(changePassRes.body.mustChangePassword, false);

    // Verify database state: must_change_password is now 0
    const updatedAccount = db.getEmployeeAccountByEmpId(arunRes.body.id);
    assert.strictEqual(updatedAccount.must_change_password, 0, 'must_change_password must be cleared to 0');

    // Old temporary password Arun3210 must now fail
    const oldPassLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: arunRes.body.id,
      password: 'Arun3210',
      portalMode: 'EMPLOYEE'
    });
    assert.strictEqual(oldPassLogin.status, 401, 'Old temporary password must no longer work');

    // New permanent password must succeed
    const newPassLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: arunRes.body.id,
      password: 'PermanentArunPass2026!',
      portalMode: 'EMPLOYEE'
    });
    assert.strictEqual(newPassLogin.status, 200, 'New permanent password must succeed');
    assert.strictEqual(newPassLogin.body.mustChangePassword, false);
    logPass('Mandatory password change lifecycle verified: blocks dashboard, updates scrypt hash, invalidates temporary password');

    // -------------------------------------------------------------
    // TEST 7: Multi-Tenancy Scoping & Duplicate Email Prevention
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 7] Verifying company-scoped duplicate email prevention...${RESET}`);
    totalTests++;
    // Re-registering arun.kumar@apex-industry.com in Company 1 must fail (409)
    const dupRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
      name: 'Arun Second',
      department: 'IT',
      role: 'Staff',
      email: 'arun.kumar@apex-industry.com',
      phone: '9988776655'
    });
    assert.strictEqual(dupRes.status, 409, 'Duplicate email in same company must return 409 Conflict');

    // Registering arun.kumar@apex-industry.com in Company 2 must succeed (201)
    const c2EmpRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c2Headers }, {
      name: 'Arun Kumar Titan',
      department: 'Maintenance',
      role: 'Technician',
      email: 'arun.kumar@apex-industry.com',
      phone: '9876543210'
    });
    assert.strictEqual(c2EmpRes.status, 201, 'Same email in Company 2 must succeed');
    assert.strictEqual(c2EmpRes.body.temporaryPassword, 'Arun3210');
    assert.strictEqual(c2EmpRes.body.companyId, c2Id);
    logPass('Multi-tenancy isolation confirmed: duplicate email rejected in Company 1, allowed in Company 2');

    // -------------------------------------------------------------
    // TEST 8: Backward Compatibility with Legacy Calls Omitting Phone
    // -------------------------------------------------------------
    console.log(`\n${BOLD}[Test 8] Testing backward compatibility with legacy calls omitting phone...${RESET}`);
    totalTests++;
    const legacyEmpRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1Headers }, {
      name: 'Legacy Test Employee',
      department: 'Production',
      role: 'Assembler',
      uid: 'FE:DC:BA:11'
    });
    assert.strictEqual(legacyEmpRes.status, 201);
    assert.ok(legacyEmpRes.body.temporaryPassword.length >= 8);
    assert.strictEqual(legacyEmpRes.body.phone, null);
    logPass('Legacy calls omitting phone continue to succeed safely');

    console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
    console.log(`${BOLD}${GREEN} ALL ${passedTests} TEST SUITE ASSERTIONS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})${RESET}`);
    console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);

  } finally {
    server.close();
    // Clean up isolated test database
    setTimeout(() => {
      try {
        if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      } catch (e) {}
    }, 200);
  }
}

runTests().catch(err => {
  logFail('Test suite encountered an uncaught error', err);
  process.exit(1);
});

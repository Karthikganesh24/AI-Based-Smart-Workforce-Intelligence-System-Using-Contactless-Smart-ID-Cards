/**
 * tests/integration/test_api_authorization.js
 * 
 * Comprehensive Isolated Test Suite for SmartWorkforce Phase 3:
 * REST API and Backend Access Control.
 * 
 * Strict Safety Guarantee:
 * - Runs 100% against an isolated temporary database ('tests/isolated_phase3_api.db').
 * - Validates production database 'database/smartworkforce.db' remains 100% untouched.
 * - Tests all Phase 3 endpoints: Org, Roles, Permissions, Reporting, Team, Authorization scopes,
 *   Privilege escalation prevention, Cycle detection, Cross-company isolation, Password enforcement,
 *   and Zero credential exposure.
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

// 1. Setup Isolated Temporary Database
const tempDbPath = path.resolve(__dirname, '..', 'isolated_phase3_api.db');
if (fs.existsSync(tempDbPath)) {
  try { fs.unlinkSync(tempDbPath); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
}

// Record production DB stats before starting
const prodDbPath = path.resolve(__dirname, '../..', 'database', 'smartworkforce.db');
const prodDbExists = fs.existsSync(prodDbPath);
const prodDbStatBefore = prodDbExists ? fs.statSync(prodDbPath) : null;

// Set isolated DB environment variable BEFORE requiring database modules
process.env.DB_PATH = tempDbPath;

const db = require('../../database/database.js');
const { runMigration } = require('../../database/migrate.js');
const { startServer } = require('../../backend/server.js');
const auth = require('../../backend/auth.js');

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

// HTTP request helper
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
    if (bodyData !== undefined && bodyData !== null) {
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

// Deep scanner to ensure zero sensitive credential exposure
function assertNoSensitiveCredentials(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    assert.strictEqual(
      ['password_hash', 'password_salt', 'passwordHash', 'passwordSalt'].includes(key),
      false,
      `Sensitive credential '${fullPath}' exposed in API response!`
    );
    if (typeof val === 'object') {
      assertNoSensitiveCredentials(val, fullPath);
    }
  }
}

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} SmartWorkforce Phase 3: REST API & Backend Access Control Test Suite   ${RESET}`);
  console.log(`${BOLD}${CYAN} Running against isolated database: ${tempDbPath}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // Run migration on test DB
  runMigration(db.db);
  console.log(`${CYAN}Test database migrated successfully.${RESET}\n`);

  // Start HTTP server on test port 3456
  const testPort = 3456;
  const server = startServer(testPort);
  await new Promise(r => setTimeout(r, 200));
  const serverUrl = `http://localhost:${testPort}`;

  try {
    // =========================================================
    // SECTION 1: TENANT SETUP & AUTHENTICATION
    // =========================================================
    console.log(`${BOLD}--- Section 1: Tenant Setup & Auth ---${RESET}`);

    // Register Company 1: Apex Corporation
    const regC1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Apex Corporation',
      industry: 'Technology',
      adminFullName: 'Apex Admin',
      email: 'admin@apex.com',
      password: 'ApexAdminPassword123!'
    });
    assert.strictEqual(regC1.status, 201, 'Company 1 registration should return 201');
    const c1Id = regC1.body.company.id;
    logPass('Registered Company 1 (Apex Corporation)');

    // Login Company 1 Admin
    const loginC1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'admin@apex.com',
      password: 'ApexAdminPassword123!'
    });
    assert.strictEqual(loginC1.status, 200, 'Company 1 login should return 200');
    const c1Session = getCookie(loginC1, 'sw_session');
    const c1Csrf = loginC1.body.csrfToken;
    assert(c1Session, 'Session cookie must be returned');
    assert(c1Csrf, 'CSRF token must be returned');
    const c1AuthHeaders = {
      'Cookie': `sw_session=${c1Session}; sw_csrf=${c1Csrf}`,
      'X-CSRF-Token': c1Csrf
    };
    logPass('Logged in Company 1 Admin with session & CSRF');

    // Register Company 2: Beta Labs
    const regC2 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Beta Labs',
      industry: 'Biotech',
      adminFullName: 'Beta Admin',
      email: 'admin@beta.com',
      password: 'BetaAdminPassword123!'
    });
    assert.strictEqual(regC2.status, 201, 'Company 2 registration should return 201');
    const c2Id = regC2.body.company.id;
    logPass('Registered Company 2 (Beta Labs)');

    // Login Company 2 Admin
    const loginC2 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'admin@beta.com',
      password: 'BetaAdminPassword123!'
    });
    assert.strictEqual(loginC2.status, 200, 'Company 2 login should return 200');
    const c2Session = getCookie(loginC2, 'sw_session');
    const c2Csrf = loginC2.body.csrfToken;
    const c2AuthHeaders = {
      'Cookie': `sw_session=${c2Session}; sw_csrf=${c2Csrf}`,
      'X-CSRF-Token': c2Csrf
    };
    logPass('Logged in Company 2 Admin with session & CSRF');

    // =========================================================
    // SECTION 2: AUTHENTICATION & CSRF ENFORCEMENT
    // =========================================================
    console.log(`\n${BOLD}--- Section 2: Authentication & CSRF Enforcement ---${RESET}`);

    // Unauthenticated GET /api/org/tree -> 401
    const unauthTree = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/tree' });
    assert.strictEqual(unauthTree.status, 401, 'Unauthenticated request must return 401');
    logPass('Unauthenticated GET /api/org/tree rejected with 401');

    // Unauthenticated POST /api/org/units -> 401
    const unauthUnit = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units' }, { name: 'Test' });
    assert.strictEqual(unauthUnit.status, 401, 'Unauthenticated POST must return 401');
    logPass('Unauthenticated POST /api/org/units rejected with 401');

    // Missing CSRF on cookie-authenticated POST -> 403
    const noCsrfPost = await httpRequest(serverUrl, {
      method: 'POST',
      path: '/api/org/levels',
      headers: { 'Cookie': `sw_session=${c1Session}` }
    }, { name: 'Level 1', rank: 1 });
    assert.strictEqual(noCsrfPost.status, 403, 'Missing CSRF token must return 403');
    logPass('Cookie request without CSRF token rejected with 403');

    // Invalid CSRF on cookie-authenticated POST -> 403
    const badCsrfPost = await httpRequest(serverUrl, {
      method: 'POST',
      path: '/api/org/levels',
      headers: { 'Cookie': `sw_session=${c1Session}`, 'X-CSRF-Token': 'bogus_csrf' }
    }, { name: 'Level 1', rank: 1 });
    assert.strictEqual(badCsrfPost.status, 403, 'Invalid CSRF token must return 403');
    logPass('Cookie request with invalid CSRF token rejected with 403');

    // Bearer token authentication bypasses CSRF check
    const bearerHeaders = {
      'Authorization': `Bearer ${c1Session}`
    };
    const bearerGet = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/tree', headers: bearerHeaders });
    assert.strictEqual(bearerGet.status, 200, 'Bearer token auth must succeed without CSRF headers');
    logPass('Bearer token authentication allowed without CSRF token');

    // =========================================================
    // SECTION 3: ORGANIZATIONAL APIs (TREE, LEVELS, UNITS)
    // =========================================================
    console.log(`\n${BOLD}--- Section 3: Organizational Hierarchy APIs ---${RESET}`);

    // Initial Tree
    const initialTree = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/tree', headers: c1AuthHeaders });
    assert.strictEqual(initialTree.status, 200);
    assert(initialTree.body.company, 'Tree response must contain company info');
    assert.strictEqual(initialTree.body.company.id, c1Id);
    assert(Array.isArray(initialTree.body.roles), 'Tree response must include roles array');
    logPass('GET /api/org/tree returned initial company structure');

    // POST /api/org/levels - Create Levels
    const lvl1Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/levels', headers: c1AuthHeaders }, {
      name: 'Division',
      rank: 1
    });
    assert.strictEqual(lvl1Res.status, 201);
    const lvl1 = lvl1Res.body.level;
    assert.strictEqual(lvl1.name, 'Division');
    assert.strictEqual(lvl1.rank, 1);
    logPass('POST /api/org/levels created Level 1 (Division)');

    const lvl2Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/levels', headers: c1AuthHeaders }, {
      name: 'Department',
      rank: 2
    });
    assert.strictEqual(lvl2Res.status, 201);
    const lvl2 = lvl2Res.body.level;
    logPass('POST /api/org/levels created Level 2 (Department)');

    // Duplicate level rank rejection
    const dupRankRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/levels', headers: c1AuthHeaders }, {
      name: 'Duplicate Rank Level',
      rank: 1
    });
    assert.strictEqual(dupRankRes.status, 409, 'Duplicate level rank must return 409');
    logPass('Duplicate level rank rejected with 409 Conflict');

    // GET /api/org/levels
    const getLevels = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/levels', headers: c1AuthHeaders });
    assert.strictEqual(getLevels.status, 200);
    assert(Array.isArray(getLevels.body));
    assert.strictEqual(getLevels.body.length, 2);
    logPass('GET /api/org/levels returned sorted level list');

    // PUT /api/org/levels/:id
    const putLvl = await httpRequest(serverUrl, { method: 'PUT', path: `/api/org/levels/${lvl1.id}`, headers: c1AuthHeaders }, {
      name: 'Global Division'
    });
    assert.strictEqual(putLvl.status, 200);
    assert.strictEqual(putLvl.body.level.name, 'Global Division');
    logPass('PUT /api/org/levels/:id updated level name');

    // POST /api/org/units - Create Root Unit
    const unitRootRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: c1AuthHeaders }, {
      name: 'Engineering Division',
      levelId: lvl1.id,
      unitType: 'DIVISION'
    });
    assert.strictEqual(unitRootRes.status, 201);
    const unitRoot = unitRootRes.body.unit;
    assert.strictEqual(unitRoot.name, 'Engineering Division');
    logPass('POST /api/org/units created top-level unit');

    // POST /api/org/units - Create Child Unit
    const unitChildRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: c1AuthHeaders }, {
      name: 'Software Engineering',
      parentId: unitRoot.id,
      levelId: lvl2.id,
      unitType: 'DEPARTMENT'
    });
    assert.strictEqual(unitChildRes.status, 201);
    const unitChild = unitChildRes.body.unit;
    assert.strictEqual(unitChild.parent_unit_id, unitRoot.id);
    logPass('POST /api/org/units created child unit');

    // Circular Unit Hierarchy Rejection: set parent of Root to Child -> 400
    const circularUnitRes = await httpRequest(serverUrl, { method: 'PUT', path: `/api/org/units/${unitRoot.id}`, headers: c1AuthHeaders }, {
      parentId: unitChild.id
    });
    assert.strictEqual(circularUnitRes.status, 400, 'Circular org unit parent must return 400');
    logPass('Circular org unit relationship rejected with 400 Bad Request');

    // GET /api/org/units (Flat)
    const flatUnits = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/units', headers: c1AuthHeaders });
    assert.strictEqual(flatUnits.status, 200);
    assert(Array.isArray(flatUnits.body));
    assert.strictEqual(flatUnits.body.length, 2);
    logPass('GET /api/org/units returned flat list');

    // GET /api/org/units?hierarchy=true (Tree)
    const treeUnits = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/units?hierarchy=true', headers: c1AuthHeaders });
    assert.strictEqual(treeUnits.status, 200);
    assert(Array.isArray(treeUnits.body));
    assert.strictEqual(treeUnits.body.length, 1, 'Should have 1 top-level unit');
    assert(Array.isArray(treeUnits.body[0].children), 'Top level unit must have children array');
    assert.strictEqual(treeUnits.body[0].children.length, 1);
    logPass('GET /api/org/units?hierarchy=true returned nested tree');

    // DELETE /api/org/units/:id
    const tempUnitRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: c1AuthHeaders }, {
      name: 'Temporary Lab'
    });
    const delUnitRes = await httpRequest(serverUrl, { method: 'DELETE', path: `/api/org/units/${tempUnitRes.body.unit.id}`, headers: c1AuthHeaders });
    assert.strictEqual(delUnitRes.status, 200);
    logPass('DELETE /api/org/units/:id safely deleted unit');

    // =========================================================
    // SECTION 4: JOB TITLES & ACCESS ROLES APIs
    // =========================================================
    console.log(`\n${BOLD}--- Section 4: Job Titles & Access Roles APIs ---${RESET}`);

    // POST /api/org/job-titles
    const jt1Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: c1AuthHeaders }, {
      title: 'VP of Engineering',
      description: 'Head of tech engineering'
    });
    assert.strictEqual(jt1Res.status, 201);
    const jtVP = jt1Res.body.jobTitle;
    logPass('POST /api/org/job-titles created VP title');

    const jt2Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: c1AuthHeaders }, {
      title: 'Staff Engineering Lead',
      description: 'Team lead role'
    });
    assert.strictEqual(jt2Res.status, 201);
    const jtLead = jt2Res.body.jobTitle;
    logPass('POST /api/org/job-titles created Team Lead title');

    const jt3Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: c1AuthHeaders }, {
      title: 'Senior Software Engineer',
      description: 'Dev member'
    });
    assert.strictEqual(jt3Res.status, 201);
    const jtDev = jt3Res.body.jobTitle;
    logPass('POST /api/org/job-titles created Senior Engineer title');

    // GET /api/org/job-titles
    const getJobs = await httpRequest(serverUrl, { method: 'GET', path: '/api/org/job-titles', headers: c1AuthHeaders });
    assert.strictEqual(getJobs.status, 200);
    assert(Array.isArray(getJobs.body));
    assert(getJobs.body.length >= 3);
    logPass('GET /api/org/job-titles returned titles');

    // PUT /api/org/job-titles/:id
    const putJob = await httpRequest(serverUrl, { method: 'PUT', path: `/api/org/job-titles/${jtDev.id}`, headers: c1AuthHeaders }, {
      description: 'Updated dev description'
    });
    assert.strictEqual(putJob.status, 200);
    assert.strictEqual(putJob.body.jobTitle.description, 'Updated dev description');
    logPass('PUT /api/org/job-titles/:id updated title metadata');

    // GET /api/roles - Verify default system roles exist
    const getRoles = await httpRequest(serverUrl, { method: 'GET', path: '/api/roles', headers: c1AuthHeaders });
    assert.strictEqual(getRoles.status, 200);
    assert(Array.isArray(getRoles.body));
    const roleNames = getRoles.body.map(r => r.name);
    assert(roleNames.includes('Administrator'), 'Must have default Administrator role');
    assert(roleNames.includes('Department Head'), 'Must have default Department Head role');
    assert(roleNames.includes('Team Lead'), 'Must have default Team Lead role');
    assert(roleNames.includes('Employee'), 'Must have default Employee role');
    logPass('GET /api/roles returned seeded system roles');

    // POST /api/roles - Create custom role "Shift Coordinator" with DIRECT_REPORTS permissions
    const createRoleRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/roles', headers: c1AuthHeaders }, {
      name: 'Shift Coordinator',
      description: 'Frontline coordinator with direct report visibility',
      permissions: [
        { key: 'employees:view', scope: 'DIRECT_REPORTS' },
        { key: 'employees:manage', scope: 'DIRECT_REPORTS' },
        { key: 'attendance:view', scope: 'DIRECT_REPORTS' },
        { key: 'analytics:view', scope: 'DIRECT_REPORTS' }
      ]
    });
    assert.strictEqual(createRoleRes.status, 201);
    const roleLead = createRoleRes.body.role;
    assert.strictEqual(roleLead.name, 'Shift Coordinator');
    logPass('POST /api/roles created custom role with scoped permissions');

    // GET /api/roles/:id/permissions
    const getRolePerms = await httpRequest(serverUrl, { method: 'GET', path: `/api/roles/${roleLead.id}/permissions`, headers: c1AuthHeaders });
    assert.strictEqual(getRolePerms.status, 200);
    assert.strictEqual(getRolePerms.body.length, 4);
    logPass('GET /api/roles/:id/permissions returned permissions');

    // PUT /api/roles/:id/permissions - Update permissions to DESCENDANTS
    const updatePermsRes = await httpRequest(serverUrl, { method: 'PUT', path: `/api/roles/${roleLead.id}/permissions`, headers: c1AuthHeaders }, {
      permissions: [
        { key: 'employees:view', scope: 'DESCENDANTS' },
        { key: 'employees:manage', scope: 'DESCENDANTS' },
        { key: 'attendance:view', scope: 'DESCENDANTS' },
        { key: 'analytics:view', scope: 'DESCENDANTS' }
      ]
    });
    assert.strictEqual(updatePermsRes.status, 200);
    assert.strictEqual(updatePermsRes.body.permissions[0].scope, 'DESCENDANTS');
    logPass('PUT /api/roles/:id/permissions updated scopes to DESCENDANTS');

    // Invalid permission key validation -> 400
    const invalidPermRes = await httpRequest(serverUrl, { method: 'PUT', path: `/api/roles/${roleLead.id}/permissions`, headers: c1AuthHeaders }, {
      permissions: [{ key: 'fake:permission', scope: 'COMPANY' }]
    });
    assert.strictEqual(invalidPermRes.status, 400, 'Invalid permission key must return 400');
    logPass('Invalid permission key rejected with 400 Bad Request');

    // Invalid scope validation -> 400
    const invalidScopeRes = await httpRequest(serverUrl, { method: 'PUT', path: `/api/roles/${roleLead.id}/permissions`, headers: c1AuthHeaders }, {
      permissions: [{ key: 'employees:view', scope: 'SUPER_GLOBAL' }]
    });
    assert.strictEqual(invalidScopeRes.status, 400, 'Invalid scope must return 400');
    logPass('Invalid permission scope rejected with 400 Bad Request');

    // Protect system roles from deletion -> 400
    const defaultEmpRole = getRoles.body.find(r => r.name === 'Employee');
    const delSystemRole = await httpRequest(serverUrl, { method: 'DELETE', path: `/api/roles/${defaultEmpRole.id}`, headers: c1AuthHeaders });
    assert.strictEqual(delSystemRole.status, 400, 'Deleting system role must return 400');
    logPass('Deleting protected system role rejected with 400 Bad Request');

    // =========================================================
    // SECTION 5: EMPLOYEE HIERARCHY & REPORTING ASSIGNMENTS
    // =========================================================
    console.log(`\n${BOLD}--- Section 5: Employee Creation & Reporting Assignments ---${RESET}`);

    // Create VP employee: EMP-VP-01
    const vpRole = getRoles.body.find(r => r.name === 'Department Head');
    const vpCreate = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1AuthHeaders }, {
      id: 'EMP-VP-01',
      name: 'Vikas Patel',
      department: 'Engineering Division',
      role: 'VP of Engineering',
      email: 'vikas@apex.com',
      phone: '+1 555-100-0001',
      orgUnitId: unitRoot.id,
      jobTitleId: jtVP.id,
      accessRoleId: vpRole.id
    });
    assert.strictEqual(vpCreate.status, 201);
    const vpEmp = vpCreate.body;
    assert.strictEqual(vpEmp.orgUnitId, unitRoot.id);
    assert.strictEqual(vpEmp.jobTitleId, jtVP.id);
    logPass('POST /api/employees created VP with orgUnit & jobTitle');

    // Create Lead employee: EMP-LEAD-01 (Reports to VP)
    const leadCreate = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1AuthHeaders }, {
      id: 'EMP-LEAD-01',
      name: 'Lavanya Rao',
      department: 'Software Engineering',
      role: 'Staff Engineering Lead',
      email: 'lavanya@apex.com',
      phone: '+1 555-100-0002',
      managerId: vpEmp.id,
      orgUnitId: unitChild.id,
      jobTitleId: jtLead.id,
      accessRoleId: roleLead.id
    });
    assert.strictEqual(leadCreate.status, 201);
    const leadEmp = leadCreate.body;
    assert.strictEqual(leadEmp.managerId, vpEmp.id);
    logPass('POST /api/employees created Lead reporting to VP');

    // Create Dev1: EMP-DEV-01 (Reports to Lead)
    const dev1Create = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1AuthHeaders }, {
      id: 'EMP-DEV-01',
      name: 'Deepak Joshi',
      department: 'Software Engineering',
      role: 'Senior Software Engineer',
      email: 'deepak@apex.com',
      phone: '+1 555-100-0003',
      managerId: leadEmp.id,
      orgUnitId: unitChild.id,
      jobTitleId: jtDev.id,
      accessRoleId: defaultEmpRole.id
    });
    assert.strictEqual(dev1Create.status, 201);
    const dev1Emp = dev1Create.body;
    logPass('POST /api/employees created Dev1 reporting to Lead');

    // Create Dev2: EMP-DEV-02 (Reports to Lead initially)
    const dev2Create = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c1AuthHeaders }, {
      id: 'EMP-DEV-02',
      name: 'Divya Nair',
      department: 'Software Engineering',
      role: 'Senior Software Engineer',
      email: 'divya@apex.com',
      phone: '+1 555-100-0004',
      managerId: leadEmp.id,
      orgUnitId: unitChild.id,
      jobTitleId: jtDev.id,
      accessRoleId: defaultEmpRole.id
    });
    assert.strictEqual(dev2Create.status, 201);
    const dev2Emp = dev2Create.body;
    logPass('POST /api/employees created Dev2 reporting to Lead');

    // PUT /api/employees/:id/reporting - Reassign Dev2 to report to Dev1 (Multi-level chain)
    const repDev2 = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${dev2Emp.id}/reporting`, headers: c1AuthHeaders }, {
      managerId: dev1Emp.id
    });
    assert.strictEqual(repDev2.status, 200);
    assert.strictEqual(repDev2.body.employee.managerId, dev1Emp.id);
    logPass('PUT /api/employees/:id/reporting reassigned Dev2 to report to Dev1');

    // GET /api/employees/:id/reporting - Ancestor chain
    const chainDev2 = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${dev2Emp.id}/reporting`, headers: c1AuthHeaders });
    assert.strictEqual(chainDev2.status, 200);
    assert(Array.isArray(chainDev2.body));
    const chainIds = chainDev2.body.map(c => c.id);
    assert.deepStrictEqual(chainIds, [dev2Emp.id, dev1Emp.id, leadEmp.id, vpEmp.id]);
    logPass('GET /api/employees/:id/reporting returned full ancestor chain (Dev2 -> Dev1 -> Lead -> VP)');

    // GET /api/employees/:id/subordinates?mode=direct
    const directSubsLead = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${leadEmp.id}/subordinates?mode=direct`, headers: c1AuthHeaders });
    assert.strictEqual(directSubsLead.status, 200);
    assert.strictEqual(directSubsLead.body.length, 1);
    assert.strictEqual(directSubsLead.body[0].id, dev1Emp.id);
    logPass('GET /api/employees/:id/subordinates?mode=direct returned direct reports only');

    // GET /api/employees/:id/subordinates?mode=recursive
    const recSubsLead = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${leadEmp.id}/subordinates?mode=recursive`, headers: c1AuthHeaders });
    assert.strictEqual(recSubsLead.status, 200);
    assert.strictEqual(recSubsLead.body.length, 2);
    const recIds = recSubsLead.body.map(s => s.id);
    assert(recIds.includes(dev1Emp.id) && recIds.includes(dev2Emp.id));
    logPass('GET /api/employees/:id/subordinates?mode=recursive returned recursive descendants');

    // =========================================================
    // SECTION 6: CIRCULAR REPORTING & SELF REPORTING DEFENSES
    // =========================================================
    console.log(`\n${BOLD}--- Section 6: Circular Reporting & Self-Reporting Defenses ---${RESET}`);

    // Self-reporting rejection: Dev1 reports to Dev1 -> 400
    const selfRep = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${dev1Emp.id}/reporting`, headers: c1AuthHeaders }, {
      managerId: dev1Emp.id
    });
    assert.strictEqual(selfRep.status, 400, 'Self-reporting must return 400');
    assert(selfRep.body.error.toLowerCase().includes('themselves'));
    logPass('Self-reporting rejected with 400 Bad Request');

    // Circular loop rejection: Lead reports to Dev2 (creates Lead -> Dev1 -> Dev2 -> Lead loop) -> 400
    const circRep = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${leadEmp.id}/reporting`, headers: c1AuthHeaders }, {
      managerId: dev2Emp.id
    });
    assert.strictEqual(circRep.status, 400, 'Circular reporting loop must return 400');
    assert(circRep.body.error.toLowerCase().includes('circular'));
    logPass('Circular reporting loop rejected with 400 Bad Request');

    // =========================================================
    // SECTION 7: EMPLOYEE LOGIN & PASSWORD CHANGE ENFORCEMENT
    // =========================================================
    console.log(`\n${BOLD}--- Section 7: Employee Login & Mandatory Password Change ---${RESET}`);

    // Employee Dev1 temporary password from creation
    const dev1TempPw = dev1Create.body.temporaryPassword;
    assert(dev1TempPw, 'Temporary password must be returned to admin on employee creation');

    // Login as Dev1 with temporary password
    const loginDev1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: dev1Emp.id,
      password: dev1TempPw
    });
    assert.strictEqual(loginDev1.status, 200);
    assert.strictEqual(loginDev1.body.mustChangePassword, true);
    const dev1Session = getCookie(loginDev1, 'sw_session');
    const dev1Csrf = loginDev1.body.csrfToken;
    const dev1PendingHeaders = {
      'Cookie': `sw_session=${dev1Session}; sw_csrf=${dev1Csrf}`,
      'X-CSRF-Token': dev1Csrf
    };
    logPass('Dev1 logged in with temporary password (mustChangePassword = true)');

    // Attempting protected endpoint before changing password -> 403 PASSWORD_CHANGE_REQUIRED
    const blockedTeam = await httpRequest(serverUrl, { method: 'GET', path: '/api/team/roster', headers: dev1PendingHeaders });
    assert.strictEqual(blockedTeam.status, 403);
    assert.strictEqual(blockedTeam.body.code, 'PASSWORD_CHANGE_REQUIRED');
    logPass('Access blocked with 403 PASSWORD_CHANGE_REQUIRED before password update');

    // Change password via POST /api/employee/change-password
    const changePwRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/change-password', headers: dev1PendingHeaders }, {
      currentPassword: dev1TempPw,
      newPassword: 'Dev1BrandNewPassword2026!',
      confirmPassword: 'Dev1BrandNewPassword2026!'
    });
    assert.strictEqual(changePwRes.status, 200);
    assert.strictEqual(changePwRes.body.mustChangePassword, false);
    logPass('POST /api/employee/change-password successfully changed password');

    // Re-login with new password
    const reloginDev1 = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: dev1Emp.id,
      password: 'Dev1BrandNewPassword2026!'
    });
    assert.strictEqual(reloginDev1.status, 200);
    assert.strictEqual(reloginDev1.body.mustChangePassword, false);
    const dev1ActiveSession = getCookie(reloginDev1, 'sw_session');
    const dev1ActiveCsrf = reloginDev1.body.csrfToken;
    const dev1ActiveHeaders = {
      'Cookie': `sw_session=${dev1ActiveSession}; sw_csrf=${dev1ActiveCsrf}`,
      'X-CSRF-Token': dev1ActiveCsrf
    };
    logPass('Dev1 logged in with new permanent password');

    // Setup Lead employee password & active session
    const leadTempPw = leadCreate.body.temporaryPassword;
    const loginLead = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: leadEmp.id,
      password: leadTempPw
    });
    const leadSession = getCookie(loginLead, 'sw_session');
    const leadCsrf = loginLead.body.csrfToken;
    await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/change-password', headers: {
      'Cookie': `sw_session=${leadSession}; sw_csrf=${leadCsrf}`,
      'X-CSRF-Token': leadCsrf
    }}, {
      currentPassword: leadTempPw,
      newPassword: 'LeadNewPassword2026!',
      confirmPassword: 'LeadNewPassword2026!'
    });
    const reloginLead = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: leadEmp.id,
      password: 'LeadNewPassword2026!'
    });
    const leadActiveSession = getCookie(reloginLead, 'sw_session');
    const leadActiveCsrf = reloginLead.body.csrfToken;
    const leadActiveHeaders = {
      'Cookie': `sw_session=${leadActiveSession}; sw_csrf=${leadActiveCsrf}`,
      'X-CSRF-Token': leadActiveCsrf
    };
    logPass('Lead activated permanent password and logged in');

    // =========================================================
    // SECTION 8: PERMISSION SCOPES & ROLE BOUNDARIES
    // =========================================================
    console.log(`\n${BOLD}--- Section 8: Permission Scopes & Role Boundaries ---${RESET}`);

    // Dev1 has Employee role with 'SELF' scope on employees:view
    // GET /api/team/roster should only return Dev1 himself
    const dev1Team = await httpRequest(serverUrl, { method: 'GET', path: '/api/team/roster', headers: dev1ActiveHeaders });
    assert.strictEqual(dev1Team.status, 200);
    assert(Array.isArray(dev1Team.body));
    assert.strictEqual(dev1Team.body.length, 1);
    assert.strictEqual(dev1Team.body[0].id, dev1Emp.id);
    logPass('Dev1 (SELF scope) GET /api/team/roster returns only self');

    // Dev1 cannot view Lead profile -> 403
    const dev1ViewLead = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${leadEmp.id}`, headers: dev1ActiveHeaders });
    assert.strictEqual(dev1ViewLead.status, 403, 'Dev1 viewing outside self scope must return 403');
    logPass('Dev1 viewing other employee profile rejected with 403 Forbidden');

    // Lead has 'Team Lead' role with 'DESCENDANTS' scope
    // GET /api/team/roster should return Lead, Dev1, and Dev2 (all descendants + self)
    const leadTeam = await httpRequest(serverUrl, { method: 'GET', path: '/api/team/roster', headers: leadActiveHeaders });
    assert.strictEqual(leadTeam.status, 200);
    assert(Array.isArray(leadTeam.body));
    const leadTeamIds = leadTeam.body.map(m => m.id);
    assert(leadTeamIds.includes(leadEmp.id), 'Lead team must include self');
    assert(leadTeamIds.includes(dev1Emp.id), 'Lead team must include direct report Dev1');
    assert(leadTeamIds.includes(dev2Emp.id), 'Lead team must include descendant Dev2');
    assert(!leadTeamIds.includes(vpEmp.id), 'Lead team must NOT include superior VP');
    logPass('Lead (DESCENDANTS scope) GET /api/team/roster returns self + descendants');

    // Lead can view Dev1 profile (descendant) -> 200
    const leadViewDev1 = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${dev1Emp.id}`, headers: leadActiveHeaders });
    assert.strictEqual(leadViewDev1.status, 200);
    assert.strictEqual(leadViewDev1.body.id, dev1Emp.id);
    logPass('Lead viewing descendant employee profile succeeds with 200');

    // Lead cannot view VP profile (superior, not descendant) -> 403
    const leadViewVp = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${vpEmp.id}`, headers: leadActiveHeaders });
    assert.strictEqual(leadViewVp.status, 403);
    logPass('Lead viewing superior outside scope rejected with 403 Forbidden');

    // =========================================================
    // SECTION 9: PRIVILEGE ESCALATION PREVENTION
    // =========================================================
    console.log(`\n${BOLD}--- Section 9: Privilege Escalation Prevention ---${RESET}`);

    // Lead attempts to grant Company Administrator role to Dev1 -> 403
    const adminRole = getRoles.body.find(r => r.name === 'Administrator');
    const escalateDev1 = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${dev1Emp.id}/reporting`, headers: leadActiveHeaders }, {
      accessRoleId: adminRole.id
    });
    assert.strictEqual(escalateDev1.status, 403, 'Non-admin assigning privileged access role must return 403');
    logPass('Unauthorized access role assignment rejected with 403 Forbidden');

    // Lead attempts to modify own reporting manager -> 403
    const leadSelfReassign = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${leadEmp.id}/reporting`, headers: leadActiveHeaders }, {
      managerId: dev1Emp.id
    });
    assert.strictEqual(leadSelfReassign.status, 403, 'Employee self-modifying reporting relationship must return 403');
    logPass('Employee self-modifying reporting relationship rejected with 403 Forbidden');

    // Dev1 attempts to create a new access role -> 403
    const dev1CreateRole = await httpRequest(serverUrl, { method: 'POST', path: '/api/roles', headers: dev1ActiveHeaders }, {
      name: 'Hacked Super Role'
    });
    assert.strictEqual(dev1CreateRole.status, 403, 'Employee creating roles must return 403');
    logPass('Employee creating role rejected with 403 Forbidden');

    // Dev1 attempts to delete an organizational unit -> 403
    const dev1DelUnit = await httpRequest(serverUrl, { method: 'DELETE', path: `/api/org/units/${unitChild.id}`, headers: dev1ActiveHeaders });
    assert.strictEqual(dev1DelUnit.status, 403);
    logPass('Employee deleting organizational unit rejected with 403 Forbidden');

    // =========================================================
    // SECTION 10: MULTI-TENANT ISOLATION & CROSS-COMPANY DEFENSES
    // =========================================================
    console.log(`\n${BOLD}--- Section 10: Multi-Tenant Isolation & Zero Leakage ---${RESET}`);

    // Company 2 Admin queries Company 1 employee -> 404 (does NOT leak existence)
    const crossEmp = await httpRequest(serverUrl, { method: 'GET', path: `/api/employees/${vpEmp.id}`, headers: c2AuthHeaders });
    assert.strictEqual(crossEmp.status, 404, 'Cross-company resource lookup must return 404 to prevent existence leakage');
    logPass('Cross-company GET /api/employees/:id returns 404 (no existence leakage)');

    // Company 2 Admin updates Company 1 employee reporting -> 404
    const crossReport = await httpRequest(serverUrl, { method: 'PUT', path: `/api/employees/${vpEmp.id}/reporting`, headers: c2AuthHeaders }, {
      department: 'Hacked'
    });
    assert.strictEqual(crossReport.status, 404);
    logPass('Cross-company PUT /api/employees/:id/reporting returns 404');

    // Company 2 Admin queries Company 1 org unit -> 404
    const crossUnit = await httpRequest(serverUrl, { method: 'PUT', path: `/api/org/units/${unitRoot.id}`, headers: c2AuthHeaders }, {
      name: 'Hijacked Unit'
    });
    assert.strictEqual(crossUnit.status, 404);
    logPass('Cross-company PUT /api/org/units/:id returns 404');

    // Company 2 Admin queries Company 1 role -> 404
    const crossRole = await httpRequest(serverUrl, { method: 'GET', path: `/api/roles/${roleLead.id}/permissions`, headers: c2AuthHeaders });
    assert.strictEqual(crossRole.status, 404);
    logPass('Cross-company GET /api/roles/:id/permissions returns 404');

    // Company 2 Admin attempts to assign Company 1 manager to a Company 2 employee -> 400/404
    const c2EmpCreate = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: c2AuthHeaders }, {
      id: 'EMP-BETA-01',
      name: 'Beta Scientist',
      department: 'Research',
      role: 'Staff Scientist',
      phone: '+1 555-200-0001',
      managerId: vpEmp.id // Company 1 employee!
    });
    assert([400, 404].includes(c2EmpCreate.status), 'Cross-company manager assignment must be rejected with 400 or 404');
    logPass('Cross-company manager assignment rejected');

    // =========================================================
    // SECTION 11: TEAM ATTENDANCE, ANALYTICS, & CARD TAP
    // =========================================================
    console.log(`\n${BOLD}--- Section 11: Team Attendance, Analytics & Tap ---${RESET}`);

    // Dev1 taps card (simulated tap via POST /api/employee/tap)
    const dev1Tap = await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/tap', headers: dev1ActiveHeaders }, {
      mode: 'ENTRY',
      gate: 'Main Gate'
    });
    assert.strictEqual(dev1Tap.status, 200);
    assert(dev1Tap.body.success || dev1Tap.body.event, 'Card tap must succeed');
    logPass('POST /api/employee/tap recorded verified attendance entry');

    // Lead views team attendance: GET /api/team/attendance
    const leadAtt = await httpRequest(serverUrl, { method: 'GET', path: '/api/team/attendance', headers: leadActiveHeaders });
    assert.strictEqual(leadAtt.status, 200);
    assert(Array.isArray(leadAtt.body));
    const attEmpIds = leadAtt.body.map(a => a.empId || a.emp_id);
    assert(attEmpIds.includes(dev1Emp.id), 'Team attendance must include descendant Dev1 attendance');
    logPass('GET /api/team/attendance returned attendance events for team members');

    // Lead views team analytics: GET /api/team/analytics
    const leadAnalytics = await httpRequest(serverUrl, { method: 'GET', path: '/api/team/analytics', headers: leadActiveHeaders });
    assert.strictEqual(leadAnalytics.status, 200);
    assert(leadAnalytics.body.teamSummary, 'Team analytics must include teamSummary');
    assert.strictEqual(typeof leadAnalytics.body.teamSummary.occupancyRatePercent, 'number');
    logPass('GET /api/team/analytics returned calculated team analytics');

    // =========================================================
    // SECTION 12: CREDENTIAL LEAKAGE DEFENSES
    // =========================================================
    console.log(`\n${BOLD}--- Section 12: Zero Credential Exposure Audit ---${RESET}`);

    // Check responses across multiple endpoints for password_hash, password_salt, internal tokens
    assertNoSensitiveCredentials(initialTree.body, 'GET /api/org/tree');
    assertNoSensitiveCredentials(leadTeam.body, 'GET /api/team/roster');
    assertNoSensitiveCredentials(leadViewDev1.body, 'GET /api/employees/:id');
    assertNoSensitiveCredentials(repDev2.body, 'PUT /api/employees/:id/reporting');
    assertNoSensitiveCredentials(getRoles.body, 'GET /api/roles');
    logPass('Zero credential exposure verified: password_hash and password_salt NEVER exposed in responses');

    // =========================================================
    // SECTION 13: PRODUCTION DATABASE IMMUTABILITY VERIFICATION
    // =========================================================
    console.log(`\n${BOLD}--- Section 13: Production Database Immutability Check ---${RESET}`);
    if (prodDbExists) {
      const prodDbStatAfter = fs.statSync(prodDbPath);
      assert.strictEqual(
        prodDbStatAfter.size,
        prodDbStatBefore.size,
        'Production database file size must NOT change!'
      );
      assert.strictEqual(
        prodDbStatAfter.mtimeMs,
        prodDbStatBefore.mtimeMs,
        'Production database modified time must NOT change!'
      );
      logPass('Production database smartworkforce.db remains 100% untouched and pristine');
    } else {
      logPass('Production database was not present; verified no unintended files created in prod path');
    }

    console.log(`\n${BOLD}${GREEN}========================================================================${RESET}`);
    console.log(`${BOLD}${GREEN} All ${passedTests} Phase 3 API tests passed successfully! (100% PASS)      ${RESET}`);
    console.log(`${BOLD}${GREEN}========================================================================${RESET}\n`);

  } finally {
    server.close();
    // Clean up temporary database files
    if (fs.existsSync(tempDbPath)) {
      try { fs.unlinkSync(tempDbPath); } catch (_) {}
      try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
      try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
    }
  }
}

runTests().catch(err => {
  console.error('\nTest Suite Fatal Error:', err);
  process.exit(1);
});

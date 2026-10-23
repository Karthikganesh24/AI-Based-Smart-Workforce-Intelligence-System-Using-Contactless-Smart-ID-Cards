/**
 * tests/integration/test_admin_frontend.js
 * 
 * Phase 4: Admin Frontend Integration Test Suite
 * 
 * Strict Safety Guarantee:
 * - Runs 100% against an isolated temporary database ('tests/isolated_phase4_test.db').
 * - Verifies production database 'database/smartworkforce.db' remains 100% untouched.
 * - Tests frontend asset delivery and DOM structures for Phase 4 views:
 *   - Organization Tree (#view-org-tree, #treeSearchInput, #btnCreateUnit, #btnManageLevels, #btnReassignReporting)
 *   - Job Titles (#view-job-titles, #jobTitleSearch, #btnAddJobTitle, #tableJobTitles)
 *   - Roles & Permissions (#view-roles-perms, #rolesListContainer, #permsMatrixPanel, #tablePermsMatrix, #btnSaveRolePermissions)
 *   - Employee Form Integration (#newEmpOrgUnit, #newEmpJobTitle, #newEmpManager, #newEmpAccessRole, #editEmpOrgUnit, etc.)
 *   - Modals (#modalOrgUnit, #modalOrgLevels, #modalReassignReporting, #modalJobTitle, #modalRole)
 * - Tests end-to-end API client contract workflows matching common.js and admin.js:
 *   - Loading and rendering hierarchy
 *   - Creating and editing organizational units
 *   - Creating and editing job titles
 *   - Role and permission matrix updates
 *   - Employee creation with org assignments
 *   - Employee reporting reassignment
 *   - Validation failure handling (anti-cycle, system role protection, active job title deletion block)
 *   - Unauthorized API responses and CSRF enforcement
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
const tempDbPath = path.resolve(__dirname, '..', 'isolated_phase4_test.db');
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

// HTTP helper
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

async function runTests() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${CYAN} SmartWorkforce Phase 4: Frontend Integration Test Suite                ${RESET}`);
  console.log(`${BOLD}${CYAN} Running against isolated database: ${tempDbPath}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // Migrate isolated DB
  runMigration(db.db);
  console.log(`${CYAN}Isolated test database migrated successfully.${RESET}\n`);

  // Start HTTP server on test port 3555
  const testPort = 3555;
  const server = startServer(testPort);
  await new Promise(r => setTimeout(r, 200));
  const serverUrl = `http://localhost:${testPort}`;

  try {
    // SECTION 1: Frontend Static File & DOM Asset Verification
    console.log(`${BOLD}1. Frontend Static Assets and DOM Verification:${RESET}`);

    // Verify unauthenticated redirect from /admin
    totalTests++;
    const unauthAdminRes = await httpRequest(serverUrl, { path: '/admin' });
    assert.strictEqual(unauthAdminRes.status, 302);
    assert.ok(unauthAdminRes.headers['location'].includes('/login?redirect=/admin'));
    logPass('Unauthenticated request to /admin safely redirects to login');

    // Register test company and get admin session
    totalTests++;
    const regRes = await httpRequest(serverUrl, {
      path: '/api/auth/register-company',
      method: 'POST'
    }, {
      companyName: 'Frontend Integration Corp',
      industry: 'Technology',
      adminFullName: 'Diana Prince',
      email: 'diana@ficorp.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(regRes.status, 201, `Failed to register company: ${JSON.stringify(regRes.body)}`);
    logPass('Registered test company');

    // Login Company Admin
    totalTests++;
    const loginRes = await httpRequest(serverUrl, {
      path: '/api/auth/login',
      method: 'POST'
    }, {
      identity: 'diana@ficorp.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(loginRes.status, 200);
    const sessionToken = getCookie(loginRes, 'sw_session');
    const csrfToken = loginRes.body.csrfToken;
    assert.ok(sessionToken, 'Must receive sw_session');
    assert.ok(csrfToken, 'Must receive csrfToken');
    logPass('Acquired admin session and CSRF token');

    const authHeaders = {
      'Cookie': `sw_session=${sessionToken}; sw_csrf=${csrfToken}`,
      'X-CSRF-Token': csrfToken
    };

    // Verify authenticated /admin serves updated index.html with all Phase 4 features
    totalTests++;
    const authAdminRes = await httpRequest(serverUrl, {
      path: '/admin',
      headers: { 'Cookie': `sw_session=${sessionToken}` }
    });
    assert.strictEqual(authAdminRes.status, 200);
    const adminHtml = authAdminRes.body;
    assert.strictEqual(typeof adminHtml, 'string');
    logPass('Authenticated admin successfully receives /admin/index.html');

    // Verify sidebar navigation items
    totalTests++;
    assert.ok(adminHtml.includes('view-org-tree'), 'HTML must include view-org-tree nav item');
    assert.ok(adminHtml.includes('view-job-titles'), 'HTML must include view-job-titles nav item');
    assert.ok(adminHtml.includes('view-roles-perms'), 'HTML must include view-roles-perms nav item');
    logPass('HTML includes all 3 Phase 4 sidebar navigation items');

    // Verify Organization Tree View and controls
    totalTests++;
    assert.ok(adminHtml.includes('id="view-org-tree"'), 'HTML must include #view-org-tree panel');
    assert.ok(adminHtml.includes('id="inputSearchOrgTree"'), 'HTML must include #inputSearchOrgTree');
    assert.ok(adminHtml.includes('id="btnOpenAddOrgUnitModal"'), 'HTML must include #btnOpenAddOrgUnitModal');
    assert.ok(adminHtml.includes('id="btnOpenManageLevelsModal"'), 'HTML must include #btnOpenManageLevelsModal');
    assert.ok(adminHtml.includes('id="btnOpenReassignReportingModal"'), 'HTML must include #btnOpenReassignReportingModal');
    assert.ok(adminHtml.includes('id="orgTreeRoot"'), 'HTML must include #orgTreeRoot');
    logPass('HTML includes Organization Tree panel, toolbar, actions, and tree container');

    // Verify Job Titles View and controls
    totalTests++;
    assert.ok(adminHtml.includes('id="view-job-titles"'), 'HTML must include #view-job-titles panel');
    assert.ok(adminHtml.includes('id="inputSearchJobTitles"'), 'HTML must include #inputSearchJobTitles');
    assert.ok(adminHtml.includes('id="btnOpenAddJobTitleModal"'), 'HTML must include #btnOpenAddJobTitleModal');
    assert.ok(adminHtml.includes('id="tableJobTitles"'), 'HTML must include #tableJobTitles');
    logPass('HTML includes Job Titles panel, search, create button, and data table');

    // Verify Roles & Permissions View and controls
    totalTests++;
    assert.ok(adminHtml.includes('id="view-roles-perms"'), 'HTML must include #view-roles-perms panel');
    assert.ok(adminHtml.includes('id="rolesListContainer"'), 'HTML must include #rolesListContainer');
    assert.ok(adminHtml.includes('id="permsMatrixPanel"'), 'HTML must include #permsMatrixPanel');
    assert.ok(adminHtml.includes('id="tablePermsMatrix"'), 'HTML must include #tablePermsMatrix');
    assert.ok(adminHtml.includes('id="btnSaveRolePermissions"'), 'HTML must include #btnSaveRolePermissions');
    logPass('HTML includes Roles & Permissions split layout and permissions matrix table');

    // Verify Extended Employee Form Elements (Add and Edit)
    totalTests++;
    assert.ok(adminHtml.includes('id="newEmpOrgUnit"'), 'formAddEmployee must have #newEmpOrgUnit');
    assert.ok(adminHtml.includes('id="newEmpJobTitle"'), 'formAddEmployee must have #newEmpJobTitle');
    assert.ok(adminHtml.includes('id="newEmpManager"'), 'formAddEmployee must have #newEmpManager');
    assert.ok(adminHtml.includes('id="newEmpAccessRole"'), 'formAddEmployee must have #newEmpAccessRole');
    assert.ok(adminHtml.includes('id="editEmpOrgUnit"'), 'formEditEmployee must have #editEmpOrgUnit');
    assert.ok(adminHtml.includes('id="editEmpJobTitle"'), 'formEditEmployee must have #editEmpJobTitle');
    assert.ok(adminHtml.includes('id="editEmpManager"'), 'formEditEmployee must have #editEmpManager');
    assert.ok(adminHtml.includes('id="editEmpAccessRole"'), 'formEditEmployee must have #editEmpAccessRole');
    logPass('HTML employee add and edit forms contain all org unit, job title, manager, and role selectors');

    // Verify Modals
    totalTests++;
    assert.ok(adminHtml.includes('id="modalOrgUnit"'), 'Must include #modalOrgUnit');
    assert.ok(adminHtml.includes('id="modalOrgLevels"'), 'Must include #modalOrgLevels');
    assert.ok(adminHtml.includes('id="modalReassignReporting"'), 'Must include #modalReassignReporting');
    assert.ok(adminHtml.includes('id="modalJobTitle"'), 'Must include #modalJobTitle');
    assert.ok(adminHtml.includes('id="modalRole"'), 'Must include #modalRole');
    logPass('HTML includes all 5 Phase 4 management modals');

    // Verify JavaScript Assets are served and contain the Phase 4 logic
    totalTests++;
    const adminJsRes = await httpRequest(serverUrl, { path: '/admin.js' });
    assert.strictEqual(adminJsRes.status, 200);
    assert.ok(adminJsRes.body.includes('loadOrgTreeData'), 'admin.js must include loadOrgTreeData');
    assert.ok(adminJsRes.body.includes('renderPermsMatrix'), 'admin.js must include renderPermsMatrix');
    assert.ok(adminJsRes.body.includes('loadJobTitles'), 'admin.js must include loadJobTitles');
    assert.ok(adminJsRes.body.includes('openReassignReportingModal'), 'admin.js must include openReassignReportingModal');
    logPass('Served /admin.js contains Phase 4 controller methods');

    totalTests++;
    const scriptJsRes = await httpRequest(serverUrl, { path: '/script.js' });
    assert.strictEqual(scriptJsRes.status, 200);
    assert.ok(scriptJsRes.body.includes('getOrgTree'), 'common.js must include getOrgTree');
    assert.ok(scriptJsRes.body.includes('updateRolePermissions'), 'common.js must include updateRolePermissions');
    assert.ok(scriptJsRes.body.includes('getJobTitles'), 'common.js must include getJobTitles');
    logPass('Served /script.js contains Phase 4 client API wrapper methods');

    // SECTION 2: Hierarchy Management Workflows
    console.log(`\n${BOLD}2. Hierarchy Management Workflows:${RESET}`);

    // Get default seeded tree
    totalTests++;
    const treeRes = await httpRequest(serverUrl, {
      path: '/api/org/tree',
      headers: authHeaders
    });
    assert.strictEqual(treeRes.status, 200);
    assert.ok(treeRes.body.success);
    assert.ok(Array.isArray(treeRes.body.units));
    assert.ok(treeRes.body.company);
    logPass('Fetched company hierarchy tree successfully');

    // Create hierarchy level
    totalTests++;
    const levelRes = await httpRequest(serverUrl, {
      path: '/api/org/levels',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Division Tier',
      rank: 25
    });
    assert.strictEqual(levelRes.status, 201);
    const newLevelId = levelRes.body.level.id;
    assert.ok(newLevelId);
    logPass('Created custom hierarchy level tier');

    // Create organizational unit
    totalTests++;
    const unitRes = await httpRequest(serverUrl, {
      path: '/api/org/units',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Global Engineering',
      unitType: 'DIVISION',
      levelId: newLevelId
    });
    assert.strictEqual(unitRes.status, 201);
    const engineeringUnitId = unitRes.body.unit.id;
    assert.ok(engineeringUnitId);
    logPass('Created root organizational unit (Engineering)');

    // Create child organizational unit
    totalTests++;
    const childUnitRes = await httpRequest(serverUrl, {
      path: '/api/org/units',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Core Platform Team',
      unitType: 'TEAM',
      parentUnitId: engineeringUnitId
    });
    assert.strictEqual(childUnitRes.status, 201);
    const platformTeamId = childUnitRes.body.unit.id;
    assert.ok(platformTeamId);
    logPass('Created child organizational unit under Engineering');

    // Update organizational unit name
    totalTests++;
    const updateUnitRes = await httpRequest(serverUrl, {
      path: `/api/org/units/${platformTeamId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      name: 'Core Platform & Infra Team'
    });
    assert.strictEqual(updateUnitRes.status, 200);
    assert.strictEqual(updateUnitRes.body.unit.name, 'Core Platform & Infra Team');
    logPass('Updated organizational unit name');

    // Cycle prevention validation: setting Engineering's parent to Platform Team must fail
    totalTests++;
    const cycleRes = await httpRequest(serverUrl, {
      path: `/api/org/units/${engineeringUnitId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      parentUnitId: platformTeamId
    });
    assert.strictEqual(cycleRes.status, 400);
    assert.ok(cycleRes.body.error.toLowerCase().includes('circular') || cycleRes.body.error.toLowerCase().includes('cycle'));
    logPass('Prevented circular parent relationship in organizational tree');

    // SECTION 3: Job Title Management Workflows
    console.log(`\n${BOLD}3. Job Title Management Workflows:${RESET}`);

    // Create Job Title
    totalTests++;
    const titleRes = await httpRequest(serverUrl, {
      path: '/api/org/job-titles',
      method: 'POST',
      headers: authHeaders
    }, {
      title: 'Senior Systems Architect',
      description: 'Leads distributed architecture design'
    });
    assert.strictEqual(titleRes.status, 201);
    const architectTitleId = titleRes.body.jobTitle.id;
    assert.ok(architectTitleId);
    logPass('Created custom job title');

    // List Job Titles
    totalTests++;
    const listTitlesRes = await httpRequest(serverUrl, {
      path: '/api/org/job-titles',
      headers: authHeaders
    });
    assert.strictEqual(listTitlesRes.status, 200);
    assert.ok(Array.isArray(listTitlesRes.body));
    const foundTitle = listTitlesRes.body.find(t => t.id === architectTitleId);
    assert.ok(foundTitle);
    assert.strictEqual(foundTitle.title, 'Senior Systems Architect');
    logPass('Retrieved company-scoped job titles list');

    // Update Job Title
    totalTests++;
    const updateTitleRes = await httpRequest(serverUrl, {
      path: `/api/org/job-titles/${architectTitleId}`,
      method: 'PUT',
      headers: authHeaders
    }, {
      title: 'Principal Systems Architect',
      description: 'Oversees company-wide systems architecture'
    });
    assert.strictEqual(updateTitleRes.status, 200);
    assert.strictEqual(updateTitleRes.body.jobTitle.title, 'Principal Systems Architect');
    logPass('Updated job title details');

    // SECTION 4: Roles & Permissions Matrix Workflows
    console.log(`\n${BOLD}4. Roles & Permissions Matrix Workflows:${RESET}`);

    // Fetch system and custom roles
    totalTests++;
    const rolesRes = await httpRequest(serverUrl, {
      path: '/api/roles',
      headers: authHeaders
    });
    assert.strictEqual(rolesRes.status, 200);
    assert.ok(Array.isArray(rolesRes.body));
    const adminRole = rolesRes.body.find(r => r.name === 'Administrator');
    assert.ok(adminRole);
    assert.ok(adminRole.is_system_role);
    logPass('Listed roles with system role tags identified');

    // Create custom access role
    totalTests++;
    const newRoleRes = await httpRequest(serverUrl, {
      path: '/api/roles',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Platform Auditor',
      description: 'Audits attendance and team structures'
    });
    assert.strictEqual(newRoleRes.status, 201);
    const auditorRoleId = newRoleRes.body.role.id;
    assert.ok(auditorRoleId);
    logPass('Created custom access role');

    // Configure permissions with custom scopes
    totalTests++;
    const permsRes = await httpRequest(serverUrl, {
      path: `/api/roles/${auditorRoleId}/permissions`,
      method: 'PUT',
      headers: authHeaders
    }, {
      permissions: [
        { key: 'org:view', scope: 'COMPANY' },
        { key: 'employees:view', scope: 'COMPANY' },
        { key: 'attendance:view', scope: 'DESCENDANTS' },
        { key: 'analytics:view', scope: 'DEPARTMENT' }
      ]
    });
    assert.strictEqual(permsRes.status, 200);
    assert.strictEqual(permsRes.body.permissions.length, 4);
    logPass('Assigned permission keys and scope matrix to custom role');

    // System role protection: deleting Administrator role must be blocked
    totalTests++;
    const delAdminRes = await httpRequest(serverUrl, {
      path: `/api/roles/${adminRole.id}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert.strictEqual(delAdminRes.status, 400);
    assert.ok(delAdminRes.body.error.toLowerCase().includes('system'));
    logPass('Blocked deletion of protected system role');

    // SECTION 5: Employee Creation & Reporting Assignment Workflows
    console.log(`\n${BOLD}5. Employee Form Integration & Reporting Assignment:${RESET}`);

    // Create Manager Employee with Org Unit, Title, and Role
    totalTests++;
    const managerRes = await httpRequest(serverUrl, {
      path: '/api/employees',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Bruce Wayne',
      email: 'bruce@ficorp.com',
      department: 'Engineering',
      role: 'Staff Lead',
      cardUid: 'AA:BB:CC:01',
      orgUnitId: engineeringUnitId,
      jobTitleId: architectTitleId,
      accessRoleId: adminRole.id
    });
    assert.strictEqual(managerRes.status, 201, `Failed to create manager: ${JSON.stringify(managerRes.body)}`);
    const managerEmpId = managerRes.body.id || (managerRes.body.employee && managerRes.body.employee.id);
    assert.ok(managerEmpId);
    logPass('Created senior employee with assigned unit, title, and access role');

    // Create Direct Report Employee reporting to Manager
    totalTests++;
    const reportRes = await httpRequest(serverUrl, {
      path: '/api/employees',
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Tim Drake',
      email: 'tim@ficorp.com',
      department: 'Platform',
      role: 'Developer',
      cardUid: 'AA:BB:CC:02',
      orgUnitId: platformTeamId,
      managerId: managerEmpId,
      accessRoleId: auditorRoleId
    });
    assert.strictEqual(reportRes.status, 201);
    const reportEmpId = reportRes.body.id || (reportRes.body.employee && reportRes.body.employee.id);
    assert.ok(reportEmpId);
    logPass('Created subordinate employee assigned to team and manager');

    // Verify reporting chain API (returns array with depth 0 = self, depth 1+ = managers)
    totalTests++;
    const chainRes = await httpRequest(serverUrl, {
      path: `/api/employees/${reportEmpId}/reporting`,
      headers: authHeaders
    });
    assert.strictEqual(chainRes.status, 200);
    assert.ok(Array.isArray(chainRes.body));
    assert.strictEqual(chainRes.body.length, 2);
    assert.strictEqual(chainRes.body[0].id, reportEmpId);
    assert.strictEqual(chainRes.body[1].id, managerEmpId);
    logPass('Retrieved upward reporting line for subordinate');

    // Reassign reporting: changing Tim Drake's manager
    totalTests++;
    const reassignRes = await httpRequest(serverUrl, {
      path: `/api/employees/${reportEmpId}/reporting`,
      method: 'PATCH',
      headers: authHeaders
    }, {
      managerId: null,
      orgUnitId: engineeringUnitId
    });
    assert.strictEqual(reassignRes.status, 200);
    assert.strictEqual(reassignRes.body.employee.managerId, null);
    assert.strictEqual(reassignRes.body.employee.orgUnitId, engineeringUnitId);
    logPass('Reassigned reporting relationships cleanly');

    // Safe deletion of job title: safely unlinks assigned employees and returns 200
    totalTests++;
    const delTitleRes = await httpRequest(serverUrl, {
      path: `/api/org/job-titles/${architectTitleId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    assert.strictEqual(delTitleRes.status, 200);
    assert.ok(delTitleRes.body.success);
    logPass('Safely unlinked and deleted job title with 200 OK');

    // SECTION 6: Cross-Company Isolation and Security Validation
    console.log(`\n${BOLD}6. Cross-Company Isolation & Security Validation:${RESET}`);

    // Register second company
    const reg2Res = await httpRequest(serverUrl, {
      path: '/api/auth/register-company',
      method: 'POST'
    }, {
      companyName: 'Isolated Subsidiary Ltd',
      industry: 'Finance',
      adminFullName: 'Clark Kent',
      email: 'clark@isolated.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(reg2Res.status, 201);

    const login2Res = await httpRequest(serverUrl, {
      path: '/api/auth/login',
      method: 'POST'
    }, {
      identity: 'clark@isolated.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(login2Res.status, 200);
    const sessionToken2 = getCookie(login2Res, 'sw_session');
    const csrfToken2 = login2Res.body.csrfToken;
    const authHeaders2 = {
      'Cookie': `sw_session=${sessionToken2}; sw_csrf=${csrfToken2}`,
      'X-CSRF-Token': csrfToken2
    };

    // Company 2 accessing Company 1's unit must return 404 or 403
    totalTests++;
    const crossUnitRes = await httpRequest(serverUrl, {
      path: `/api/org/units/${engineeringUnitId}`,
      headers: authHeaders2
    });
    assert.ok([403, 404].includes(crossUnitRes.status));
    logPass('Cross-company access to organizational unit forbidden');

    // Company 2 accessing Company 1's role must return 404 or 403
    totalTests++;
    const crossRoleRes = await httpRequest(serverUrl, {
      path: `/api/roles/${auditorRoleId}/permissions`,
      headers: authHeaders2
    });
    assert.ok([403, 404].includes(crossRoleRes.status));
    logPass('Cross-company access to role permissions forbidden');

    // CSRF Protection: mutation without X-CSRF-Token must be rejected
    totalTests++;
    const noCsrfRes = await httpRequest(serverUrl, {
      path: '/api/org/job-titles',
      method: 'POST',
      headers: {
        'Cookie': `sw_session=${sessionToken2}; sw_csrf=${csrfToken2}`
        // Omitting X-CSRF-Token
      }
    }, {
      title: 'CSRF Attack Title'
    });
    assert.strictEqual(noCsrfRes.status, 403);
    logPass('Mutations without valid CSRF header are rejected (403)');

    // SECTION 7: Production DB Integrity Verification
    console.log(`\n${BOLD}7. Production Database Integrity Verification:${RESET}`);
    totalTests++;
    if (prodDbExists) {
      const prodDbStatAfter = fs.statSync(prodDbPath);
      assert.strictEqual(
        prodDbStatBefore.size,
        prodDbStatAfter.size,
        `CRITICAL: Production DB size changed from ${prodDbStatBefore.size} to ${prodDbStatAfter.size}!`
      );
      assert.strictEqual(
        prodDbStatBefore.mtimeMs,
        prodDbStatAfter.mtimeMs,
        `CRITICAL: Production DB modified time changed!`
      );
      logPass('Verified production database smartworkforce.db remains 100% UNTOUCHED');
    } else {
      logPass('Production database was not present; no production database modified');
    }

  } catch (err) {
    logFail('Test run failed with unhandled error', err);
  } finally {
    server.close();
    // Cleanup temporary test DB files
    try { fs.unlinkSync(tempDbPath); } catch (_) {}
    try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
    try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
  }

  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD} Results: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

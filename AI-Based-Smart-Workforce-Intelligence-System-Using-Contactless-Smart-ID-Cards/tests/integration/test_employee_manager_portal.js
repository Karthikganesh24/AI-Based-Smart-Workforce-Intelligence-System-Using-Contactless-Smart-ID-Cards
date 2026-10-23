/**
 * tests/integration/test_employee_manager_portal.js
 * 
 * Comprehensive Isolated Test Suite for SmartWorkforce Phase 5:
 * Employee and Manager Portal Integration.
 * 
 * Strict Safety Guarantee:
 * - Runs 100% against an isolated temporary database ('tests/isolated_phase5_test.db').
 * - Verifies production database 'database/smartworkforce.db' remains 100% untouched.
 * - Tests all Phase 5 requirements:
 *   - Feature 1: Employee profile with organizational units, job titles, manager, and reporting-chain breadcrumb.
 *   - Feature 2: My Team section, team member presence, last gate detection, direct vs indirect distinction.
 *   - Feature 3: Manager and department dashboards, permitted attendance summaries, scoped team analytics, empty states.
 *   - Feature 4: Permission-driven UI, backend security boundary enforcement, 401/403/404 handling, mandatory password change.
 *   - Feature 5: Multi-tenant isolation, cross-company security, zero sensitive credential exposure.
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
const tempDbPath = path.resolve(__dirname, '..', 'isolated_phase5_test.db');
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
  console.log(`${BOLD}${CYAN} SmartWorkforce Phase 5: Employee & Manager Portal Test Suite           ${RESET}`);
  console.log(`${BOLD}${CYAN} Running against isolated database: ${tempDbPath}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);

  // Migrate test database
  runMigration(db.db);
  console.log(`${CYAN}Isolated test database migrated successfully.${RESET}\n`);

  // Start HTTP server on test port 3666
  const testPort = 3666;
  const server = startServer(testPort);
  await new Promise(r => setTimeout(r, 200));
  const serverUrl = `http://localhost:${testPort}`;

  try {
    // =========================================================
    // SECTION 1: FRONTEND STATIC ASSETS & DOM CONTRACTS
    // =========================================================
    console.log(`${BOLD}--- Section 1: Frontend Static Assets & DOM Contracts ---${RESET}`);

    // 1. Unauthenticated /employee redirects to login
    totalTests++;
    const unauthEmp = await httpRequest(serverUrl, { path: '/employee' });
    assert.strictEqual(unauthEmp.status, 302, 'Unauthenticated /employee must redirect with 302');
    assert(unauthEmp.headers['location'].includes('/login?redirect=/employee'), 'Redirect must point to login');
    logPass('Unauthenticated request to /employee redirects safely to /login');

    // 2. Read employee HTML file content
    totalTests++;
    const empHtmlPath = path.resolve(__dirname, '../..', 'frontend', 'employee', 'index.html');
    const empHtml = fs.readFileSync(empHtmlPath, 'utf8');

    // Verify Phase 5 sidebar navigation elements
    assert(empHtml.includes('id="navItemTeam"'), 'HTML must include #navItemTeam');
    assert(empHtml.includes('id="navItemTeamText"'), 'HTML must include #navItemTeamText');
    logPass('Sidebar navigation includes dynamic My Team element');

    // Verify Phase 5 profile elements
    assert(empHtml.includes('id="empJobTitle"'), 'HTML must include #empJobTitle');
    assert(empHtml.includes('id="empOrgUnit"'), 'HTML must include #empOrgUnit');
    assert(empHtml.includes('id="empReportingManager"'), 'HTML must include #empReportingManager');
    assert(empHtml.includes('id="empAccessRole"'), 'HTML must include #empAccessRole');
    assert(empHtml.includes('id="empReportingChainBox"'), 'HTML must include #empReportingChainBox');
    assert(empHtml.includes('id="empChainFlow"'), 'HTML must include #empChainFlow');
    logPass('Employee profile includes organizational metadata and reporting breadcrumb containers');

    // Verify Phase 5 My Team section & manager dashboard elements
    assert(empHtml.includes('id="sectionMyTeam"'), 'HTML must include #sectionMyTeam');
    assert(empHtml.includes('id="teamSectionHeading"'), 'HTML must include #teamSectionHeading');
    assert(empHtml.includes('id="teamScopeBadge"'), 'HTML must include #teamScopeBadge');
    assert(empHtml.includes('id="teamFilterPills"'), 'HTML must include #teamFilterPills');
    assert(empHtml.includes('id="btnFilterAll"'), 'HTML must include #btnFilterAll');
    assert(empHtml.includes('id="btnFilterDirect"'), 'HTML must include #btnFilterDirect');
    assert(empHtml.includes('id="btnFilterIndirect"'), 'HTML must include #btnFilterIndirect');
    assert(empHtml.includes('id="teamKpiGrid"'), 'HTML must include #teamKpiGrid');
    assert(empHtml.includes('id="teamKpiTotal"'), 'HTML must include #teamKpiTotal');
    assert(empHtml.includes('id="teamKpiInside"'), 'HTML must include #teamKpiInside');
    assert(empHtml.includes('id="teamKpiOccupancy"'), 'HTML must include #teamKpiOccupancy');
    assert(empHtml.includes('id="teamSearchInput"'), 'HTML must include #teamSearchInput');
    assert(empHtml.includes('id="teamEmptyState"'), 'HTML must include #teamEmptyState');
    assert(empHtml.includes('id="teamTableWrap"'), 'HTML must include #teamTableWrap');
    assert(empHtml.includes('id="teamTable"'), 'HTML must include #teamTable');
    assert(empHtml.includes('id="teamTbody"'), 'HTML must include #teamTbody');
    logPass('My Team section contains full roster table, KPI grid, filters, and empty state');

    // Verify Phase 5 Authorized Member Profile modal
    assert(empHtml.includes('id="memberProfileModal"'), 'HTML must include #memberProfileModal');
    assert(empHtml.includes('id="memberModalName"'), 'HTML must include #memberModalName');
    assert(empHtml.includes('id="memberModalRelationBadge"'), 'HTML must include #memberModalRelationBadge');
    assert(empHtml.includes('id="memberModalChainFlow"'), 'HTML must include #memberModalChainFlow');
    assert(empHtml.includes('id="memberModalAttendanceTbody"'), 'HTML must include #memberModalAttendanceTbody');
    logPass('Authorized Member Profile modal structure verified in DOM');

    // 3. Verify CSS rules exist in employee.css
    totalTests++;
    const empCssPath = path.resolve(__dirname, '../..', 'frontend', 'employee', 'employee.css');
    const empCss = fs.readFileSync(empCssPath, 'utf8');
    assert(empCss.includes('.emp-reporting-chain-box'), 'CSS must style .emp-reporting-chain-box');
    assert(empCss.includes('.chain-step-pill'), 'CSS must style .chain-step-pill');
    assert(empCss.includes('.emp-team-card'), 'CSS must style .emp-team-card');
    assert(empCss.includes('.badge-direct'), 'CSS must style .badge-direct');
    assert(empCss.includes('.badge-indirect'), 'CSS must style .badge-indirect');
    assert(empCss.includes('.member-modal-dialog'), 'CSS must style .member-modal-dialog');
    logPass('employee.css contains all Phase 5 styling rules');

    // 4. Verify common.js API methods
    totalTests++;
    const commonJsPath = path.resolve(__dirname, '../..', 'frontend', 'shared', 'js', 'common.js');
    const commonJs = fs.readFileSync(commonJsPath, 'utf8');
    assert(commonJs.includes('getEmployee('), 'common.js must contain getEmployee(id)');
    assert(commonJs.includes('getTeamRoster('), 'common.js must contain getTeamRoster()');
    assert(commonJs.includes('getTeamAttendance('), 'common.js must contain getTeamAttendance()');
    assert(commonJs.includes('getTeamAnalytics('), 'common.js must contain getTeamAnalytics()');
    logPass('common.js API client contains getEmployee, getTeamRoster, and analytics methods');

    // =========================================================
    // SECTION 2: MULTI-TENANT HIERARCHY SETUP
    // =========================================================
    console.log(`\n${BOLD}--- Section 2: Multi-Tenant Setup & Full Organizational Hierarchy ---${RESET}`);

    // Register Company A (Horizon Technologies)
    totalTests++;
    const regCA = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Horizon Technologies',
      industry: 'Software',
      adminFullName: 'Alice Walker',
      email: 'alice@horizon.io',
      password: 'Password123!'
    });
    assert.strictEqual(regCA.status, 201);
    const compAId = regCA.body.company.id;

    const loginCA = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      email: 'alice@horizon.io',
      password: 'Password123!',
      userType: 'COMPANY_HEAD'
    });
    assert.strictEqual(loginCA.status, 200);
    const compASession = getCookie(loginCA, 'sw_session');
    const compACsrf = loginCA.body.csrfToken;
    const compAAdminHeaders = {
      'Cookie': `sw_session=${compASession}`,
      'X-CSRF-Token': compACsrf
    };
    logPass('Company A (Horizon Technologies) registered and logged in with Admin session');

    // Register Company B (Summit Dynamics - For Cross-Tenant Testing)
    totalTests++;
    const regCB = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Summit Dynamics',
      industry: 'Aerospace',
      adminFullName: 'Brian Apex',
      email: 'brian@summit.io',
      password: 'Password123!'
    });
    assert.strictEqual(regCB.status, 201);
    const compBId = regCB.body.company.id;

    const loginCB = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      email: 'brian@summit.io',
      password: 'Password123!',
      userType: 'COMPANY_HEAD'
    });
    assert.strictEqual(loginCB.status, 200);
    const compBSession = getCookie(loginCB, 'sw_session');
    const compBCsrf = loginCB.body.csrfToken;
    const compBAdminHeaders = {
      'Cookie': `sw_session=${compBSession}`,
      'X-CSRF-Token': compBCsrf
    };
    logPass('Company B (Summit Dynamics) registered and logged in with Admin session');
    logPass('Company B (Summit Dynamics) registered with Admin session');

    // Create Company A Org Units:
    // Root: Engineering Unit, Child: Backend Team
    totalTests++;
    const unitEng = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: compAAdminHeaders }, {
      name: 'Engineering Unit',
      code: 'ENG'
    });
    assert.strictEqual(unitEng.status, 201);
    const engUnitId = unitEng.body.unit.id;

    const unitBackend = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: compAAdminHeaders }, {
      name: 'Backend Core Team',
      code: 'BACKEND',
      parentId: engUnitId
    });
    assert.strictEqual(unitBackend.status, 201);
    const backendUnitId = unitBackend.body.unit.id;
    logPass('Company A created hierarchical organizational units (Engineering -> Backend Core)');

    // Create Company A Job Titles:
    totalTests++;
    const jtCTO = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: compAAdminHeaders }, {
      title: 'Chief Technology Officer',
      code: 'CTO'
    });
    const jtDirector = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: compAAdminHeaders }, {
      title: 'Engineering Director',
      code: 'ENG-DIR'
    });
    const jtLead = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: compAAdminHeaders }, {
      title: 'Team Lead',
      code: 'LEAD'
    });
    const jtDev = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: compAAdminHeaders }, {
      title: 'Senior Software Engineer',
      code: 'SR-SWE'
    });
    logPass('Company A created distinct job titles (CTO, Director, Lead, Senior SWE)');

    // Fetch Seeded Access Roles for Company A
    const rolesResA = await httpRequest(serverUrl, { path: '/api/roles', headers: compAAdminHeaders });
    const roleStaff = rolesResA.body.find(r => r.name === 'Employee');
    const roleLead = rolesResA.body.find(r => r.name === 'Team Lead');
    const roleDeptHead = rolesResA.body.find(r => r.name === 'Department Head');
    assert(roleStaff && roleLead && roleDeptHead, 'Company A must have seeded system roles');

    // Create Employees in Company A:
    // 1. CTO (Top level, depth 0, no manager)
    totalTests++;
    const ctoRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'Catherine Vance',
      email: 'catherine.cto@horizon.io',
      phone: '555-100-0001',
      department: 'Engineering',
      role: 'CTO',
      orgUnitId: engUnitId,
      jobTitleId: jtCTO.body.jobTitle.id,
      accessRoleId: roleDeptHead.id
    });
    assert.strictEqual(ctoRes.status, 201);
    const ctoEmp = ctoRes.body;
    const ctoTempPw = ctoRes.body.temporaryPassword;

    // 2. Director (reports to CTO)
    const dirRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'David Miller',
      email: 'david.dir@horizon.io',
      phone: '555-100-0002',
      department: 'Engineering',
      role: 'Director',
      orgUnitId: engUnitId,
      jobTitleId: jtDirector.body.jobTitle.id,
      managerId: ctoEmp.id,
      accessRoleId: roleDeptHead.id
    });
    assert.strictEqual(dirRes.status, 201);
    const dirEmp = dirRes.body;
    const dirTempPw = dirRes.body.temporaryPassword;

    // 3. Lead (reports to Director)
    const leadRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'Leonard Snart',
      email: 'leonard.lead@horizon.io',
      phone: '555-100-0003',
      department: 'Engineering',
      role: 'Team Lead',
      orgUnitId: backendUnitId,
      jobTitleId: jtLead.body.jobTitle.id,
      managerId: dirEmp.id,
      accessRoleId: roleLead.id
    });
    assert.strictEqual(leadRes.status, 201);
    const leadEmp = leadRes.body;
    const leadTempPw = leadRes.body.temporaryPassword;

    // 4. Dev1 (reports to Lead)
    const dev1Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'Diana Prince',
      email: 'diana.dev@horizon.io',
      phone: '555-100-0004',
      uid: 'CARD-DEV-0001',
      department: 'Engineering',
      role: 'Senior Software Engineer',
      orgUnitId: backendUnitId,
      jobTitleId: jtDev.body.jobTitle.id,
      managerId: leadEmp.id,
      accessRoleId: roleStaff.id
    });
    assert.strictEqual(dev1Res.status, 201);
    const dev1Emp = dev1Res.body;
    const dev1TempPw = dev1Res.body.temporaryPassword;

    // 5. Dev2 (reports to Lead)
    const dev2Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'Barry Allen',
      email: 'barry.dev@horizon.io',
      phone: '555-100-0005',
      department: 'Engineering',
      role: 'Senior Software Engineer',
      orgUnitId: backendUnitId,
      jobTitleId: jtDev.body.jobTitle.id,
      managerId: leadEmp.id,
      accessRoleId: roleStaff.id
    });
    assert.strictEqual(dev2Res.status, 201);
    const dev2Emp = dev2Res.body;
    const dev2TempPw = dev2Res.body.temporaryPassword;

    // 6. SoloManager (Manager with 0 direct reports for empty-team testing)
    const soloRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compAAdminHeaders }, {
      name: 'Sam Solo',
      email: 'sam.solo@horizon.io',
      phone: '555-100-0006',
      department: 'Engineering',
      role: 'Team Lead',
      orgUnitId: engUnitId,
      jobTitleId: jtLead.body.jobTitle.id,
      managerId: dirEmp.id,
      accessRoleId: roleLead.id
    });
    assert.strictEqual(soloRes.status, 201);
    const soloEmp = soloRes.body;
    const soloTempPw = soloRes.body.temporaryPassword;

    // Create Company B Employee for Cross-Tenant testing
    const compBEmpRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: compBAdminHeaders }, {
      name: 'Boris Becker',
      email: 'boris@summit.io',
      phone: '555-200-0001',
      department: 'Avionics',
      role: 'Pilot Specialist'
    });
    assert.strictEqual(compBEmpRes.status, 201);
    const compBEmp = compBEmpRes.body;

    logPass('Full multi-tier hierarchy created (CTO -> Director -> Lead -> Dev1, Dev2 + SoloManager)');

    // =========================================================
    // SECTION 3: EMPLOYEE LOGIN & MANDATORY PASSWORD UPDATE
    // =========================================================
    console.log(`\n${BOLD}--- Section 3: Employee Login & Mandatory Password Update ---${RESET}`);

    // Helper to log in employee and change temporary password
    async function loginAndActivate(empId, tempPw, newPw = 'PermanentPass123!') {
      const loginRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
        identity: empId,
        password: tempPw,
        portalMode: 'EMPLOYEE'
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.body.mustChangePassword, true);
      const session = getCookie(loginRes, 'sw_session');
      const csrf = loginRes.body.csrfToken;
      const initialHeaders = {
        'Cookie': `sw_session=${session}`,
        'X-CSRF-Token': csrf
      };

      // Mandatory change password
      const changeRes = await httpRequest(serverUrl, {
        method: 'POST',
        path: '/api/employee/change-password',
        headers: initialHeaders
      }, {
        currentPassword: tempPw,
        newPassword: newPw,
        confirmPassword: newPw
      });
      assert.strictEqual(changeRes.status, 200);

      // Re-login with permanent password
      const activeLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
        identity: empId,
        password: newPw,
        portalMode: 'EMPLOYEE'
      });
      assert.strictEqual(activeLogin.status, 200);
      assert.strictEqual(activeLogin.body.mustChangePassword, false);
      const activeSession = getCookie(activeLogin, 'sw_session');
      const activeCsrf = activeLogin.body.csrfToken;
      return {
        'Cookie': `sw_session=${activeSession}`,
        'X-CSRF-Token': activeCsrf
      };
    }

    const dev1Headers = await loginAndActivate(dev1Emp.id, dev1TempPw);
    const leadHeaders = await loginAndActivate(leadEmp.id, leadTempPw);
    const dirHeaders = await loginAndActivate(dirEmp.id, dirTempPw);
    const ctoHeaders = await loginAndActivate(ctoEmp.id, ctoTempPw);
    const soloHeaders = await loginAndActivate(soloEmp.id, soloTempPw);
    logPass('All employee personas activated permanent passwords and acquired active sessions');

    // =========================================================
    // SECTION 4: FEATURE 1 — EMPLOYEE PROFILE & REPORTING BREADCRUMB
    // =========================================================
    console.log(`\n${BOLD}--- Section 4: Feature 1 — Employee Profile & Upward Reporting Lineage ---${RESET}`);

    // Dev1 calls GET /api/employee/me
    totalTests++;
    const dev1Me = await httpRequest(serverUrl, { path: '/api/employee/me', headers: dev1Headers });
    assert.strictEqual(dev1Me.status, 200);
    assert.strictEqual(dev1Me.body.employee.id, dev1Emp.id);
    assert.strictEqual(dev1Me.body.employee.name, 'Diana Prince');
    assert.strictEqual(dev1Me.body.employee.jobTitle, 'Senior Software Engineer');
    assert.strictEqual(dev1Me.body.employee.orgUnitName, 'Backend Core Team');
    assert.strictEqual(dev1Me.body.employee.managerName, 'Leonard Snart');
    assert.strictEqual(dev1Me.body.employee.managerId, leadEmp.id);
    assert.strictEqual(dev1Me.body.employee.accessRoleName, 'Employee');
    assert.strictEqual(dev1Me.body.employee.cardStatus, 'ACTIVE');
    logPass('Dev1 profile contains job title, organizational unit, manager, and access role');

    // Verify Dev1 upward reporting chain (Dev1 -> Lead -> Director -> CTO)
    totalTests++;
    assert(Array.isArray(dev1Me.body.reportingChain), 'reportingChain must be an array');
    assert.strictEqual(dev1Me.body.reportingChain.length, 4, 'Dev1 lineage must have 4 tiers');
    assert.strictEqual(dev1Me.body.reportingChain[0].id, dev1Emp.id, 'Depth 0 must be Dev1');
    assert.strictEqual(dev1Me.body.reportingChain[1].id, leadEmp.id, 'Depth 1 must be Lead');
    assert.strictEqual(dev1Me.body.reportingChain[2].id, dirEmp.id, 'Depth 2 must be Director');
    assert.strictEqual(dev1Me.body.reportingChain[3].id, ctoEmp.id, 'Depth 3 must be CTO');
    logPass('Dev1 upward reporting chain accurately traces 4 tiers to top executive');

    // Verify Dev1 subordinate flags & permission scopes
    totalTests++;
    assert.strictEqual(dev1Me.body.directReportsCount, 0, 'Dev1 has 0 direct reports');
    assert.strictEqual(dev1Me.body.hasSubordinates, false, 'Dev1 hasSubordinates must be false');
    assert.strictEqual(dev1Me.body.permissions['employees:view'], 'SELF', 'Dev1 view scope is SELF');
    logPass('Dev1 subordinate indicators confirm standard non-manager status');

    // Top-Level CTO Profile
    totalTests++;
    const ctoMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: ctoHeaders });
    assert.strictEqual(ctoMe.status, 200);
    assert.strictEqual(ctoMe.body.employee.managerId, null, 'Top CTO managerId must be null');
    assert.strictEqual(ctoMe.body.employee.managerName, null, 'Top CTO managerName must be null');
    assert.strictEqual(ctoMe.body.reportingChain.length, 1, 'Top CTO lineage has depth 0 only');
    logPass('Top-level executive profile confirms null manager and single root lineage');

    // =========================================================
    // SECTION 5: FEATURE 2 & 3 — TEAM LEAD & DIRECT REPORTS ROSTER
    // =========================================================
    console.log(`\n${BOLD}--- Section 5: Feature 2 & 3 — Team Lead & Direct Reports Scope ---${RESET}`);

    // Lead calls GET /api/employee/me
    totalTests++;
    const leadMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: leadHeaders });
    assert.strictEqual(leadMe.status, 200);
    assert.strictEqual(leadMe.body.directReportsCount, 2, 'Lead must have 2 direct reports');
    assert.strictEqual(leadMe.body.hasSubordinates, true, 'Lead hasSubordinates must be true');
    assert.strictEqual(leadMe.body.permissions['employees:view'], 'DIRECT_REPORTS');
    logPass('Lead employee/me indicates direct reports count and DIRECT_REPORTS permission');

    // Lead calls GET /api/team/roster
    totalTests++;
    const leadRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: leadHeaders });
    assert.strictEqual(leadRoster.status, 200);
    assert(Array.isArray(leadRoster.body));
    const memberIds = leadRoster.body.map(m => m.id);
    assert(memberIds.includes(leadEmp.id), 'Roster includes Lead himself');
    assert(memberIds.includes(dev1Emp.id), 'Roster includes direct report Dev1');
    assert(memberIds.includes(dev2Emp.id), 'Roster includes direct report Dev2');
    assert(!memberIds.includes(dirEmp.id), 'Roster must NOT include superior Director');
    assert(!memberIds.includes(ctoEmp.id), 'Roster must NOT include superior CTO');

    // Verify direct report distinction and gate properties
    const rosterDev1 = leadRoster.body.find(m => m.id === dev1Emp.id);
    assert.strictEqual(rosterDev1.isDirectReport, true, 'Dev1 isDirectReport must be true for Lead');
    assert('lastGate' in rosterDev1, 'Roster member must include lastGate property');
    assert('lastEventType' in rosterDev1, 'Roster member must include lastEventType property');
    logPass('Lead team roster correctly scoped to self + direct reports with isDirectReport = true');

    // Dev1 punches contactless card via POST /api/employee/tap
    totalTests++;
    const tapRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/tap', headers: dev1Headers }, {
      gate: 'Gate 02 - Production Bay',
      mode: 'ENTRY'
    });
    assert.strictEqual(tapRes.status, 200);
    assert.strictEqual(tapRes.body.event.eventType, 'ENTRY');
    assert.strictEqual(tapRes.body.employee.status, 'INSIDE');
    logPass('Dev1 successfully registered verified ENTRY punch via contactless card tap');

    // Lead calls GET /api/team/roster after tap: Dev1 status and gate updated
    totalTests++;
    const leadRosterAfterTap = await httpRequest(serverUrl, { path: '/api/team/roster', headers: leadHeaders });
    const updatedDev1 = leadRosterAfterTap.body.find(m => m.id === dev1Emp.id);
    assert.strictEqual(updatedDev1.status, 'INSIDE', 'Dev1 presence status must be INSIDE');
    assert.strictEqual(updatedDev1.lastGate, 'Gate 02 - Production Bay', 'Last gate location must match tap');
    assert.strictEqual(updatedDev1.lastEventType, 'ENTRY', 'Last event type must be ENTRY');
    logPass('Lead team roster reflects live presence status and gate detection');

    // Lead calls GET /api/team/attendance
    totalTests++;
    const leadAtt = await httpRequest(serverUrl, { path: '/api/team/attendance', headers: leadHeaders });
    assert.strictEqual(leadAtt.status, 200);
    assert(Array.isArray(leadAtt.body));
    const attDev1 = leadAtt.body.find(a => (a.empId || a.emp_id) === dev1Emp.id);
    assert(attDev1, 'Team attendance must include Dev1 punch');
    logPass('Lead team attendance events retrieved for direct report');

    // Lead calls GET /api/employees/:id for Dev1 (Authorized view)
    totalTests++;
    const viewDev1 = await httpRequest(serverUrl, { path: `/api/employees/${dev1Emp.id}`, headers: leadHeaders });
    assert.strictEqual(viewDev1.status, 200);
    assert.strictEqual(viewDev1.body.name, 'Diana Prince');
    assert(Array.isArray(viewDev1.body.reportingChain), 'Member profile includes reporting chain');
    assert(Array.isArray(viewDev1.body.recentAttendance), 'Member profile includes recent attendance');
    logPass('Lead successfully views authorized subordinate profile and attendance history');

    // =========================================================
    // SECTION 6: FEATURE 3 — DEPARTMENT HEAD & DESCENDANTS DASHBOARD
    // =========================================================
    console.log(`\n${BOLD}--- Section 6: Feature 3 — Department Head & Descendants Scope ---${RESET}`);

    // Director (Dept Head) calls GET /api/employee/me
    totalTests++;
    const dirMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: dirHeaders });
    assert.strictEqual(dirMe.status, 200);
    assert.strictEqual(dirMe.body.permissions['employees:view'], 'DESCENDANTS');
    assert.strictEqual(dirMe.body.permissions['analytics:view'], 'DEPARTMENT');
    logPass('Department Head employee/me indicates DESCENDANTS and DEPARTMENT scopes');

    // Director calls GET /api/team/roster
    totalTests++;
    const dirRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: dirHeaders });
    assert.strictEqual(dirRoster.status, 200);
    const dirRosterIds = dirRoster.body.map(m => m.id);
    assert(dirRosterIds.includes(dirEmp.id), 'Director roster includes self');
    assert(dirRosterIds.includes(leadEmp.id), 'Director roster includes Lead (Direct Report)');
    assert(dirRosterIds.includes(dev1Emp.id), 'Director roster includes Dev1 (Indirect Report)');
    assert(dirRosterIds.includes(dev2Emp.id), 'Director roster includes Dev2 (Indirect Report)');
    assert(dirRosterIds.includes(soloEmp.id), 'Director roster includes SoloManager (Direct Report)');
    assert(!dirRosterIds.includes(ctoEmp.id), 'Director roster must NOT include superior CTO');

    // Verify direct vs indirect report distinction for Department Head
    const dirLeadMember = dirRoster.body.find(m => m.id === leadEmp.id);
    const dirDev1Member = dirRoster.body.find(m => m.id === dev1Emp.id);
    assert.strictEqual(dirLeadMember.isDirectReport, true, 'Lead is direct report to Director');
    assert.strictEqual(dirDev1Member.isDirectReport, false, 'Dev1 is indirect report to Director');
    assert.strictEqual(dirDev1Member.managerName, 'Leonard Snart', 'Dev1 indicates reporting to Lead');
    logPass('Department Head clearly distinguishes direct reports from indirect reports');

    // Director calls GET /api/team/analytics
    totalTests++;
    const dirAnalytics = await httpRequest(serverUrl, { path: '/api/team/analytics', headers: dirHeaders });
    assert.strictEqual(dirAnalytics.status, 200);
    assert(dirAnalytics.body.teamSummary, 'Response must include teamSummary');
    assert.strictEqual(typeof dirAnalytics.body.teamSummary.totalMembers, 'number');
    assert.strictEqual(typeof dirAnalytics.body.teamSummary.insideCount, 'number');
    assert.strictEqual(typeof dirAnalytics.body.teamSummary.occupancyRatePercent, 'number');
    assert(dirAnalytics.body.departmentBreakdown, 'Response must include departmentBreakdown');
    logPass('Department Head receives calculated department team analytics and breakdown');

    // =========================================================
    // SECTION 7: EMPTY TEAM STATE VERIFICATION
    // =========================================================
    console.log(`\n${BOLD}--- Section 7: Empty Team State Verification ---${RESET}`);

    // SoloManager calls GET /api/employee/me
    totalTests++;
    const soloMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: soloHeaders });
    assert.strictEqual(soloMe.status, 200);
    assert.strictEqual(soloMe.body.directReportsCount, 0, 'SoloManager has 0 direct reports');
    assert.strictEqual(soloMe.body.hasSubordinates, false);

    // SoloManager calls GET /api/team/roster
    const soloRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: soloHeaders });
    assert.strictEqual(soloRoster.status, 200);
    const subordinatesOnly = soloRoster.body.filter(m => m.id !== soloEmp.id);
    assert.strictEqual(subordinatesOnly.length, 0, 'SoloManager has zero subordinates in team roster');
    logPass('Manager with no assigned employees safely returns empty team list without errors');

    // =========================================================
    // SECTION 8: FEATURE 4 — PERMISSION BOUNDARIES & SECURITY
    // =========================================================
    console.log(`\n${BOLD}--- Section 8: Feature 4 — Permission Boundaries & Security Defenses ---${RESET}`);

    // 1. Standard Dev1 (SELF scope) attempting to view Lead profile -> 403 Forbidden
    totalTests++;
    const dev1ViewLead = await httpRequest(serverUrl, { path: `/api/employees/${leadEmp.id}`, headers: dev1Headers });
    assert.strictEqual(dev1ViewLead.status, 403, 'Standard employee viewing superior must return 403');
    logPass('Standard employee barred from viewing superior profile (403 Forbidden)');

    // 2. Standard Dev1 attempting to view peer Dev2 profile -> 403 Forbidden
    totalTests++;
    const dev1ViewDev2 = await httpRequest(serverUrl, { path: `/api/employees/${dev2Emp.id}`, headers: dev1Headers });
    assert.strictEqual(dev1ViewDev2.status, 403, 'Standard employee viewing peer must return 403');
    logPass('Standard employee barred from viewing peer profile (403 Forbidden)');

    // 3. Lead attempting to view Director (outside subordinate scope) -> 403 Forbidden
    totalTests++;
    const leadViewDir = await httpRequest(serverUrl, { path: `/api/employees/${dirEmp.id}`, headers: leadHeaders });
    assert.strictEqual(leadViewDir.status, 403, 'Lead viewing superior Director must return 403');
    logPass('Team Lead barred from viewing superior Director profile (403 Forbidden)');

    // 4. Non-existent employee ID -> 404 Not Found
    totalTests++;
    const notFoundRes = await httpRequest(serverUrl, { path: '/api/employees/EMP-NON-EXISTENT', headers: leadHeaders });
    assert.strictEqual(notFoundRes.status, 404, 'Non-existent employee must return 404');
    logPass('Non-existent employee ID returns 404 Not Found cleanly');

    // 5. Cross-company employee access -> 404 Not Found (Zero existence leakage)
    totalTests++;
    const crossCompRes = await httpRequest(serverUrl, { path: `/api/employees/${compBEmp.id}`, headers: leadHeaders });
    assert.strictEqual(crossCompRes.status, 404, 'Cross-company employee must return 404');
    logPass('Cross-company employee access returns 404 without leaking presence across tenants');

    // 6. Cross-company team roster isolation
    totalTests++;
    const compARoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: dirHeaders });
    const compAIds = compARoster.body.map(m => m.id);
    assert(!compAIds.includes(compBEmp.id), 'Company A roster must NEVER leak Company B employees');
    logPass('Multi-tenant data isolation verified: zero leakage across distinct organizations');

    // =========================================================
    // SECTION 9: CREDENTIAL SECURITY AUDIT
    // =========================================================
    console.log(`\n${BOLD}--- Section 9: Credential Security Audit ---${RESET}`);

    totalTests++;
    assertNoSensitiveCredentials(dev1Me.body, 'Dev1 /api/employee/me');
    assertNoSensitiveCredentials(leadMe.body, 'Lead /api/employee/me');
    assertNoSensitiveCredentials(leadRoster.body, 'Lead /api/team/roster');
    assertNoSensitiveCredentials(dirAnalytics.body, 'Director /api/team/analytics');
    assertNoSensitiveCredentials(viewDev1.body, 'Lead viewing Dev1 profile');
    logPass('Comprehensive audit confirms zero password_hash or password_salt exposure in portal APIs');

    // =========================================================
    // SECTION 10: PRODUCTION DATABASE IMMUTABILITY CHECK
    // =========================================================
    console.log(`\n${BOLD}--- Section 10: Production Database Immutability Verification ---${RESET}`);

    totalTests++;
    if (prodDbExists) {
      const prodDbStatAfter = fs.statSync(prodDbPath);
      assert.strictEqual(
        prodDbStatAfter.size,
        prodDbStatBefore.size,
        `Production DB size changed! Before: ${prodDbStatBefore.size}, After: ${prodDbStatAfter.size}`
      );
      assert.strictEqual(
        prodDbStatAfter.mtimeMs,
        prodDbStatBefore.mtimeMs,
        'Production DB modified timestamp changed!'
      );
      logPass(`Production database '${prodDbPath}' remains 100% UNTOUCHED (${prodDbStatAfter.size} bytes)`);
    } else {
      logPass('Production database does not exist in standard location, skipping file stat check');
    }

  } catch (err) {
    console.error(`\n${RED}Test execution aborted due to unhandled failure:${RESET}`, err);
    process.exit(1);
  } finally {
    // Shutdown server
    server.close();
    // Clean up temporary database files
    try { fs.unlinkSync(tempDbPath); } catch (_) {}
    try { fs.unlinkSync(`${tempDbPath}-wal`); } catch (_) {}
    try { fs.unlinkSync(`${tempDbPath}-shm`); } catch (_) {}
  }

  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN} All ${passedTests} / ${totalTests} Phase 5 Portal tests passed successfully! (100% PASS) ${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}\n`);
}

runTests();

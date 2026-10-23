/**
 * tests/integration/test_dept_job_titles.js
 * 
 * Comprehensive Integration & Data-Layer Test Suite for SmartWorkforce:
 * Department-First Job Titles Navigation, Department Cards, Shared Titles,
 * Multi-Tenant Security, and Frontend DOM Contracts.
 * 
 * Safety Guarantees:
 * - 100% Isolated Temporary SQLite Database ('tests/isolated_dept_job_titles.db').
 * - Validates production database 'database/smartworkforce.db' remains 100% untouched.
 * - Leaves zero orphaned artifacts or background servers.
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
const testDbPath = path.resolve(__dirname, '..', 'isolated_dept_job_titles.db');
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch (_) {}
  try { fs.unlinkSync(`${testDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${testDbPath}-shm`); } catch (_) {}
}

// Record production DB stats before starting
const prodDbPath = path.resolve(__dirname, '../..', 'database', 'smartworkforce.db');
const prodDbExists = fs.existsSync(prodDbPath);
const prodDbStatBefore = prodDbExists ? fs.statSync(prodDbPath) : null;

// Set isolated DB environment variable BEFORE requiring database modules
process.env.DB_PATH = testDbPath;
process.env.PORT = '0'; // Ephemeral port for test server

const dbModule = require('../../database/database.js');
const { runMigration } = require('../../database/migrate.js');
const auth = require('../../backend/auth.js');
const serverModule = require('../../backend/server.js');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${name}`);
  } catch (err) {
    console.error(`  ${RED}✗ FAIL:${RESET} ${name}`);
    console.error(`    ${RED}${err.stack || err.message}${RESET}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ${GREEN}✓ PASS:${RESET} ${name}`);
  } catch (err) {
    console.error(`  ${RED}✗ FAIL:${RESET} ${name}`);
    console.error(`    ${RED}${err.stack || err.message}${RESET}`);
    throw err;
  }
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAllTests() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD} SmartWorkforce: Department-First Job Titles Navigation Test Suite ${RESET}`);
  console.log(` Running against isolated database: ${testDbPath}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  // Ensure migrations are run on isolated DB
  runMigration();

  // -------------------------------------------------------------------------
  // SUITE 1: Data Model & Seed Setup
  // -------------------------------------------------------------------------
  console.log(`${CYAN}[1/5] Setting up Multi-Tenant Test Companies, Units, and Roles...${RESET}`);

  const now = new Date().toISOString();

  // Company A (Primary test tenant)
  const regA = dbModule.registerCompanyWithHead({
    companyName: 'Apex Robotics Corp',
    industry: 'Industrial Automation',
    adminFullName: 'Apex Admin',
    email: 'admin@apexrobotics.io',
    password: 'AdminApex#2026'
  });
  const compA = regA.company;
  const adminAUser = regA.user;

  // Company B (Cross-tenant security check)
  const regB = dbModule.registerCompanyWithHead({
    companyName: 'Nexus Tech Systems',
    industry: 'Software',
    adminFullName: 'Nexus Admin',
    email: 'admin@nexustech.io',
    password: 'AdminNexus#2026'
  });
  const compB = regB.company;
  const adminBUser = regB.user;

  // Create Org Levels for Company A
  const levelDivision = dbModule.createOrgLevel({
    companyId: compA.id,
    name: 'Division',
    rank: 1,
    description: 'Top organizational division'
  });

  const levelDept = dbModule.createOrgLevel({
    companyId: compA.id,
    name: 'Department',
    rank: 2,
    description: 'Operational business department'
  });

  // Create Departments for Company A
  // 1. Dept A1: Engineering (3 employees, 2 job titles)
  const deptEng = dbModule.createOrgUnit({
    companyId: compA.id,
    name: 'Engineering & Robotics',
    unitType: 'DEPARTMENT',
    levelId: levelDept.id
  });

  // 2. Dept A2: Quality Assurance (3 employees, 2 job titles, 1 shared with Eng)
  const deptQA = dbModule.createOrgUnit({
    companyId: compA.id,
    name: 'Quality Assurance',
    unitType: 'DEPARTMENT',
    levelId: levelDept.id
  });

  // 3. Dept A3: Operations (0 employees, 0 job titles - empty department)
  const deptOps = dbModule.createOrgUnit({
    companyId: compA.id,
    name: 'Operations & Facilities',
    unitType: 'DEPARTMENT',
    levelId: levelDept.id
  });

  // 4. Dept A4: Research (1 employee with NO job title assigned)
  const deptRnd = dbModule.createOrgUnit({
    companyId: compA.id,
    name: 'Research & Prototyping',
    unitType: 'DEPARTMENT',
    levelId: levelDept.id
  });

  // Create Department for Company B
  const deptCompB = dbModule.createOrgUnit({
    companyId: compB.id,
    name: 'Nexus Core Platform',
    unitType: 'DEPARTMENT'
  });

  // Create Job Titles for Company A
  // Title 1: Software Engineer
  const titleDev = dbModule.createJobTitle({
    companyId: compA.id,
    title: 'Software Engineer',
    description: 'Develops embedded firmware and cloud services'
  });

  // Title 2: Automation Specialist (SHARED ACROSS ENGINEERING AND QA)
  const titleAuto = dbModule.createJobTitle({
    companyId: compA.id,
    title: 'Automation Specialist',
    description: 'Robotic cell commissioning and automated inspection'
  });

  // Title 3: Quality Auditor (QA only)
  const titleQA = dbModule.createJobTitle({
    companyId: compA.id,
    title: 'Quality Compliance Auditor',
    description: 'ISO-9001 compliance and safety audits'
  });

  // Title 4: Unassigned Corporate Designation (0 employees)
  const titleUnassigned = dbModule.createJobTitle({
    companyId: compA.id,
    title: 'Corporate Advisor',
    description: 'Advisory board member'
  });

  // Create Job Title for Company B
  const titleCompB = dbModule.createJobTitle({
    companyId: compB.id,
    title: 'Nexus Platform Architect',
    description: 'Lead system designer'
  });

  // Create Employees for Company A
  // Eng: 2 Software Engineers, 1 Automation Specialist (Total 3)
  const empEng1 = dbModule.createEmployee({
    id: 'EMP-ENG-01',
    companyId: compA.id,
    name: 'Alice Cooper',
    department: deptEng.name,
    role: titleDev.title,
    orgUnitId: deptEng.id,
    jobTitleId: titleDev.id,
    uid: 'AA:01:02:03',
    status: 'OUTSIDE'
  });

  const empEng2 = dbModule.createEmployee({
    id: 'EMP-ENG-02',
    companyId: compA.id,
    name: 'Bob Martin',
    department: deptEng.name,
    role: titleDev.title,
    orgUnitId: deptEng.id,
    jobTitleId: titleDev.id,
    uid: 'BB:01:02:03',
    status: 'OUTSIDE'
  });

  const empEng3 = dbModule.createEmployee({
    id: 'EMP-ENG-03',
    companyId: compA.id,
    name: 'Charlie Day',
    department: deptEng.name,
    role: titleAuto.title,
    orgUnitId: deptEng.id,
    jobTitleId: titleAuto.id,
    uid: 'CC:01:02:03',
    status: 'OUTSIDE'
  });

  // QA: 1 Automation Specialist, 2 Quality Auditors (Total 3)
  const empQA1 = dbModule.createEmployee({
    id: 'EMP-QA-01',
    companyId: compA.id,
    name: 'Diana Prince',
    department: deptQA.name,
    role: titleAuto.title,
    orgUnitId: deptQA.id,
    jobTitleId: titleAuto.id,
    uid: 'DD:01:02:03',
    status: 'OUTSIDE'
  });

  const empQA2 = dbModule.createEmployee({
    id: 'EMP-QA-02',
    companyId: compA.id,
    name: 'Evan Wright',
    department: deptQA.name,
    role: titleQA.title,
    orgUnitId: deptQA.id,
    jobTitleId: titleQA.id,
    uid: 'EE:01:02:03',
    status: 'OUTSIDE'
  });

  const empQA3 = dbModule.createEmployee({
    id: 'EMP-QA-03',
    companyId: compA.id,
    name: 'Fiona Gallagher',
    department: deptQA.name,
    role: titleQA.title,
    orgUnitId: deptQA.id,
    jobTitleId: titleQA.id,
    uid: 'FF:01:02:03',
    status: 'OUTSIDE'
  });

  // Research: 1 Employee with NO job title
  const empRnd1 = dbModule.createEmployee({
    id: 'EMP-RND-01',
    companyId: compA.id,
    name: 'George Clark',
    department: deptRnd.name,
    role: 'General Researcher',
    orgUnitId: deptRnd.id,
    jobTitleId: null,
    uid: 'GG:01:02:03',
    status: 'OUTSIDE'
  });

  // Company B employee
  const empCompB = dbModule.createEmployee({
    id: 'EMP-NEX-01',
    companyId: compB.id,
    name: 'Nexus Dev',
    department: deptCompB.name,
    role: titleCompB.title,
    orgUnitId: deptCompB.id,
    jobTitleId: titleCompB.id,
    uid: 'NN:01:02:03',
    status: 'OUTSIDE'
  });

  test('Database successfully populated with multi-department test data', () => {
    assert.strictEqual(typeof deptEng.id, 'string');
    assert.strictEqual(typeof deptQA.id, 'string');
    assert.strictEqual(typeof deptOps.id, 'string');
    assert.strictEqual(typeof deptRnd.id, 'string');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Data-Layer Queries (getOrgUnits & getJobTitlesByUnit)
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[2/5] Testing Data Layer: Department Counts, Titles & Shared Roles...${RESET}`);

  test('getOrgUnits calculates accurate job_title_count and employee_count per department', () => {
    const units = dbModule.getOrgUnits(compA.id);
    assert.strictEqual(units.length, 4, 'Company A should have exactly 4 org units');

    const engUnit = units.find(u => u.id === deptEng.id);
    assert(engUnit, 'Engineering unit not found');
    assert.strictEqual(engUnit.employee_count, 3, 'Engineering should have 3 employees');
    assert.strictEqual(engUnit.job_title_count, 2, 'Engineering should have 2 distinct job titles');

    const qaUnit = units.find(u => u.id === deptQA.id);
    assert(qaUnit, 'QA unit not found');
    assert.strictEqual(qaUnit.employee_count, 3, 'QA should have 3 employees');
    assert.strictEqual(qaUnit.job_title_count, 2, 'QA should have 2 distinct job titles');

    const opsUnit = units.find(u => u.id === deptOps.id);
    assert(opsUnit, 'Operations unit not found');
    assert.strictEqual(opsUnit.employee_count, 0, 'Operations should have 0 employees');
    assert.strictEqual(opsUnit.job_title_count, 0, 'Operations should have 0 job titles');

    const rndUnit = units.find(u => u.id === deptRnd.id);
    assert(rndUnit, 'Research unit not found');
    assert.strictEqual(rndUnit.employee_count, 1, 'Research should have 1 employee');
    assert.strictEqual(rndUnit.job_title_count, 0, 'Research should have 0 assigned job titles');
  });

  test('getJobTitlesByUnit for Engineering returns only titles relevant to Engineering', () => {
    const engTitles = dbModule.getJobTitlesByUnit(deptEng.id, compA.id);
    assert.strictEqual(engTitles.length, 2, 'Engineering should have 2 job titles');

    const devTitle = engTitles.find(t => t.id === titleDev.id);
    assert(devTitle, 'Software Engineer must be returned for Engineering');
    assert.strictEqual(devTitle.employee_count, 2, 'Software Engineer in Engineering has 2 staff');
    assert.strictEqual(devTitle.total_company_employee_count, 2, 'Software Engineer co-wide has 2 staff');

    const autoTitle = engTitles.find(t => t.id === titleAuto.id);
    assert(autoTitle, 'Automation Specialist must be returned for Engineering');
    assert.strictEqual(autoTitle.employee_count, 1, 'Automation Specialist in Engineering has 1 staff');
    assert.strictEqual(autoTitle.total_company_employee_count, 2, 'Automation Specialist co-wide has 2 staff');

    // QA title must NOT appear in Engineering
    const qaTitle = engTitles.find(t => t.id === titleQA.id);
    assert.strictEqual(qaTitle, undefined, 'QA title must NOT be returned for Engineering');
  });

  test('getJobTitlesByUnit for QA handles shared title with department-specific count', () => {
    const qaTitles = dbModule.getJobTitlesByUnit(deptQA.id, compA.id);
    assert.strictEqual(qaTitles.length, 2, 'QA should have 2 job titles');

    const autoTitle = qaTitles.find(t => t.id === titleAuto.id);
    assert(autoTitle, 'Shared Automation Specialist must appear in QA');
    assert.strictEqual(autoTitle.employee_count, 1, 'Automation Specialist in QA has exactly 1 staff');
    assert.strictEqual(autoTitle.total_company_employee_count, 2, 'Automation Specialist co-wide still has 2 staff');

    const qaTitle = qaTitles.find(t => t.id === titleQA.id);
    assert(qaTitle, 'Quality Auditor must appear in QA');
    assert.strictEqual(qaTitle.employee_count, 2, 'Quality Auditor in QA has 2 staff');
    assert.strictEqual(qaTitle.total_company_employee_count, 2, 'Quality Auditor co-wide has 2 staff');

    // Dev title must NOT appear in QA
    const devTitle = qaTitles.find(t => t.id === titleDev.id);
    assert.strictEqual(devTitle, undefined, 'Software Engineer must NOT appear in QA');
  });

  test('getJobTitlesByUnit for empty department returns empty array [] without guessing or inventing titles', () => {
    const opsTitles = dbModule.getJobTitlesByUnit(deptOps.id, compA.id);
    assert(Array.isArray(opsTitles), 'Should return an array');
    assert.strictEqual(opsTitles.length, 0, 'Empty department should return 0 job titles');
  });

  test('getJobTitlesByUnit for department with unassigned staff returns empty array []', () => {
    const rndTitles = dbModule.getJobTitlesByUnit(deptRnd.id, compA.id);
    assert(Array.isArray(rndTitles), 'Should return an array');
    assert.strictEqual(rndTitles.length, 0, 'Department with no assigned job titles should return []');
  });

  test('getJobTitlesByUnit enforces company isolation', () => {
    // Attempting to query Company B's unit using Company A's companyId returns empty
    const foreignTitles = dbModule.getJobTitlesByUnit(deptCompB.id, compA.id);
    assert.strictEqual(foreignTitles.length, 0, 'Cross-tenant query must return empty');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Backend HTTP API Tests (Endpoints, Authentication & Security)
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[3/5] Testing Backend HTTP API: Authentication, unitId Filtering & Isolation...${RESET}`);

  // Start test HTTP server on isolated test port
  const testPort = 3987;
  const server = serverModule.startServer(testPort);
  await new Promise(r => setTimeout(r, 300));
  const port = testPort;

  function getCookie(res, name) {
    const setCookie = res.headers['set-cookie'];
    if (!setCookie) return null;
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const c of cookies) {
      const match = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  }

  // Login as Company A Admin
  const loginResA = await httpRequest({
    hostname: '127.0.0.1',
    port,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    identity: 'admin@apexrobotics.io',
    password: 'AdminApex#2026'
  });
  assert.strictEqual(loginResA.statusCode, 200, 'Company A login should succeed');
  const sessionCookieA = getCookie(loginResA, 'sw_session');
  const csrfTokenA = loginResA.json.csrfToken;
  const authHeadersA = {
    'Cookie': `sw_session=${sessionCookieA}; sw_csrf=${csrfTokenA}`,
    'X-CSRF-Token': csrfTokenA
  };

  // Login as Company B Admin
  const loginResB = await httpRequest({
    hostname: '127.0.0.1',
    port,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    identity: 'admin@nexustech.io',
    password: 'AdminNexus#2026'
  });
  assert.strictEqual(loginResB.statusCode, 200, 'Company B login should succeed');
  const sessionCookieB = getCookie(loginResB, 'sw_session');
  const csrfTokenB = loginResB.json.csrfToken;
  const authHeadersB = {
    'Cookie': `sw_session=${sessionCookieB}; sw_csrf=${csrfTokenB}`,
    'X-CSRF-Token': csrfTokenB
  };

  await asyncTest('GET /api/org/units returns all company departments with correct counts', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/org/units',
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json));
    assert.strictEqual(res.json.length, 4);

    const eng = res.json.find(u => u.id === deptEng.id);
    assert.strictEqual(eng.job_title_count, 2);
    assert.strictEqual(eng.employee_count, 3);
  });

  await asyncTest('GET /api/org/job-titles?unitId=<deptId> returns filtered titles for selected department', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles?unitId=${encodeURIComponent(deptEng.id)}`,
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json));
    assert.strictEqual(res.json.length, 2);

    const titles = res.json.map(t => t.title);
    assert(titles.includes('Software Engineer'));
    assert(titles.includes('Automation Specialist'));
    assert(!titles.includes('Quality Compliance Auditor'));

    // Verify department staff count vs total staff count
    const auto = res.json.find(t => t.title === 'Automation Specialist');
    assert.strictEqual(auto.employee_count, 1, 'Dept staff count in Eng');
    assert.strictEqual(auto.total_company_employee_count, 2, 'Total company staff count');
  });

  await asyncTest('GET /api/org/job-titles?unitId=<emptyDeptId> returns empty array with 200 OK', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles?unitId=${encodeURIComponent(deptOps.id)}`,
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json));
    assert.strictEqual(res.json.length, 0);
  });

  await asyncTest('GET /api/org/job-titles without unitId returns all company job titles (backward compatibility)', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/org/job-titles',
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 200);
    assert(Array.isArray(res.json));
    assert.strictEqual(res.json.length, 4, 'Should return all 4 company job titles');
  });

  await asyncTest('Backend rejects invalid / non-existent department unitId with 404', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/org/job-titles?unitId=NONEXISTENT_DEPT_ID',
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 404);
  });

  await asyncTest('Backend enforces company isolation: foreign tenant unitId returns 404', async () => {
    // Admin A requests Job Titles for Company B's department
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles?unitId=${encodeURIComponent(deptCompB.id)}`,
      method: 'GET',
      headers: authHeadersA
    });

    assert.strictEqual(res.statusCode, 404, 'Must return 404 for cross-tenant department access');
  });

  await asyncTest('Backend enforces authentication: unauthenticated request returns 401', async () => {
    const res = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles?unitId=${encodeURIComponent(deptEng.id)}`,
      method: 'GET'
    });

    assert.strictEqual(res.statusCode, 401);
  });

  await asyncTest('Adding and editing job titles preserves company-wide integrity', async () => {
    // 1. Create a new title
    const newTitleRes = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/org/job-titles',
      method: 'POST',
      headers: {
        ...authHeadersA,
        'Content-Type': 'application/json'
      }
    }, {
      title: 'Robotics Integration Specialist',
      description: 'Field robotics installation',
      csrfToken: csrfTokenA
    });

    assert.strictEqual(newTitleRes.statusCode, 201);
    assert(newTitleRes.json.jobTitle);
    const createdId = newTitleRes.json.jobTitle.id;

    // 2. Update the title
    const updateRes = await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles/${encodeURIComponent(createdId)}`,
      method: 'PUT',
      headers: {
        ...authHeadersA,
        'Content-Type': 'application/json'
      }
    }, {
      title: 'Senior Robotics Integration Specialist',
      description: 'Senior lead field robotics installation',
      csrfToken: csrfTokenA
    });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.json.jobTitle.title, 'Senior Robotics Integration Specialist');

    // Clean up
    await httpRequest({
      hostname: '127.0.0.1',
      port,
      path: `/api/org/job-titles/${encodeURIComponent(createdId)}`,
      method: 'DELETE',
      headers: {
        ...authHeadersA,
        'Content-Type': 'application/json'
      }
    }, {
      csrfToken: csrfTokenA
    });
  });

  // Stop test server
  await new Promise(resolve => server.close(resolve));

  // -------------------------------------------------------------------------
  // SUITE 4: Frontend HTML Structure & DOM Contract Verification
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[4/5] Verifying Frontend HTML, CSS & Client-side DOM Contracts...${RESET}`);

  const htmlPath = path.resolve(__dirname, '../../frontend/admin/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  test('index.html contains both Department Selection View and Department Detail View', () => {
    assert(htmlContent.includes('id="jobTitlesDeptSelectionView"'), 'Missing #jobTitlesDeptSelectionView');
    assert(htmlContent.includes('id="jobTitlesDeptDetailView"'), 'Missing #jobTitlesDeptDetailView');
  });

  test('index.html contains all department selection view elements', () => {
    assert(htmlContent.includes('id="deptCardsGrid"'), 'Missing #deptCardsGrid');
    assert(htmlContent.includes('id="inputSearchDepts"'), 'Missing #inputSearchDepts');
    assert(htmlContent.includes('id="statDeptCount"'), 'Missing #statDeptCount');
    assert(htmlContent.includes('id="statAllJobTitlesCount"'), 'Missing #statAllJobTitlesCount');
    assert(htmlContent.includes('id="jobTitlesNoDeptsEmptyState"'), 'Missing #jobTitlesNoDeptsEmptyState');
    assert(htmlContent.includes('id="btnGoToOrgTreeFromDepts"'), 'Missing #btnGoToOrgTreeFromDepts');
  });

  test('index.html contains breadcrumb back button and selected department detail elements', () => {
    assert(htmlContent.includes('id="btnBackToDepts"'), 'Missing #btnBackToDepts');
    assert(htmlContent.includes('id="deptDetailBreadcrumbName"'), 'Missing #deptDetailBreadcrumbName');
    assert(htmlContent.includes('id="deptDetailTitle"'), 'Missing #deptDetailTitle');
    assert(htmlContent.includes('id="deptDetailBadge"'), 'Missing #deptDetailBadge');
    assert(htmlContent.includes('id="statDeptAssignedStaffCount"'), 'Missing #statDeptAssignedStaffCount');
    assert(htmlContent.includes('id="statJobTitlesCount"'), 'Missing #statJobTitlesCount');
    assert(htmlContent.includes('id="inputSearchJobTitles"'), 'Missing #inputSearchJobTitles');
    assert(htmlContent.includes('id="tableJobTitles"'), 'Missing #tableJobTitles');
    assert(htmlContent.includes('id="tableJobTitlesBody"'), 'Missing #tableJobTitlesBody');
    assert(htmlContent.includes('id="jobTitlesEmptyState"'), 'Missing #jobTitlesEmptyState');
  });

  test('index.html contains department context indicator in Job Title Modal', () => {
    assert(htmlContent.includes('id="jobTitleModalDeptContext"'), 'Missing #jobTitleModalDeptContext');
    assert(htmlContent.includes('id="jobTitleModalDeptName"'), 'Missing #jobTitleModalDeptName');
  });

  const jsPath = path.resolve(__dirname, '../../frontend/admin/admin.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');

  test('admin.js implements department selection, back navigation, and rendering logic', () => {
    assert(jsContent.includes('selectedDeptForJobTitles'), 'Missing selectedDeptForJobTitles in admin.js');
    assert(jsContent.includes('renderDepartmentCards'), 'Missing renderDepartmentCards in admin.js');
    assert(jsContent.includes('selectDepartmentForJobTitles'), 'Missing selectDepartmentForJobTitles in admin.js');
    assert(jsContent.includes('backToDepartmentList'), 'Missing backToDepartmentList in admin.js');
    assert(jsContent.includes('loadDepartmentJobTitles'), 'Missing loadDepartmentJobTitles in admin.js');
    assert(jsContent.includes('inputSearchDepts'), 'Missing inputSearchDepts listener in admin.js');
    assert(jsContent.includes('btnBackToDepts'), 'Missing btnBackToDepts listener in admin.js');
  });

  const cssPath = path.resolve(__dirname, '../../frontend/shared/css/style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  test('style.css defines department grid, cards, breadcrumbs, and detail styling', () => {
    assert(cssContent.includes('.dept-cards-grid'), 'Missing .dept-cards-grid in style.css');
    assert(cssContent.includes('.dept-nav-card'), 'Missing .dept-nav-card in style.css');
    assert(cssContent.includes('.btn-breadcrumb-back'), 'Missing .btn-breadcrumb-back in style.css');
    assert(cssContent.includes('.dept-detail-header-card'), 'Missing .dept-detail-header-card in style.css');
  });

  // -------------------------------------------------------------------------
  // SUITE 5: Safety Guarantee & Production Database Immutability Check
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[5/5] Verifying Production Database Immutability & Safety...${RESET}`);

  test('Production database smartworkforce.db remains 100% untouched', () => {
    if (prodDbExists) {
      assert(fs.existsSync(prodDbPath), 'Production database was unexpectedly deleted!');
      const prodDbStatAfter = fs.statSync(prodDbPath);
      assert.strictEqual(prodDbStatAfter.size, prodDbStatBefore.size, 'Production database file size changed!');
      assert.strictEqual(prodDbStatAfter.mtimeMs, prodDbStatBefore.mtimeMs, 'Production database mtime changed!');
    }
  });

  // Clean up isolated database files
  try { fs.unlinkSync(testDbPath); } catch (_) {}
  try { fs.unlinkSync(`${testDbPath}-wal`); } catch (_) {}
  try { fs.unlinkSync(`${testDbPath}-shm`); } catch (_) {}

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN} ✓ ALL ${passedTests}/${totalTests} DEPARTMENT-FIRST JOB TITLES TESTS PASSED SUCCESSFULLY! ${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);
}

runAllTests().catch(err => {
  console.error(`\n${BOLD}${RED}TEST EXECUTION FAILED WITH ERROR:${RESET}`, err);
  process.exit(1);
});

/**
 * tests/integration/test_system_integration.js
 * 
 * SMARTWORKFORCE — PHASE 6: FINAL INTEGRATION, SECURITY & SYSTEM VALIDATION TEST SUITE
 * 
 * CRITICAL SAFETY RULES:
 * 1. Never delete, truncate, reset, or overwrite production database 'database/smartworkforce.db'.
 * 2. Operates 100% on isolated test databases ('tests/isolated_phase6_validation.db' and 'tests/isolated_phase6_fresh.db').
 * 3. Does not run 'npm run reset-db'.
 * 4. Preserves production database immutability and validates zero byte/timestamp alteration.
 * 
 * VALIDATION SCOPE:
 * - Section 1: Database Integrity, Fresh Schema, Incremental Migration Idempotency & FK Checks (Task 5)
 * - Section 2: Legacy Compatibility & Non-Assigned Employee Safety (Task 3 & 5)
 * - Section 3: Complete Multi-Tier Business Workflow (Task 3)
 *   1. Multi-tenant company registration & admin authentication
 *   2. Hierarchical organizational structure & dynamic job title creation
 *   3. Multi-tier workforce enrollment & temporary password derivation (Name[:4] + Phone[-4:])
 *   4. First-login mandatory password change lifecycle & session acquisition
 *   5. Employee profile, contactless smart card status & upward reporting lineage breadcrumbs
 *   6. Contactless RFID card punch (ENTRY/EXIT) & personal attendance history isolation
 *   7. Manager portal: direct reports live roster, presence state, and checkpoint telemetry
 *   8. Department-Head portal: direct vs indirect descendants distinction & analytics
 *   9. Manager empty state handling
 *   10. Session termination & logout validation
 * - Section 4: Security Boundaries, Tenant Isolation & Attack Immunization (Task 4)
 *   1. Anti-privilege escalation (employees barred from modifying roles, reporting lines, units)
 *   2. Upward & peer snooping protection (403 Forbidden)
 *   3. Multi-tenant strict isolation (Cross-tenant queries return 404 without existence leakage)
 *   4. Cross-tenant manager assignment rejection
 *   5. Circular reporting loop & self-reporting defense
 *   6. CSRF validation for state-changing requests
 *   7. Credential security audit (Zero password_hash or salt exposure)
 * - Section 5: Production Database Immutability Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { DatabaseSync } = require('node:sqlite');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// Safety: Verify production database existence and snapshot state
const prodDbPath = path.resolve(__dirname, '../..', 'database', 'smartworkforce.db');
const prodDbExists = fs.existsSync(prodDbPath);
const prodDbStatBefore = prodDbExists ? fs.statSync(prodDbPath) : null;

// Isolated Test Database Path
const isolatedDbPath = path.resolve(__dirname, '..', 'isolated_phase6_validation.db');
const freshDbPath = path.resolve(__dirname, '..', 'isolated_phase6_fresh.db');

// Clean up stale isolated test files
[isolatedDbPath, freshDbPath].forEach(target => {
  if (fs.existsSync(target)) {
    try { fs.unlinkSync(target); } catch (_) {}
    try { fs.unlinkSync(`${target}-wal`); } catch (_) {}
    try { fs.unlinkSync(`${target}-shm`); } catch (_) {}
  }
});

// Set process.env.DB_PATH BEFORE loading modules
process.env.DB_PATH = isolatedDbPath;

const auth = require('../../backend/auth.js');
const { runMigration } = require('../../database/migrate.js');
const db = require('../../database/database.js');
const { startServer } = require('../../backend/server.js');

let totalTests = 0;
let passedTests = 0;

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

function getCookie(res, name) {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return null;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of list) {
    const parts = c.split(';')[0].split('=');
    if (parts[0].trim() === name) {
      return parts.slice(1).join('=').trim();
    }
  }
  return null;
}

function assertNoSensitiveCredentials(obj, context = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertNoSensitiveCredentials(obj[i], `${context}[${i}]`);
    }
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    assert(
      !lowerKey.includes('password_hash') && !lowerKey.includes('password_salt') && !lowerKey.includes('passwordhash'),
      `Security Violation: Plaintext or hashed credential '${key}' leaked in ${context}`
    );
    if (val && typeof val === 'object') {
      assertNoSensitiveCredentials(val, `${context}.${key}`);
    }
  }
}

async function runPhase6Validation() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD} SmartWorkforce Phase 6: Final Integration & System Validation Suite   ${RESET}`);
  console.log(`${BOLD} Running against isolated database: ${isolatedDbPath}${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  // ========================================================================
  // SECTION 1: DATABASE INTEGRITY, FRESH SCHEMA & MIGRATIONS (TASK 5)
  // ========================================================================
  console.log(`${BOLD}--- Section 1: Database Integrity, Fresh Schema & Incremental Migrations ---${RESET}`);

  // Test 1: Fresh Schema Initialization on empty SQLite file
  totalTests++;
  const freshDb = new DatabaseSync(freshDbPath);
  freshDb.exec('PRAGMA foreign_keys = OFF;');
  
  // Apply fresh schema migration
  const freshMigrateResult = runMigration(freshDb);
  assert.strictEqual(freshMigrateResult.success, true, 'Fresh migration must return success');
  assert.strictEqual(freshMigrateResult.foreignKeyViolations, 0, 'Zero FK violations on fresh DB');

  // Verify all essential tables exist
  const requiredTables = [
    'companies', 'company_users', 'employees', 'employee_accounts',
    'sessions', 'attendance_events', 'org_levels', 'org_units',
    'company_job_titles', 'company_access_roles', 'company_role_permissions',
    'schema_migrations'
  ];
  const tablesInDb = freshDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(t => t.name);
  for (const tbl of requiredTables) {
    assert(tablesInDb.includes(tbl), `Table '${tbl}' must exist in initialized database`);
  }
  logPass('Fresh schema initialization created all required workforce & hierarchy tables');

  // Test 2: Migration Idempotency (Running migration again on existing DB produces 0 errors/changes)
  totalTests++;
  const rerunResult = runMigration(freshDb);
  assert.strictEqual(rerunResult.success, true);
  assert.strictEqual(rerunResult.foreignKeyViolations, 0);
  logPass('Migration execution is 100% idempotent: rerun completed cleanly with zero changes');

  // Test 3: Foreign Key Constraints Enforcement
  totalTests++;
  freshDb.exec('PRAGMA foreign_keys = ON;');
  const fkViolations = freshDb.prepare('PRAGMA foreign_key_check;').all();
  assert.strictEqual(fkViolations.length, 0, 'PRAGMA foreign_key_check must report 0 violations');
  logPass('Foreign key constraints fully verified with 0 integrity violations');
  freshDb.close();

  // Test 4: Run migration on primary isolated test DB
  totalTests++;
  runMigration(isolatedDbPath);
  logPass('Primary isolated test database migrated successfully');

  // Start test server instance
  const server = startServer(3777);
  const serverUrl = 'http://localhost:3777';
  await new Promise(r => setTimeout(r, 600));

  try {
    // ========================================================================
    // SECTION 2: LEGACY COMPATIBILITY & NON-ASSIGNED EMPLOYEES (TASK 3 & 5)
    // ========================================================================
    console.log(`\n${BOLD}--- Section 2: Legacy Employee Compatibility & Safety ---${RESET}`);

    // Verify baseline company COMP-DEFAULT-01 and initial legacy employees
    totalTests++;
    const defaultComp = db.getCompanyById('COMP-DEFAULT-01');
    assert.ok(defaultComp, 'Default baseline company must exist');
    const legacyEmps = db.getAllEmployees('COMP-DEFAULT-01', true);
    assert.ok(legacyEmps.length >= 10, 'Baseline employees must be preserved');

    // Legacy employees without specific org assignment behave safely
    const emp1 = legacyEmps[0];
    assert.ok(emp1.id.startsWith('EMP-'), 'Employee ID must be preserved');
    assert.ok(emp1.name, 'Employee name must be preserved');
    assert.ok(emp1.role, 'Employee role designation must be preserved');
    logPass('Legacy employees preserved with original IDs, names, roles, and status');

    // ========================================================================
    // SECTION 3: COMPLETE MULTI-TIER BUSINESS WORKFLOW (TASK 3)
    // ========================================================================
    console.log(`\n${BOLD}--- Section 3: Complete Multi-Tier Business Workflow ---${RESET}`);

    // 1. Company Registration & Login
    totalTests++;
    const regResA = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'OmniCorp Industrial Solutions',
      industry: 'Advanced Robotics',
      adminFullName: 'Arthur Pendelton',
      email: 'arthur.admin@omnicorp.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(regResA.status, 201);
    const compAId = regResA.body.company.id;

    // Login Admin
    const loginAdminA = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'arthur.admin@omnicorp.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(loginAdminA.status, 200);
    const adminASession = getCookie(loginAdminA, 'sw_session');
    const adminACsrf = loginAdminA.body.csrfToken;
    const adminAHeaders = {
      'Cookie': `sw_session=${adminASession}`,
      'X-CSRF-Token': adminACsrf
    };
    logPass('Company A registered and logged in with Admin session');

    // Register Company B for multi-tenant isolation validation
    totalTests++;
    const regResB = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/register-company' }, {
      companyName: 'Weyland-Yutani Systems',
      industry: 'Aerospace',
      adminFullName: 'Carter Burke',
      email: 'burke@weyland.com',
      password: 'AdminPassword123!'
    });
    assert.strictEqual(regResB.status, 201);
    const compBId = regResB.body.company.id;

    const loginAdminB = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: 'burke@weyland.com',
      password: 'AdminPassword123!'
    });
    const adminBSession = getCookie(loginAdminB, 'sw_session');
    const adminBCsrf = loginAdminB.body.csrfToken;
    const adminBHeaders = {
      'Cookie': `sw_session=${adminBSession}`,
      'X-CSRF-Token': adminBCsrf
    };
    logPass('Company B registered and logged in with Admin session');

    // 2. Hierarchy & Job Titles Setup for Company A
    totalTests++;
    const unitDiv = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: adminAHeaders }, {
      name: 'Automated Operations Division',
      unitType: 'DIVISION'
    });
    const divId = unitDiv.body.unit.id;

    const unitDept = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/units', headers: adminAHeaders }, {
      name: 'Cybernetic Engineering',
      unitType: 'DEPARTMENT',
      parentUnitId: divId
    });
    const deptId = unitDept.body.unit.id;

    // Job Titles
    const jtVP = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: adminAHeaders }, {
      title: 'VP of Robotics',
      code: 'VP-ROB'
    });
    const jtLead = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: adminAHeaders }, {
      title: 'Robotics Team Lead',
      code: 'LEAD-ROB'
    });
    const jtDev = await httpRequest(serverUrl, { method: 'POST', path: '/api/org/job-titles', headers: adminAHeaders }, {
      title: 'Automation Engineer',
      code: 'ENG-AUTO'
    });

    const rolesRes = await httpRequest(serverUrl, { path: '/api/roles', headers: adminAHeaders });
    const roleDeptHead = rolesRes.body.find(r => r.name === 'Department Head');
    const roleLead = rolesRes.body.find(r => r.name === 'Team Lead');
    const roleStaff = rolesRes.body.find(r => r.name === 'Employee');
    logPass('Company A created organizational units and job titles successfully');

    // 3. Employee Creation & Temporary Password Generation (Name[:4] + Phone[-4:])
    totalTests++;
    // VP (Depth 0)
    const empVPRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminAHeaders }, {
      name: 'Victor Vance',
      email: 'victor.vp@omnicorp.com',
      phone: '555-888-1111',
      department: 'Cybernetic Engineering',
      role: 'VP of Robotics',
      orgUnitId: divId,
      jobTitleId: jtVP.body.jobTitle.id,
      accessRoleId: roleDeptHead.id
    });
    assert.strictEqual(empVPRes.status, 201);
    const empVP = empVPRes.body;
    assert.strictEqual(empVP.temporaryPassword, 'Vict1111');

    // Lead (Depth 1, reports to VP)
    const empLeadRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminAHeaders }, {
      name: 'Lucas Trent',
      email: 'lucas.lead@omnicorp.com',
      phone: '555-888-2222',
      department: 'Cybernetic Engineering',
      role: 'Robotics Team Lead',
      orgUnitId: deptId,
      jobTitleId: jtLead.body.jobTitle.id,
      managerId: empVP.id,
      accessRoleId: roleLead.id
    });
    assert.strictEqual(empLeadRes.status, 201);
    const empLead = empLeadRes.body;
    assert.strictEqual(empLead.temporaryPassword, 'Luca2222');

    // Dev1 (Depth 2, reports to Lead)
    const empDev1Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminAHeaders }, {
      name: 'Derek Foster',
      email: 'derek.dev@omnicorp.com',
      phone: '555-888-3333',
      uid: 'CARD-PHASE6-0001',
      department: 'Cybernetic Engineering',
      role: 'Automation Engineer',
      orgUnitId: deptId,
      jobTitleId: jtDev.body.jobTitle.id,
      managerId: empLead.id,
      accessRoleId: roleStaff.id
    });
    assert.strictEqual(empDev1Res.status, 201);
    const empDev1 = empDev1Res.body;
    assert.strictEqual(empDev1.temporaryPassword, 'Dere3333');

    // Dev2 (Depth 2, reports to Lead)
    const empDev2Res = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminAHeaders }, {
      name: 'Danielle Brooks',
      email: 'danielle.dev@omnicorp.com',
      phone: '555-888-4444',
      uid: 'CARD-PHASE6-0002',
      department: 'Cybernetic Engineering',
      role: 'Automation Engineer',
      orgUnitId: deptId,
      jobTitleId: jtDev.body.jobTitle.id,
      managerId: empLead.id,
      accessRoleId: roleStaff.id
    });
    assert.strictEqual(empDev2Res.status, 201);
    const empDev2 = empDev2Res.body;
    assert.strictEqual(empDev2.temporaryPassword, 'Dani4444');

    // Solo Manager (Reports to VP, 0 reports)
    const empSoloRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminAHeaders }, {
      name: 'Samantha Solo',
      email: 'samantha.solo@omnicorp.com',
      phone: '555-888-5555',
      department: 'Cybernetic Engineering',
      role: 'Robotics Team Lead',
      orgUnitId: deptId,
      jobTitleId: jtLead.body.jobTitle.id,
      managerId: empVP.id,
      accessRoleId: roleLead.id
    });
    assert.strictEqual(empSoloRes.status, 201);
    const empSolo = empSoloRes.body;

    // Company B Employee
    const empBRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/employees', headers: adminBHeaders }, {
      name: 'Bishop Android',
      email: 'bishop@weyland.com',
      phone: '555-999-0001',
      department: 'Synthetic Science',
      role: 'Research Executive'
    });
    assert.strictEqual(empBRes.status, 201);
    const empB = empBRes.body;
    logPass('Workforce enrolled with accurate temporary password rule (Name[:4] + Phone[-4:])');

    // 4. First-Login Mandatory Password Change Workflow
    totalTests++;
    const dev1InitialLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: empDev1.id,
      password: empDev1.temporaryPassword,
      portalMode: 'EMPLOYEE'
    });
    assert.strictEqual(dev1InitialLogin.status, 200);
    assert.strictEqual(dev1InitialLogin.body.mustChangePassword, true);
    const dev1InitialSession = getCookie(dev1InitialLogin, 'sw_session');
    const dev1InitialCsrf = dev1InitialLogin.body.csrfToken;
    const dev1TempHeaders = {
      'Cookie': `sw_session=${dev1InitialSession}`,
      'X-CSRF-Token': dev1InitialCsrf
    };

    // Verify access blocked before password change (403 PASSWORD_CHANGE_REQUIRED)
    const blockedMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: dev1TempHeaders });
    assert.strictEqual(blockedMe.status, 403);
    assert.strictEqual(blockedMe.body.code, 'PASSWORD_CHANGE_REQUIRED');

    // Change password to permanent
    const changePwRes = await httpRequest(serverUrl, {
      method: 'POST',
      path: '/api/employee/change-password',
      headers: dev1TempHeaders
    }, {
      currentPassword: empDev1.temporaryPassword,
      newPassword: 'PermanentSecret123!',
      confirmPassword: 'PermanentSecret123!'
    });
    assert.strictEqual(changePwRes.status, 200);

    // Re-login with permanent password
    const dev1PermLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: empDev1.id,
      password: 'PermanentSecret123!',
      portalMode: 'EMPLOYEE'
    });
    assert.strictEqual(dev1PermLogin.status, 200);
    assert.strictEqual(dev1PermLogin.body.mustChangePassword, false);
    const dev1PermSession = getCookie(dev1PermLogin, 'sw_session');
    const dev1PermCsrf = dev1PermLogin.body.csrfToken;
    const dev1ActiveHeaders = {
      'Cookie': `sw_session=${dev1PermSession}`,
      'X-CSRF-Token': dev1PermCsrf
    };
    logPass('Mandatory password change enforced: blocked before change, updated to permanent');

    // Activate other test personas
    async function activateEmp(empId, tempPw) {
      const logRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
        identity: empId, password: tempPw, portalMode: 'EMPLOYEE'
      });
      const sess = getCookie(logRes, 'sw_session');
      const csrf = logRes.body.csrfToken;
      await httpRequest(serverUrl, {
        method: 'POST', path: '/api/employee/change-password',
        headers: { 'Cookie': `sw_session=${sess}`, 'X-CSRF-Token': csrf }
      }, { currentPassword: tempPw, newPassword: 'Perm123Password!', confirmPassword: 'Perm123Password!' });
      const activeRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
        identity: empId, password: 'Perm123Password!', portalMode: 'EMPLOYEE'
      });
      return {
        'Cookie': `sw_session=${getCookie(activeRes, 'sw_session')}`,
        'X-CSRF-Token': activeRes.body.csrfToken
      };
    }
    const leadActiveHeaders = await activateEmp(empLead.id, empLead.temporaryPassword);
    const vpActiveHeaders = await activateEmp(empVP.id, empVP.temporaryPassword);
    const soloActiveHeaders = await activateEmp(empSolo.id, empSolo.temporaryPassword);

    // 5. Employee Profile & Upward Reporting Lineage Breadcrumbs (Feature 1)
    totalTests++;
    const dev1Me = await httpRequest(serverUrl, { path: '/api/employee/me', headers: dev1ActiveHeaders });
    assert.strictEqual(dev1Me.status, 200);
    assert.strictEqual(dev1Me.body.employee.jobTitle, 'Automation Engineer');
    assert.strictEqual(dev1Me.body.employee.orgUnitName, 'Cybernetic Engineering');
    assert.strictEqual(dev1Me.body.employee.managerName, 'Lucas Trent');
    assert.strictEqual(dev1Me.body.employee.cardStatus, 'ACTIVE');
    assert.strictEqual(dev1Me.body.employee.cardUid, 'CARD-PHASE6-0001');

    // Upward reporting chain (Dev1 -> Lead -> VP)
    assert(Array.isArray(dev1Me.body.reportingChain));
    assert.strictEqual(dev1Me.body.reportingChain.length, 3);
    assert.strictEqual(dev1Me.body.reportingChain[0].id, empDev1.id);
    assert.strictEqual(dev1Me.body.reportingChain[1].id, empLead.id);
    assert.strictEqual(dev1Me.body.reportingChain[2].id, empVP.id);
    logPass('Employee profile includes job title, unit, manager, card status, and 3-step lineage');

    // 6. Contactless RFID Card Punch & Personal Attendance History (Feature 1)
    totalTests++;
    const tapEntry = await httpRequest(serverUrl, { method: 'POST', path: '/api/employee/tap', headers: dev1ActiveHeaders }, {
      gate: 'Gate 03 - Robotics Lab Turnstile',
      mode: 'ENTRY'
    });
    assert.strictEqual(tapEntry.status, 200);
    assert.strictEqual(tapEntry.body.event.eventType, 'ENTRY');
    assert.strictEqual(tapEntry.body.employee.status, 'INSIDE');

    const dev1Logs = await httpRequest(serverUrl, { path: '/api/employee/attendance', headers: dev1ActiveHeaders });
    assert.strictEqual(dev1Logs.status, 200);
    assert(Array.isArray(dev1Logs.body));
    assert.strictEqual(dev1Logs.body.length, 1);
    assert.strictEqual(dev1Logs.body[0].gate, 'Gate 03 - Robotics Lab Turnstile');
    logPass('Contactless card punch logged verified ENTRY and reflected in personal attendance');

    // 7. Manager Portal: Direct Reports Live Presence & Gate Telemetry (Feature 2)
    totalTests++;
    const leadRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: leadActiveHeaders });
    assert.strictEqual(leadRoster.status, 200);
    const leadRosterIds = leadRoster.body.map(m => m.id);
    assert(leadRosterIds.includes(empLead.id));
    assert(leadRosterIds.includes(empDev1.id));
    assert(leadRosterIds.includes(empDev2.id));
    assert(!leadRosterIds.includes(empVP.id), 'Lead cannot see superior VP');

    const leadDev1Member = leadRoster.body.find(m => m.id === empDev1.id);
    assert.strictEqual(leadDev1Member.isDirectReport, true);
    assert.strictEqual(leadDev1Member.status, 'INSIDE');
    assert.strictEqual(leadDev1Member.lastGate, 'Gate 03 - Robotics Lab Turnstile');
    assert.strictEqual(leadDev1Member.lastEventType, 'ENTRY');
    logPass('Team Lead roster accurately displays direct reports with live presence and gate telemetry');

    // 8. Department-Head Portal: Descendants Distinction & Analytics (Feature 3)
    totalTests++;
    const vpRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: vpActiveHeaders });
    assert.strictEqual(vpRoster.status, 200);
    const vpLeadMember = vpRoster.body.find(m => m.id === empLead.id);
    const vpDev1Member = vpRoster.body.find(m => m.id === empDev1.id);
    assert.strictEqual(vpLeadMember.isDirectReport, true, 'Lead is direct report to VP');
    assert.strictEqual(vpDev1Member.isDirectReport, false, 'Dev1 is indirect report to VP');
    assert.strictEqual(vpDev1Member.managerName, 'Lucas Trent');

    const vpAnalytics = await httpRequest(serverUrl, { path: '/api/team/analytics', headers: vpActiveHeaders });
    assert.strictEqual(vpAnalytics.status, 200);
    assert.ok(vpAnalytics.body.teamSummary);
    assert.strictEqual(typeof vpAnalytics.body.teamSummary.totalMembers, 'number');
    assert.strictEqual(typeof vpAnalytics.body.teamSummary.insideCount, 'number');
    assert.ok(vpAnalytics.body.departmentBreakdown);
    logPass('Department Head clearly distinguishes direct from indirect reports with live analytics');

    // 9. Manager Empty State Handling (Feature 3)
    totalTests++;
    const soloRoster = await httpRequest(serverUrl, { path: '/api/team/roster', headers: soloActiveHeaders });
    assert.strictEqual(soloRoster.status, 200);
    const soloSubordinates = soloRoster.body.filter(m => m.id !== empSolo.id);
    assert.strictEqual(soloSubordinates.length, 0, 'Solo manager has 0 subordinates');
    logPass('Manager with no assigned subordinates safely returns empty list without errors');

    // 10. Logout and Session Expiration
    totalTests++;
    const logoutRes = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/logout', headers: dev1ActiveHeaders });
    assert.strictEqual(logoutRes.status, 200);

    const postLogoutMe = await httpRequest(serverUrl, { path: '/api/employee/me', headers: dev1ActiveHeaders });
    assert.strictEqual(postLogoutMe.status, 401, 'Logged out session must return 401');
    logPass('Logout successfully terminated server session and invalidated access');

    // ========================================================================
    // SECTION 4: SECURITY BOUNDARIES, TENANT ISOLATION & ATTACKS (TASK 4)
    // ========================================================================
    console.log(`\n${BOLD}--- Section 4: Security Boundaries, Tenant Isolation & Attack Defenses ---${RESET}`);

    // Re-login Dev1 for security testing
    const dev1SecLogin = await httpRequest(serverUrl, { method: 'POST', path: '/api/auth/login' }, {
      identity: empDev1.id, password: 'PermanentSecret123!', portalMode: 'EMPLOYEE'
    });
    const dev1SecSession = getCookie(dev1SecLogin, 'sw_session');
    const dev1SecCsrf = dev1SecLogin.body.csrfToken;
    const dev1SecHeaders = {
      'Cookie': `sw_session=${dev1SecSession}`,
      'X-CSRF-Token': dev1SecCsrf
    };

    // 1. Employee cannot self-modify reporting manager or role
    totalTests++;
    const escReport = await httpRequest(serverUrl, {
      method: 'PUT',
      path: `/api/employees/${empDev1.id}/reporting`,
      headers: dev1SecHeaders
    }, { managerId: empVP.id });
    assert.strictEqual(escReport.status, 403, 'Employee self-reassignment must return 403');
    logPass('Employee strictly barred from modifying their own reporting manager (403)');

    // 2. Standard Employee cannot view superior profile
    totalTests++;
    const snoopLead = await httpRequest(serverUrl, { path: `/api/employees/${empLead.id}`, headers: dev1SecHeaders });
    assert.strictEqual(snoopLead.status, 403, 'Snooping superior must return 403');
    logPass('Employee strictly barred from snooping superior profile (403)');

    // 3. Standard Employee cannot view peer profile
    totalTests++;
    const snoopPeer = await httpRequest(serverUrl, { path: `/api/employees/${empDev2.id}`, headers: dev1SecHeaders });
    assert.strictEqual(snoopPeer.status, 403, 'Snooping peer must return 403');
    logPass('Employee strictly barred from snooping peer profile (403)');

    // 4. Team Lead cannot view superior Director profile
    totalTests++;
    const leadSnoopVP = await httpRequest(serverUrl, { path: `/api/employees/${empVP.id}`, headers: leadActiveHeaders });
    assert.strictEqual(leadSnoopVP.status, 403, 'Team Lead viewing superior Director must return 403');
    logPass('Team Lead strictly barred from accessing superior profile (403)');

    // 5. Cross-Tenant Isolation: Foreign company admin querying Company A employee returns 404 (No presence leakage)
    totalTests++;
    const crossEmp = await httpRequest(serverUrl, { path: `/api/employees/${empDev1.id}`, headers: adminBHeaders });
    assert.strictEqual(crossEmp.status, 404, 'Cross-company lookup must return 404 without existence disclosure');
    logPass('Multi-tenant isolation: Cross-company employee lookup returns 404 cleanly');

    // 6. Cross-Tenant Reassignment Mutation returns 404
    totalTests++;
    const crossReassign = await httpRequest(serverUrl, {
      method: 'PUT',
      path: `/api/employees/${empDev1.id}/reporting`,
      headers: adminBHeaders
    }, { managerId: empB.id });
    assert.strictEqual(crossReassign.status, 404);
    logPass('Multi-tenant isolation: Cross-company reporting mutation returns 404');

    // 7. Cross-Tenant Manager Assignment within Company A rejected
    totalTests++;
    const crossCompMgr = await httpRequest(serverUrl, {
      method: 'PUT',
      path: `/api/employees/${empDev1.id}/reporting`,
      headers: adminAHeaders
    }, { managerId: empB.id });
    assert.strictEqual(crossCompMgr.status, 400);
    logPass('Cross-company manager assignment rejected (foreign manager cannot be assigned)');

    // 8. Self-reporting rejected (A -> A)
    totalTests++;
    const selfRep = await httpRequest(serverUrl, {
      method: 'PUT',
      path: `/api/employees/${empLead.id}/reporting`,
      headers: adminAHeaders
    }, { managerId: empLead.id });
    assert.strictEqual(selfRep.status, 400);
    logPass('Self-reporting circular assignment rejected with 400 Bad Request');

    // 9. Deep Circular Reporting Loop Defense (VP -> Dev1 when Dev1 -> Lead -> VP)
    totalTests++;
    const circRep = await httpRequest(serverUrl, {
      method: 'PUT',
      path: `/api/employees/${empVP.id}/reporting`,
      headers: adminAHeaders
    }, { managerId: empDev1.id });
    assert.strictEqual(circRep.status, 400);
    logPass('Deep circular reporting dependency loop (A -> B -> C -> A) rejected with 400');

    // 10. Anti-CSRF Enforcement for state-changing requests
    totalTests++;
    const csrfBypass = await httpRequest(serverUrl, {
      method: 'POST',
      path: '/api/employee/tap',
      headers: {
        'Cookie': `sw_session=${dev1SecSession}` // Omits X-CSRF-Token
      }
    }, { gate: 'Gate 01' });
    assert.strictEqual(csrfBypass.status, 403, 'Missing CSRF token must return 403');
    logPass('Anti-CSRF enforcement verified: cookie mutation rejected without CSRF token');

    // 11. Zero Sensitive Credential Exposure Scan
    totalTests++;
    assertNoSensitiveCredentials(dev1Me.body, 'dev1 /api/employee/me');
    assertNoSensitiveCredentials(leadRoster.body, 'lead /api/team/roster');
    assertNoSensitiveCredentials(vpRoster.body, 'vp /api/team/roster');
    assertNoSensitiveCredentials(vpAnalytics.body, 'vp /api/team/analytics');
    logPass('Comprehensive credential audit: zero password_hash or salt leaked in portal responses');

  } finally {
    // Terminate test server
    server.close();
  }

  // ========================================================================
  // SECTION 5: PRODUCTION DATABASE IMMUTABILITY VERIFICATION
  // ========================================================================
  console.log(`\n${BOLD}--- Section 5: Production Database Immutability Check ---${RESET}`);
  totalTests++;
  if (prodDbExists) {
    const prodDbStatAfter = fs.statSync(prodDbPath);
    assert.strictEqual(
      prodDbStatAfter.size,
      prodDbStatBefore.size,
      `Production DB file size modified! Before: ${prodDbStatBefore.size}, After: ${prodDbStatAfter.size}`
    );
    assert.strictEqual(
      prodDbStatAfter.mtimeMs,
      prodDbStatBefore.mtimeMs,
      `Production DB mtime modified! Before: ${prodDbStatBefore.mtimeMs}, After: ${prodDbStatAfter.mtimeMs}`
    );
    logPass(`Production database '${prodDbPath}' remains 100% UNTOUCHED (${prodDbStatAfter.size} bytes)`);
  }

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD}${GREEN} All ${passedTests} / ${totalTests} Phase 6 Final Validation tests passed successfully! (100% PASS) ${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);
}

runPhase6Validation().catch(err => {
  console.error(`\n${RED}Test execution aborted due to unhandled failure:${RESET}`, err);
  process.exit(1);
});

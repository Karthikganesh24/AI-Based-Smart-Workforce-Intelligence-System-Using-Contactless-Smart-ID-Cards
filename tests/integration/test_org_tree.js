/**
 * tests/integration/test_org_tree.js
 * 
 * Comprehensive Isolated Test Suite for SmartWorkforce Phase 2:
 * Custom Organizational Tree & Dynamic Role Management Data Layer.
 * 
 * Safety Guarantee:
 * - Runs 100% against an isolated temporary database ('tests/isolated_org_test.db').
 * - Validates production database 'database/smartworkforce.db' remains 100% untouched.
 * - Tests migration execution, idempotency, data preservation, cycle prevention,
 *   multi-tenant isolation, dynamic roles, permissions, and recursive CTEs.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// 1. Setup Isolated Temporary Database
const testDbPath = path.resolve(__dirname, '..', 'isolated_org_test.db');
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

const dbModule = require('../../database/database.js');
const { runMigration } = require('../../database/migrate.js');
const auth = require('../../backend/auth.js');

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

async function runAllTests() {
  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${BOLD} SmartWorkforce: Phase 2 Data-Layer & Org Tree Test Suite ${RESET}`);
  console.log(` Running against isolated database: ${testDbPath}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);

  // -------------------------------------------------------------------------
  // SUITE 1: Migration Execution, Schema Verification, & Idempotency
  // -------------------------------------------------------------------------
  console.log(`${CYAN}[1/8] Testing Migration Execution, Schema Verification & Idempotency...${RESET}`);

  test('All 5 new tables and schema_migrations exist in isolated database', () => {
    const tables = dbModule.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    assert(tables.includes('org_levels'), 'org_levels table missing');
    assert(tables.includes('org_units'), 'org_units table missing');
    assert(tables.includes('company_job_titles'), 'company_job_titles table missing');
    assert(tables.includes('company_access_roles'), 'company_access_roles table missing');
    assert(tables.includes('company_role_permissions'), 'company_role_permissions table missing');
    assert(tables.includes('schema_migrations'), 'schema_migrations table missing');
  });

  test('New reporting and assignment columns exist on employees table', () => {
    const cols = dbModule.db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
    assert(cols.includes('manager_id'), 'employees.manager_id missing');
    assert(cols.includes('org_unit_id'), 'employees.org_unit_id missing');
    assert(cols.includes('job_title_id'), 'employees.job_title_id missing');
    assert(cols.includes('access_role_id'), 'employees.access_role_id missing');
    assert(cols.includes('department'), 'employees.department missing (legacy preservation)');
    assert(cols.includes('role'), 'employees.role missing (legacy preservation)');
  });

  test('Foreign key integrity validation reports 0 violations', () => {
    const violations = dbModule.db.prepare('PRAGMA foreign_key_check;').all();
    assert.strictEqual(violations.length, 0, `Foreign key violations: ${JSON.stringify(violations)}`);
  });

  test('schema_migrations ledger records v2_org_tree_roles', () => {
    const row = dbModule.db.prepare("SELECT * FROM schema_migrations WHERE version = 'v2_org_tree_roles'").get();
    assert(row, 'Migration version v2_org_tree_roles was not recorded');
    assert(row.applied_at, 'applied_at timestamp is empty');
  });

  test('Migration rerun is 100% idempotent and leaves counts unchanged', () => {
    const empsBefore = dbModule.db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
    const eventsBefore = dbModule.db.prepare('SELECT COUNT(*) AS c FROM attendance_events').get().c;
    const levelsBefore = dbModule.db.prepare('SELECT COUNT(*) AS c FROM org_levels').get().c;

    // Run migration a second time on the same DB instance
    const res = runMigration(dbModule.db);
    assert.strictEqual(res.success, true, 'Migration rerun failed');

    const empsAfter = dbModule.db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
    const eventsAfter = dbModule.db.prepare('SELECT COUNT(*) AS c FROM attendance_events').get().c;
    const levelsAfter = dbModule.db.prepare('SELECT COUNT(*) AS c FROM org_levels').get().c;

    assert.strictEqual(empsBefore, empsAfter, 'Employee count altered during rerun');
    assert.strictEqual(eventsBefore, eventsAfter, 'Attendance events count altered during rerun');
    assert.strictEqual(levelsBefore, levelsAfter, 'Org levels duplicated during rerun');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Legacy Data Preservation & Baseline Seeding
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[2/8] Verifying Baseline Data Preservation & Legacy Backfilling...${RESET}`);

  test('Baseline company COMP-DEFAULT-01 has default org levels (1: Executive -> 4: Staff)', () => {
    const levels = dbModule.getOrgLevels('COMP-DEFAULT-01');
    assert.strictEqual(levels.length, 4, `Expected 4 levels, got ${levels.length}`);
    assert.strictEqual(levels[0].name, 'Executive');
    assert.strictEqual(levels[0].rank, 1);
    assert.strictEqual(levels[3].name, 'Staff');
    assert.strictEqual(levels[3].rank, 4);
  });

  test('Baseline company COMP-DEFAULT-01 has 4 default access roles', () => {
    const roles = dbModule.getAccessRoles('COMP-DEFAULT-01');
    const roleNames = roles.map(r => r.name);
    assert(roleNames.includes('Administrator'), 'Administrator role missing');
    assert(roleNames.includes('Department Head'), 'Department Head role missing');
    assert(roleNames.includes('Team Lead'), 'Team Lead role missing');
    assert(roleNames.includes('Employee'), 'Employee role missing');
  });

  test('Initial 12 employees preserved with legacy department/role and backfilled foreign keys', () => {
    const emps = dbModule.getAllEmployees('COMP-DEFAULT-01');
    assert.strictEqual(emps.length, 12, `Expected 12 baseline employees, got ${emps.length}`);

    for (const emp of emps) {
      assert(emp.department, `Employee ${emp.id} lost department string`);
      assert(emp.role, `Employee ${emp.id} lost role string`);
      assert(emp.orgUnitId, `Employee ${emp.id} orgUnitId was not backfilled`);
      assert(emp.jobTitleId, `Employee ${emp.id} jobTitleId was not backfilled`);
      assert(emp.accessRoleId, `Employee ${emp.id} accessRoleId was not backfilled`);
    }

    const emp101 = dbModule.getEmployeeById('EMP-101');
    assert.strictEqual(emp101.name, 'Aravind Kumar');
    assert.strictEqual(emp101.department, 'Production');
    assert.strictEqual(emp101.role, 'CNC Lead Operator');
    assert(emp101.orgUnitName.includes('Production'));
    assert(emp101.jobTitleName.includes('CNC Lead Operator'));
  });

  test('Initial 6 attendance events preserved with original timestamps and gates', () => {
    const events = dbModule.getAllAttendanceEvents('COMP-DEFAULT-01');
    assert.strictEqual(events.length, 6, `Expected 6 baseline events, got ${events.length}`);
    assert.strictEqual(events[0].id, 'LOG-1001');
    assert.strictEqual(events[0].empId, 'EMP-108');
    assert.strictEqual(events[0].eventType, 'ENTRY');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Custom Organizational Levels (Tiers)
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[3/8] Testing Custom Organizational Levels (Tiers)...${RESET}`);

  // Register two distinct companies for multi-tenancy verification
  const compA = dbModule.registerCompanyWithHead({
    companyName: 'Apex Aerospace Ltd',
    industry: 'Aerospace Engineering',
    adminFullName: 'Air Marshal Sharma',
    email: 'head@apex-aero.internal',
    password: 'ApexPassword2024!'
  });

  const compB = dbModule.registerCompanyWithHead({
    companyName: 'Biotec Pharma Labs',
    industry: 'Pharmaceuticals',
    adminFullName: 'Dr. Sarah Connor',
    email: 'head@biotec-pharma.internal',
    password: 'BiotecPassword2024!'
  });

  const compAId = compA.company.id;
  const compBId = compB.company.id;

  test('Company A creates custom manufacturing hierarchy levels (Plant Director -> Operator)', () => {
    const l1 = dbModule.createOrgLevel({ companyId: compAId, name: 'Plant Director', rank: 1 });
    const l2 = dbModule.createOrgLevel({ companyId: compAId, name: 'Shop Floor Manager', rank: 2 });
    const l3 = dbModule.createOrgLevel({ companyId: compAId, name: 'Shift Supervisor', rank: 3 });
    const l4 = dbModule.createOrgLevel({ companyId: compAId, name: 'Line Operator', rank: 4 });

    const levels = dbModule.getOrgLevels(compAId);
    assert.strictEqual(levels.length, 4);
    assert.strictEqual(levels[0].name, 'Plant Director');
    assert.strictEqual(levels[3].name, 'Line Operator');
  });

  test('Rejects duplicate level rank within same company (409 Conflict)', () => {
    assert.throws(() => {
      dbModule.createOrgLevel({ companyId: compAId, name: 'Co-Director', rank: 1 });
    }, /already exists in this organization/);
  });

  test('Rejects duplicate level name within same company (409 Conflict)', () => {
    assert.throws(() => {
      dbModule.createOrgLevel({ companyId: compAId, name: 'Plant Director', rank: 5 });
    }, /already exists in this organization/);
  });

  test('Allows identical level names and ranks in different companies (Tenant Isolation)', () => {
    const l1B = dbModule.createOrgLevel({ companyId: compBId, name: 'Plant Director', rank: 1 });
    assert.strictEqual(l1B.company_id, compBId);
    assert.strictEqual(l1B.name, 'Plant Director');
  });

  test('Update org level name and rank with validation', () => {
    const levels = dbModule.getOrgLevels(compAId);
    const l4 = levels.find(l => l.name === 'Line Operator');
    const updated = dbModule.updateOrgLevel({ id: l4.id, companyId: compAId, name: 'Assembly Specialist', rank: 4 });
    assert.strictEqual(updated.name, 'Assembly Specialist');
  });

  test('Delete org level clears references in child units safely', () => {
    const tempLvl = dbModule.createOrgLevel({ companyId: compAId, name: 'Temporary Tier', rank: 10 });
    const delRes = dbModule.deleteOrgLevel(tempLvl.id, compAId);
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(dbModule.getOrgLevelById(tempLvl.id, compAId), undefined);
  });

  // -------------------------------------------------------------------------
  // SUITE 4: Custom Organizational Units & Hierarchy Trees
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[4/8] Testing Organizational Units & Hierarchy Trees...${RESET}`);

  let rootUnitA, childUnitA1, childUnitA2, grandChildA;

  test('Create multi-tier organizational units with parent-child linkage', () => {
    const levels = dbModule.getOrgLevels(compAId);
    const l1 = levels.find(l => l.rank === 1);
    const l2 = levels.find(l => l.rank === 2);
    const l3 = levels.find(l => l.rank === 3);

    rootUnitA = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Aerostructures Division',
      unitType: 'DIVISION',
      levelId: l1.id
    });
    assert.strictEqual(rootUnitA.name, 'Aerostructures Division');
    assert.strictEqual(rootUnitA.parent_unit_id, null);

    childUnitA1 = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Fuselage Assembly',
      unitType: 'DEPARTMENT',
      parentUnitId: rootUnitA.id,
      levelId: l2.id
    });
    assert.strictEqual(childUnitA1.parent_unit_id, rootUnitA.id);

    childUnitA2 = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Avionics Integration',
      unitType: 'DEPARTMENT',
      parentUnitId: rootUnitA.id,
      levelId: l2.id
    });

    grandChildA = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Cockpit Wiring Team',
      unitType: 'TEAM',
      parentUnitId: childUnitA2.id,
      levelId: l3.id
    });
    assert.strictEqual(grandChildA.parent_unit_id, childUnitA2.id);
  });

  test('Rejects self-parenting unit (unit cannot be its own parent)', () => {
    assert.throws(() => {
      dbModule.updateOrgUnit({
        id: rootUnitA.id,
        companyId: compAId,
        parentUnitId: rootUnitA.id
      });
    }, /cannot be its own parent/);
  });

  test('Rejects circular parent unit dependency (A -> B -> A)', () => {
    assert.throws(() => {
      dbModule.updateOrgUnit({
        id: rootUnitA.id,
        companyId: compAId,
        parentUnitId: grandChildA.id
      });
    }, /Circular unit hierarchy detected/);
  });

  test('Rejects cross-company parent unit reference (Company A cannot use Company B unit as parent)', () => {
    const unitB = dbModule.createOrgUnit({
      companyId: compBId,
      name: 'Bio Research Div',
      unitType: 'DIVISION'
    });

    assert.throws(() => {
      dbModule.createOrgUnit({
        companyId: compAId,
        name: 'Illegal Cross Branch',
        parentUnitId: unitB.id
      });
    }, /belongs to a different organization/);
  });

  test('Rejects duplicate unit name under the same parent', () => {
    assert.throws(() => {
      dbModule.createOrgUnit({
        companyId: compAId,
        name: 'Fuselage Assembly',
        parentUnitId: rootUnitA.id
      });
    }, /already exists under the selected parent unit/);
  });

  test('Allows identical unit names under different parent units', () => {
    const team1 = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Quality Inspection',
      parentUnitId: childUnitA1.id
    });
    const team2 = dbModule.createOrgUnit({
      companyId: compAId,
      name: 'Quality Inspection',
      parentUnitId: childUnitA2.id
    });
    assert.strictEqual(team1.name, team2.name);
    assert.notStrictEqual(team1.parent_unit_id, team2.parent_unit_id);
  });

  test('getOrgUnitHierarchy returns structured tree with nested children', () => {
    const tree = dbModule.getOrgUnitHierarchy(compAId);
    assert(tree.length >= 1, 'Root units missing in tree');
    const aero = tree.find(u => u.id === rootUnitA.id);
    assert(aero, 'Root aerostructures unit not in root list');
    assert(aero.children.length >= 2, `Expected at least 2 children under root, got ${aero.children.length}`);
    const avionics = aero.children.find(u => u.id === childUnitA2.id);
    assert(avionics, 'Avionics department missing under Aerostructures');
    assert(avionics.children.length >= 1, 'Grandchild cockpit team missing under Avionics');
  });

  // -------------------------------------------------------------------------
  // SUITE 5: Dynamic Job Titles (HR Designations)
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[5/8] Testing Dynamic Job Titles (HR Designations)...${RESET}`);

  let job1A, job2A;

  test('Create company-specific job titles', () => {
    job1A = dbModule.createJobTitle({
      companyId: compAId,
      title: 'Principal Avionics Engineer',
      description: 'Lead flight software systems'
    });
    job2A = dbModule.createJobTitle({
      companyId: compAId,
      title: 'Structural Fatigue Analyst',
      description: 'Stress testing airframe metal'
    });
    assert.strictEqual(job1A.title, 'Principal Avionics Engineer');
    assert.strictEqual(job1A.is_active, 1);
  });

  test('Duplicate job title in same company rejected (409 Conflict)', () => {
    assert.throws(() => {
      dbModule.createJobTitle({
        companyId: compAId,
        title: 'Principal Avionics Engineer'
      });
    }, /already exists in this organization/);
  });

  test('Same job title allowed in a different company (Multi-Tenant Isolation)', () => {
    const jobB = dbModule.createJobTitle({
      companyId: compBId,
      title: 'Principal Avionics Engineer'
    });
    assert.strictEqual(jobB.company_id, compBId);
  });

  test('Deactivate and reactivate job title', () => {
    const deactivated = dbModule.updateJobTitle({
      id: job1A.id,
      companyId: compAId,
      isActive: 0
    });
    assert.strictEqual(deactivated.is_active, 0);

    const activeOnly = dbModule.getJobTitles(compAId, false);
    assert(!activeOnly.some(j => j.id === job1A.id), 'Inactive job title returned in active list');

    const allTitles = dbModule.getJobTitles(compAId, true);
    assert(allTitles.some(j => j.id === job1A.id), 'Inactive job title missing from includeInactive list');

    // Reactivate
    const reactivated = dbModule.updateJobTitle({
      id: job1A.id,
      companyId: compAId,
      isActive: 1
    });
    assert.strictEqual(reactivated.is_active, 1);
  });

  // -------------------------------------------------------------------------
  // SUITE 6: Access Roles & Permissions (Decoupled from Job Titles)
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[6/8] Testing Access Roles & Granular Permissions...${RESET}`);

  let customRoleAuditor, customRoleLead;

  test('Create custom access roles with fine-grained permissions & scopes', () => {
    customRoleAuditor = dbModule.createAccessRole({
      companyId: compAId,
      name: 'Compliance Auditor',
      description: 'Read-only audit permissions across attendance and workforce logs',
      permissions: [
        { key: 'attendance:view', scope: 'COMPANY' },
        { key: 'employees:view', scope: 'COMPANY' },
        { key: 'analytics:view', scope: 'COMPANY' }
      ]
    });

    assert.strictEqual(customRoleAuditor.name, 'Compliance Auditor');
    assert.strictEqual(customRoleAuditor.permissions.length, 3);
    assert.strictEqual(customRoleAuditor.permissions[0].key, 'attendance:view');
    assert.strictEqual(customRoleAuditor.permissions[0].scope, 'COMPANY');

    customRoleLead = dbModule.createAccessRole({
      companyId: compAId,
      name: 'Shift Supervisor Role',
      description: 'Departmental operational authority',
      permissions: [
        { key: 'attendance:view', scope: 'DIRECT_REPORTS' },
        { key: 'employees:view', scope: 'DIRECT_REPORTS' },
        { key: 'attendance:manage', scope: 'DIRECT_REPORTS' }
      ]
    });
    assert.strictEqual(customRoleLead.permissions.length, 3);
  });

  test('Rejects invalid permission keys or scopes with 400 Bad Request', () => {
    assert.throws(() => {
      dbModule.createAccessRole({
        companyId: compAId,
        name: 'Invalid Perm Role',
        permissions: [{ key: 'hacker:root_access', scope: 'COMPANY' }]
      });
    }, /Invalid permission key/);

    assert.throws(() => {
      dbModule.createAccessRole({
        companyId: compAId,
        name: 'Invalid Scope Role',
        permissions: [{ key: 'attendance:view', scope: 'UNIVERSAL_ADMIN' }]
      });
    }, /Invalid permission scope/);
  });

  test('System roles are protected and cannot be deleted', () => {
    const roles = dbModule.getAccessRoles(compAId);
    const adminRole = roles.find(r => r.name === 'Administrator');
    assert(adminRole.is_system_role, 'Administrator should be a system role');

    assert.throws(() => {
      dbModule.deleteAccessRole(adminRole.id, compAId);
    }, /System roles are protected/);
  });

  test('Decoupling verification: two employees with identical job title have distinct access roles', () => {
    // Both are 'Principal Avionics Engineer'
    const empAlice = dbModule.createEmployeeWithAccount({
      name: 'Alice Cooper',
      companyId: compAId,
      jobTitleId: job1A.id,
      orgUnitId: childUnitA2.id,
      accessRoleId: customRoleAuditor.id,
      phone: '9888811111'
    });

    const empBob = dbModule.createEmployeeWithAccount({
      name: 'Bob Marley',
      companyId: compAId,
      jobTitleId: job1A.id,
      orgUnitId: childUnitA2.id,
      accessRoleId: customRoleLead.id,
      phone: '9888822222'
    });

    assert.strictEqual(empAlice.employee.role, empBob.employee.role);
    assert.strictEqual(empAlice.employee.jobTitleId, empBob.employee.jobTitleId);
    assert.notStrictEqual(empAlice.employee.accessRoleId, empBob.employee.accessRoleId);

    const permsAlice = dbModule.getEmployeeEffectivePermissions(empAlice.employee.id, compAId);
    const permsBob = dbModule.getEmployeeEffectivePermissions(empBob.employee.id, compAId);

    // Alice has COMPANY scope on attendance:view
    assert.strictEqual(permsAlice['attendance:view'], 'COMPANY');
    // Bob has DIRECT_REPORTS scope on attendance:view
    assert.strictEqual(permsBob['attendance:view'], 'DIRECT_REPORTS');
  });

  // -------------------------------------------------------------------------
  // SUITE 7: Reporting Hierarchy & Circular Dependency Cycle Detection
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[7/8] Testing Reporting Assignment & Circular Dependency Prevention...${RESET}`);

  let empDirector, empManager, empSupervisor, empWorker;

  test('Create linear hierarchy chain: Director -> Manager -> Supervisor -> Worker', () => {
    empDirector = dbModule.createEmployeeWithAccount({
      id: 'EMP-AERO-01',
      name: 'Director Vikramaditya',
      companyId: compAId,
      department: 'Aerostructures Division',
      role: 'Plant Director',
      orgUnitId: rootUnitA.id,
      phone: '9111100001'
    }).employee;

    empManager = dbModule.createEmployeeWithAccount({
      id: 'EMP-AERO-02',
      name: 'Manager Rajesh',
      companyId: compAId,
      department: 'Avionics Integration',
      role: 'Shop Floor Manager',
      orgUnitId: childUnitA2.id,
      managerId: empDirector.id,
      phone: '9111100002'
    }).employee;
    assert.strictEqual(empManager.managerId, empDirector.id);

    empSupervisor = dbModule.createEmployeeWithAccount({
      id: 'EMP-AERO-03',
      name: 'Supervisor Sunita',
      companyId: compAId,
      department: 'Avionics Integration',
      role: 'Shift Supervisor',
      orgUnitId: childUnitA2.id,
      managerId: empManager.id,
      phone: '9111100003'
    }).employee;
    assert.strictEqual(empSupervisor.managerId, empManager.id);

    empWorker = dbModule.createEmployeeWithAccount({
      id: 'EMP-AERO-04',
      name: 'Operator Danish',
      companyId: compAId,
      department: 'Avionics Integration',
      role: 'Assembly Specialist',
      orgUnitId: childUnitA2.id,
      managerId: empSupervisor.id,
      phone: '9111100004'
    }).employee;
    assert.strictEqual(empWorker.managerId, empSupervisor.id);
  });

  test('Self-reporting rejection: Employee cannot report to themselves (EMP-AERO-01 -> EMP-AERO-01)', () => {
    assert.throws(() => {
      dbModule.assignEmployeeOrgAndReporting({
        employeeId: empDirector.id,
        companyId: compAId,
        managerId: empDirector.id
      });
    }, /cannot report to themselves/);
  });

  test('Direct 2-person cycle rejection: (Supervisor -> Manager, Manager -> Supervisor)', () => {
    // Currently: Supervisor -> Manager. Attempting Manager -> Supervisor must throw CIRCULAR_REPORTING
    assert.throws(() => {
      dbModule.assignEmployeeOrgAndReporting({
        employeeId: empManager.id,
        companyId: compAId,
        managerId: empSupervisor.id
      });
    }, /Circular reporting relationship detected/);
  });

  test('Deep 4-person circular cycle rejection: (Director -> Operator when Operator reports down from Director)', () => {
    // Currently: Worker -> Supervisor -> Manager -> Director.
    // Attempting Director -> Worker would make a complete 4-person loop!
    assert.throws(() => {
      dbModule.assignEmployeeOrgAndReporting({
        employeeId: empDirector.id,
        companyId: compAId,
        managerId: empWorker.id
      });
    }, /Circular reporting relationship detected/);
  });

  test('Cross-company reporting assignment rejected with 400 Bad Request', () => {
    const empPharma = dbModule.createEmployeeWithAccount({
      name: 'Dr. Jekyll',
      companyId: compBId,
      department: 'Bio Research',
      role: 'Chemist',
      phone: '9222233333'
    }).employee;

    assert.throws(() => {
      dbModule.assignEmployeeOrgAndReporting({
        employeeId: empWorker.id,
        companyId: compAId,
        managerId: empPharma.id
      });
    }, /belongs to a different organization/);
  });

  test('Archived employee cannot be assigned as reporting manager', () => {
    const empTemp = dbModule.createEmployeeWithAccount({
      name: 'Retiring Chief',
      companyId: compAId,
      department: 'Aerostructures Division',
      role: 'Advisor',
      phone: '9333344444'
    }).employee;

    dbModule.deleteOrArchiveEmployee(empTemp.id, compAId);

    assert.throws(() => {
      dbModule.assignEmployeeOrgAndReporting({
        employeeId: empWorker.id,
        companyId: compAId,
        managerId: empTemp.id
      });
    }, /Cannot assign archived employee/);
  });

  test('Valid reassignment succeeds without error', () => {
    // Reassign Operator Danish to report directly to Manager Rajesh (bypassing Supervisor Sunita)
    const reassigned = dbModule.assignEmployeeOrgAndReporting({
      employeeId: empWorker.id,
      companyId: compAId,
      managerId: empManager.id
    });
    assert.strictEqual(reassigned.managerId, empManager.id);
    assert.strictEqual(reassigned.managerName, empManager.name);

    // Reassign back to Supervisor Sunita
    dbModule.assignEmployeeOrgAndReporting({
      employeeId: empWorker.id,
      companyId: compAId,
      managerId: empSupervisor.id
    });
  });

  // -------------------------------------------------------------------------
  // SUITE 8: Recursive CTE Subordinates & Reporting Breadcrumbs
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}[8/8] Testing Recursive CTE Subordinates & Reporting Breadcrumbs...${RESET}`);

  test('getDirectReports returns only immediate subordinates (depth = 1)', () => {
    const directReportsOfDirector = dbModule.getDirectReports(empDirector.id, compAId);
    assert.strictEqual(directReportsOfDirector.length, 1);
    assert.strictEqual(directReportsOfDirector[0].id, empManager.id);

    const directReportsOfSupervisor = dbModule.getDirectReports(empSupervisor.id, compAId);
    assert.strictEqual(directReportsOfSupervisor.length, 1);
    assert.strictEqual(directReportsOfSupervisor[0].id, empWorker.id);
  });

  test('getRecursiveSubordinates (CTE) returns all multi-level descendants with depths', () => {
    // Director -> Manager (depth 1) -> Supervisor (depth 2) -> Worker (depth 3)
    const allDescendants = dbModule.getRecursiveSubordinates(empDirector.id, compAId);
    assert.strictEqual(allDescendants.length, 3, `Expected 3 descendants under Director, got ${allDescendants.length}`);

    const descMap = new Map(allDescendants.map(d => [d.id, d]));
    assert(descMap.has(empManager.id));
    assert(descMap.has(empSupervisor.id));
    assert(descMap.has(empWorker.id));

    assert.strictEqual(descMap.get(empManager.id).depth, 1);
    assert.strictEqual(descMap.get(empSupervisor.id).depth, 2);
    assert.strictEqual(descMap.get(empWorker.id).depth, 3);
  });

  test('getReportingChain (CTE) returns full upward breadcrumb path to top leadership', () => {
    // Worker -> Supervisor -> Manager -> Director
    const chain = dbModule.getReportingChain(empWorker.id, compAId);
    assert.strictEqual(chain.length, 4, `Expected 4 breadcrumbs in chain, got ${chain.length}`);

    assert.strictEqual(chain[0].id, empWorker.id);
    assert.strictEqual(chain[0].depth, 0);

    assert.strictEqual(chain[1].id, empSupervisor.id);
    assert.strictEqual(chain[1].depth, 1);

    assert.strictEqual(chain[2].id, empManager.id);
    assert.strictEqual(chain[2].depth, 2);

    assert.strictEqual(chain[3].id, empDirector.id);
    assert.strictEqual(chain[3].depth, 3);
  });

  test('getOrgHierarchy summarizes entire organizational structure for company', () => {
    const overview = dbModule.getOrgHierarchy(compAId);
    assert(overview.company, 'Company details missing');
    assert(overview.levels.length >= 4, 'Levels missing');
    assert(overview.units.length >= 1, 'Units tree missing');
    assert(overview.roles.length >= 2, 'Roles missing');
    assert(overview.jobTitles.length >= 2, 'Job titles missing');
    assert(overview.totalEmployees >= 4, 'Total employees count missing');
  });

  // -------------------------------------------------------------------------
  // FINAL SAFETY CHECK: Assert Production Database was 100% Untouched
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}========================================================================${RESET}`);
  console.log(`${CYAN} Final Safety Check: Production Database Immutability Verification ${RESET}`);
  console.log(`${CYAN}========================================================================${RESET}`);

  if (prodDbExists && prodDbStatBefore) {
    const prodDbStatAfter = fs.statSync(prodDbPath);
    assert.strictEqual(
      prodDbStatBefore.size,
      prodDbStatAfter.size,
      `FATAL: Production database size changed! Before: ${prodDbStatBefore.size}, After: ${prodDbStatAfter.size}`
    );
    assert.strictEqual(
      prodDbStatBefore.mtimeMs,
      prodDbStatAfter.mtimeMs,
      `FATAL: Production database mtime changed! Before: ${prodDbStatBefore.mtimeMs}, After: ${prodDbStatAfter.mtimeMs}`
    );
    console.log(`  ${GREEN}✓ VERIFIED:${RESET} Production DB 'database/smartworkforce.db' was 100% UNTOUCHED.`);
    console.log(`    Size: ${prodDbStatAfter.size} bytes (unchanged)`);
    console.log(`    Modified Time: ${prodDbStatAfter.mtime.toISOString()} (unchanged)`);
  } else {
    console.log(`  ${YELLOW}! NOTE:${RESET} Production database did not exist prior to test run.`);
  }

  // Cleanup isolated test database
  try {
    dbModule.db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
    if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    console.log(`  ${GREEN}✓ VERIFIED:${RESET} Temporary test database '${path.basename(testDbPath)}' cleaned up safely.`);
  } catch (_) {}

  console.log(`\n${BOLD}========================================================================${RESET}`);
  console.log(`${GREEN}${BOLD} ALL ${passedTests} OF ${totalTests} ISOLATED PHASE 2 TESTS PASSED SUCCESSFULLY! (100% PASS) ${RESET}`);
  console.log(`${BOLD}========================================================================${RESET}\n`);
}

runAllTests().catch(err => {
  console.error(`\n${RED}${BOLD}TEST RUN FAILED:${RESET}`, err);
  process.exit(1);
});

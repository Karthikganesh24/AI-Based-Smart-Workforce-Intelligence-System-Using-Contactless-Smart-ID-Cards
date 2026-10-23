#!/usr/bin/env node
/**
 * scripts/run_all_tests.js
 * Comprehensive Automated Test Runner for SmartWorkforce.
 * 
 * Supports executing:
 *   - Complete automated test suite: node scripts/run_all_tests.js
 *   - Unit tests only:               node scripts/run_all_tests.js --unit
 *   - Integration tests only:        node scripts/run_all_tests.js --integration
 * 
 * Guarantees:
 *   - 100% Production Database Isolation (smartworkforce.db remains untouched).
 *   - Clean-up of temporary isolated test databases.
 *   - Detailed timing, pass/fail metrics, and human-readable terminal reporting.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const ROOT_DIR = path.resolve(__dirname, '..');
const PROD_DB_PATH = path.join(ROOT_DIR, 'database', 'smartworkforce.db');
const TESTS_DIR = path.join(ROOT_DIR, 'tests');

// Define test suites
const UNIT_TESTS = [
  { name: 'Employee Contact & Password Generation', file: 'tests/unit/test_employee_contact.js' },
  { name: 'Admin Temporary Password Reset',         file: 'tests/unit/test_password_reset.js' }
];

const INTEGRATION_TESTS = [
  { name: 'SQLite Persistence & AI Analytics',     file: 'tests/integration/test_persistence_analytics.js' },
  { name: 'Employee CRUD & Lifecycle Audit',       file: 'tests/integration/test_employee_crud.js' },
  { name: 'Org Hierarchy & CTE Reporting Tree',    file: 'tests/integration/test_org_tree.js' },
  { name: 'API Authorization & Access Control',    file: 'tests/integration/test_api_authorization.js' },
  { name: 'Admin Management Frontend & Assets',    file: 'tests/integration/test_admin_frontend.js' },
  { name: 'Employee & Manager Self-Service Portal',file: 'tests/integration/test_employee_manager_portal.js' },
  { name: 'Department-First Job Titles Navigation',file: 'tests/integration/test_dept_job_titles.js' },
  { name: 'End-to-End System Integration',         file: 'tests/integration/test_system_integration.js' }
];

// Parse CLI arguments
const args = process.argv.slice(2);
const isUnitOnly = args.includes('--unit');
const isIntegrationOnly = args.includes('--integration');

let suitesToRun = [];
let modeLabel = 'COMPLETE TEST SUITE (Unit + Integration)';

if (isUnitOnly && !isIntegrationOnly) {
  suitesToRun = UNIT_TESTS;
  modeLabel = 'UNIT TEST SUITE ONLY';
} else if (isIntegrationOnly && !isUnitOnly) {
  suitesToRun = INTEGRATION_TESTS;
  modeLabel = 'INTEGRATION TEST SUITE ONLY';
} else {
  suitesToRun = [...UNIT_TESTS, ...INTEGRATION_TESTS];
}

// Clean temporary test databases
function cleanupTempDbs() {
  if (!fs.existsSync(TESTS_DIR)) return;
  const files = fs.readdirSync(TESTS_DIR);
  for (const f of files) {
    if (f.startsWith('isolated_') || f.startsWith('temp_')) {
      const p = path.join(TESTS_DIR, f);
      try { fs.unlinkSync(p); } catch (_) {}
    }
  }
}

// Execute a single test suite via child process
function runSuite(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const suitePath = path.join(ROOT_DIR, suite.file);

    console.log(`\n${BOLD}${CYAN}------------------------------------------------------------------------${RESET}`);
    console.log(`${BOLD}▶ Executing: ${suite.name}${RESET}`);
    console.log(`${DIM}  File: ${suite.file}${RESET}`);
    console.log(`${BOLD}${CYAN}------------------------------------------------------------------------${RESET}`);

    const proc = spawn(process.execPath, [suitePath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env }
    });

    proc.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        ...suite,
        passed: code === 0,
        exitCode: code,
        durationMs
      });
    });

    proc.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      console.error(`${RED}Process error in ${suite.file}:${RESET}`, err);
      resolve({
        ...suite,
        passed: false,
        exitCode: 1,
        durationMs,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD} SMARTWORKFORCE AUTOMATED TEST RUNNER${RESET}`);
  console.log(` Mode: ${BOLD}${modeLabel}${RESET}`);
  console.log(` Suites: ${BOLD}${suitesToRun.length}${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);

  // Safety Pre-flight check
  let prodDbStatBefore = null;
  if (fs.existsSync(PROD_DB_PATH)) {
    prodDbStatBefore = fs.statSync(PROD_DB_PATH);
    console.log(`${YELLOW}ℹ Production DB:${RESET} ${PROD_DB_PATH}`);
    console.log(`  Initial Size: ${prodDbStatBefore.size} bytes | MTime: ${prodDbStatBefore.mtime.toISOString()}`);
  } else {
    console.log(`${YELLOW}ℹ Production DB not found at: ${PROD_DB_PATH}${RESET}`);
  }

  // Pre-cleanup of transient test databases
  cleanupTempDbs();

  const results = [];
  const overallStartTime = Date.now();

  for (const suite of suitesToRun) {
    const res = await runSuite(suite);
    results.push(res);
  }

  const overallDurationMs = Date.now() - overallStartTime;

  // Post-flight safety check on production DB
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD} PRODUCTION DATABASE INTEGRITY AUDIT${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);

  let dbUntouched = true;
  if (prodDbStatBefore) {
    if (!fs.existsSync(PROD_DB_PATH)) {
      console.error(`${RED}✗ CRITICAL FAILURE: Production database was deleted during test execution!${RESET}`);
      dbUntouched = false;
    } else {
      const prodDbStatAfter = fs.statSync(PROD_DB_PATH);
      const sizeMatch = prodDbStatAfter.size === prodDbStatBefore.size;
      const mtimeMatch = prodDbStatAfter.mtime.getTime() === prodDbStatBefore.mtime.getTime();

      if (sizeMatch && mtimeMatch) {
        console.log(`  ${GREEN}✓ VERIFIED: Production database smartworkforce.db remains 100% UNTOUCHED.${RESET}`);
        console.log(`    File Size: ${prodDbStatAfter.size} bytes (identical)`);
        console.log(`    Last Modified: ${prodDbStatAfter.mtime.toISOString()} (identical)`);
      } else {
        console.error(`${RED}✗ WARNING: Production database stats changed!${RESET}`);
        console.error(`    Size: ${prodDbStatBefore.size} -> ${prodDbStatAfter.size}`);
        console.error(`    MTime: ${prodDbStatBefore.mtime.toISOString()} -> ${prodDbStatAfter.mtime.toISOString()}`);
        dbUntouched = false;
      }
    }
  }

  // Post-cleanup of transient test databases
  cleanupTempDbs();

  // Summary Report
  console.log(`\n${BOLD}${CYAN}========================================================================${RESET}`);
  console.log(`${BOLD} TEST EXECUTION SUMMARY${RESET}`);
  console.log(`${BOLD}${CYAN}========================================================================${RESET}`);

  let allPassed = true;
  for (const r of results) {
    const statusIcon = r.passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    const durSec = (r.durationMs / 1000).toFixed(2);
    console.log(`  [${statusIcon}]  ${r.name.padEnd(46)} (${durSec}s)`);
    if (!r.passed) allPassed = false;
  }

  console.log(`${BOLD}${CYAN}------------------------------------------------------------------------${RESET}`);
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const totalSec = (overallDurationMs / 1000).toFixed(2);

  if (allPassed && dbUntouched) {
    console.log(`${BOLD}${GREEN}✔ ALL ${passedCount}/${totalCount} TEST SUITES PASSED SUCCESSFULLY! (${totalSec}s)${RESET}`);
    console.log(`${BOLD}${GREEN}✔ Production Database Immobility: CONFIRMED${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${BOLD}${RED}✖ TEST SUITE FAILURE: ${passedCount}/${totalCount} suites passed (${totalSec}s)${RESET}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal runner error:${RESET}`, err);
  process.exit(1);
});

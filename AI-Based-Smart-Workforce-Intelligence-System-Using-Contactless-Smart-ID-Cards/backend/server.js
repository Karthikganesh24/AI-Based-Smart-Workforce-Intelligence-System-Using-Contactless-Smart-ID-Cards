const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../database/database.js');
const analytics = require('./analytics.js');
const auth = require('./auth.js');

let port = parseInt(process.env.PORT, 10) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

/**
 * Phase 5B: In-Memory Virtual Simulation Session Metrics
 * Tracks actual live scan outcomes without fabricating numbers.
 * Safely cleared via DELETE /api/simulation/report without touching database records.
 */
const simulationSessionStats = {
  startedAt: new Date().toISOString(),
  lastResetAt: new Date().toISOString(),
  totalAttempts: 0,
  acceptedScans: 0,
  entriesLogged: 0,
  exitsLogged: 0,
  debouncedReads: 0,
  rejectedUnknownUids: 0,
  simulationErrors: 0,
  recordAttempt(outcome, details = {}) {
    this.totalAttempts++;
    if (outcome === 'ACCEPTED') {
      this.acceptedScans++;
      if (details.eventType === 'ENTRY') {
        this.entriesLogged++;
      } else if (details.eventType === 'EXIT') {
        this.exitsLogged++;
      }
    } else if (outcome === 'DEBOUNCED') {
      this.debouncedReads++;
    } else if (outcome === 'UNKNOWN_UID') {
      this.rejectedUnknownUids++;
    } else if (outcome === 'ERROR') {
      this.simulationErrors++;
    }
  },
  reset() {
    this.totalAttempts = 0;
    this.acceptedScans = 0;
    this.entriesLogged = 0;
    this.exitsLogged = 0;
    this.debouncedReads = 0;
    this.rejectedUnknownUids = 0;
    this.simulationErrors = 0;
    this.lastResetAt = new Date().toISOString();
  }
};

/**
 * Helper to parse JSON body from incoming HTTP request
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON Payload'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * JSON Response Helpers
 */
function sendJson(res, statusCode, data, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...extraHeaders
  };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, extraHeaders = {}) {
  sendJson(res, statusCode, { error: message }, extraHeaders);
}

/**
 * Session Resolution Helper
 * Inspects HttpOnly cookies and Authorization Bearer headers.
 * Hashes incoming token via SHA-256 before database lookup.
 */
function resolveSession(req) {
  const cookieHeader = req.headers.cookie;
  const cookies = auth.parseCookies(cookieHeader);
  const rawToken = cookies.sw_session || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : null);
  if (!rawToken) return null;

  const tokenHash = auth.hashToken(rawToken);
  const session = db.getSession(tokenHash);
  if (!session) return null;

  // Check absolute expiration
  if (new Date(session.expires_at) < new Date()) {
    db.deleteSession(tokenHash);
    return null;
  }

  // Load account and company
  if (session.user_type === 'COMPANY_HEAD' || session.user_type === 'COMPANY_ADMIN') {
    const user = db.getCompanyUserById(session.account_id);
    if (!user) return null;
    const company = db.getCompanyById(session.company_id);
    return {
      session,
      rawToken,
      user,
      company,
      userType: session.user_type,
      companyId: session.company_id,
      isCookieAuth: Boolean(cookies.sw_session)
    };
  } else if (session.user_type === 'EMPLOYEE') {
    const emp = db.getEmployeeById(session.account_id);
    if (!emp) return null;
    const acc = db.getEmployeeAccountByEmpId(session.account_id);
    if (!acc) return null;
    // Reject suspended or pending accounts immediately
    if (acc.account_status !== 'ACTIVE') return null;
    const company = db.getCompanyById(session.company_id);
    return {
      session,
      rawToken,
      user: emp,
      account: acc,
      company,
      userType: 'EMPLOYEE',
      companyId: session.company_id,
      mustChangePassword: Boolean(acc.must_change_password),
      isCookieAuth: Boolean(cookies.sw_session)
    };
  }
  return null;
}

/**
 * Anti-CSRF Token Validation for State-Changing Requests
 */
function verifyCsrf(req, authContext, body) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  // Requests using Bearer token / external headers are immune to browser CSRF
  if (!authContext.isCookieAuth) return true;

  const incomingDeviceId = req.headers['x-device-id'] || (body && body.deviceId);
  if (incomingDeviceId || req.headers['x-gateway-key']) return true;

  const submittedToken = req.headers['x-csrf-token'] || (body && body.csrfToken);
  if (!submittedToken) return false;

  return auth.verifyCsrfToken(submittedToken, authContext.session.csrf_token);
}

/**
 * Phase 3 Backend Authorization & Permission Resolution Helpers
 */
function getAuthEffectivePermissions(authCtx) {
  if (!authCtx) return {};

  // Company Head and Company Admin have full COMPANY-wide scope across all permission keys
  if (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') {
    return {
      'org:view': 'COMPANY',
      'org:manage': 'COMPANY',
      'roles:manage': 'COMPANY',
      'employees:view': 'COMPANY',
      'employees:manage': 'COMPANY',
      'attendance:view': 'COMPANY',
      'attendance:manage': 'COMPANY',
      'analytics:view': 'COMPANY'
    };
  }

  if (authCtx.userType === 'EMPLOYEE') {
    const effective = db.getEmployeeEffectivePermissions(authCtx.user.id, authCtx.companyId);
    if (!effective || Object.keys(effective).length === 0) {
      return {
        'employees:view': 'SELF',
        'attendance:view': 'SELF'
      };
    }
    return effective;
  }

  return {};
}

const SCOPE_RANKS = {
  'SELF': 1,
  'DIRECT_REPORTS': 2,
  'DESCENDANTS': 3,
  'DEPARTMENT': 4,
  'COMPANY': 5
};

function hasPermission(authCtx, permKey, requiredScope = null) {
  if (!authCtx) return false;
  if (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') {
    return true;
  }
  const perms = getAuthEffectivePermissions(authCtx);
  const userScope = perms[permKey];
  if (!userScope) return false;
  if (!requiredScope) return true;
  return (SCOPE_RANKS[userScope] || 0) >= (SCOPE_RANKS[requiredScope] || 99);
}

function getPermittedEmployeeIds(authCtx, permKey) {
  if (!authCtx) return [];
  if (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') {
    return null; // Full company scope
  }

  const perms = getAuthEffectivePermissions(authCtx);
  const scope = perms[permKey];
  if (!scope) return [];

  if (scope === 'COMPANY') {
    return null; // Full company scope
  }

  const empId = authCtx.user.id;
  const companyId = authCtx.companyId;

  if (scope === 'SELF') {
    return [empId];
  }

  if (scope === 'DIRECT_REPORTS') {
    const directReports = db.getDirectReports(empId, companyId);
    return [empId, ...directReports.map(r => r.id)];
  }

  if (scope === 'DESCENDANTS') {
    const recursive = db.getRecursiveSubordinates(empId, companyId);
    return [empId, ...recursive.map(r => r.id)];
  }

  if (scope === 'DEPARTMENT') {
    const allEmps = db.getAllEmployees(companyId, true);
    const userOrgUnitId = authCtx.user.orgUnitId || authCtx.user.org_unit_id;
    const userDept = authCtx.user.department;
    return allEmps
      .filter(e => {
        if (e.id === empId) return true;
        if (userOrgUnitId && e.orgUnitId === userOrgUnitId) return true;
        if (userDept && e.department && e.department.toLowerCase() === userDept.toLowerCase()) return true;
        return false;
      })
      .map(e => e.id);
  }

  return [];
}

function canAccessEmployee(authCtx, targetEmp, permKey) {
  if (!authCtx || !targetEmp) return false;
  const empCompanyId = targetEmp.companyId || targetEmp.company_id;
  if (empCompanyId !== authCtx.companyId) return false;

  if (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') {
    return true;
  }

  const permittedIds = getPermittedEmployeeIds(authCtx, permKey);
  if (permittedIds === null) return true;
  return permittedIds.includes(targetEmp.id);
}

function checkPasswordChangeRequired(authCtx, res) {
  if (authCtx && authCtx.userType === 'EMPLOYEE' && authCtx.mustChangePassword) {
    sendJson(res, 403, {
      error: 'Password change required before accessing workforce resources.',
      code: 'PASSWORD_CHANGE_REQUIRED',
      mustChangePassword: true,
      employeeId: authCtx.user.id,
      name: authCtx.user.name
    });
    return true;
  }
  return false;
}

/**
 * REST API Router
 */
async function handleApiRequest(req, res, urlPath) {
  const method = req.method.toUpperCase();
  const pathOnly = (typeof urlPath === 'string' && urlPath.length > 1)
    ? urlPath.replace(/\/+$/, '')
    : urlPath;

  const isSecure = Boolean(req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https');

  try {
    // =========================================================
    // AUTHENTICATION & MULTI-TENANCY ENDPOINTS
    // =========================================================

    // A. POST /api/auth/register-company - Atomic Company & Company Head Registration
    if (pathOnly === '/api/auth/register-company' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { companyName, industry, adminFullName, adminName, email, companyEmail, password } = body;
      const targetAdminName = adminFullName || adminName;
      const targetEmail = email || companyEmail;

      let regResult;
      try {
        regResult = db.registerCompanyWithHead({
          companyName,
          industry,
          adminFullName: targetAdminName,
          email: targetEmail,
          password
        });
      } catch (regErr) {
        const status = regErr.statusCode || 400;
        return sendError(res, status, regErr.message);
      }

      // Do not automatically create a session or set session cookies.
      // The user must manually log in using their credentials after registration.
      return sendJson(res, 201, {
        success: true,
        message: 'Company registered successfully! Please log in using your registered email and password.',
        redirectTo: '/login',
        company: {
          id: regResult.company.id,
          name: regResult.company.name,
          industry: regResult.company.industry,
          email: regResult.company.email
        },
        user: {
          id: regResult.user.id,
          fullName: regResult.user.full_name,
          email: regResult.user.email,
          role: regResult.user.role,
          companyId: regResult.user.company_id
        }
      });
    }

    // B. POST /api/auth/login - Server-side Company Head / Admin / Employee Login
    if (pathOnly === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { identity, email, adminId, employeeId, password, portalMode } = body;
      const targetIdentity = (identity || email || adminId || employeeId || '').trim();

      if (!targetIdentity || !password) {
        return sendError(res, 400, 'Identity and password are required.');
      }

      const isEmployeeMode = portalMode === 'EMPLOYEE' || (portalMode !== 'ADMIN' && targetIdentity.toUpperCase().startsWith('EMP-'));

      if (isEmployeeMode) {
        const normEmpId = targetIdentity.toUpperCase();
        const emp = db.getEmployeeById(normEmpId) || db.getEmployeeById(targetIdentity);
        const acc = db.getEmployeeAccountByEmpId(normEmpId) || db.getEmployeeAccountByEmpId(targetIdentity);

        if (!emp || !acc) {
          return sendError(res, 401, 'Invalid employee ID or password.');
        }

        const isValidPassword = auth.verifyPassword(password, acc.password_salt, acc.password_hash);
        if (!isValidPassword) {
          return sendError(res, 401, 'Invalid employee ID or password.');
        }

        if (acc.account_status === 'SUSPENDED') {
          return sendError(res, 403, 'Account suspended. Contact your company administrator.');
        }
        if (acc.account_status === 'PENDING') {
          return sendError(res, 403, 'Account pending activation. Contact your company administrator.');
        }
        if (acc.account_status !== 'ACTIVE') {
          return sendError(res, 403, 'Account is not active.');
        }

        const rawToken = auth.generateOpaqueToken();
        const tokenHash = auth.hashToken(rawToken);
        const csrfToken = auth.generateCsrfToken();
        const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();
        const empCompanyId = emp.companyId || emp.company_id;

        db.createSession({
          id: tokenHash,
          accountId: emp.id,
          userType: 'EMPLOYEE',
          companyId: empCompanyId,
          csrfToken: csrfToken,
          ipAddress: req.socket.remoteAddress,
          userAgent: req.headers['user-agent'],
          expiresAt: expiresAt
        });

        const cookies = [
          auth.serializeCookie('sw_session', rawToken, { maxAge: 86400, httpOnly: true, sameSite: 'Lax', secure: isSecure, path: '/' }),
          auth.serializeCookie('sw_csrf', csrfToken, { maxAge: 86400, httpOnly: false, sameSite: 'Lax', secure: isSecure, path: '/' })
        ];

        const mustChange = Boolean(acc.must_change_password);
        return sendJson(res, 200, {
          success: true,
          message: 'Authentication successful.',
          mustChangePassword: mustChange,
          redirectTo: mustChange ? '/employee?action=change-password' : '/employee',
          user: {
            id: emp.id,
            fullName: emp.name,
            role: emp.role,
            department: emp.department,
            companyId: empCompanyId,
            userType: 'EMPLOYEE'
          },
          csrfToken: csrfToken
        }, { 'Set-Cookie': cookies });
      }

      // Company Head / Admin Login Flow
      const user = db.getCompanyUserByEmailOrId(targetIdentity);
      if (!user) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const isValidPassword = auth.verifyPassword(password, user.password_salt, user.password_hash);
      if (!isValidPassword) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const rawToken = auth.generateOpaqueToken();
      const tokenHash = auth.hashToken(rawToken);
      const csrfToken = auth.generateCsrfToken();
      const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

      db.createSession({
        id: tokenHash,
        accountId: user.id,
        userType: user.role,
        companyId: user.company_id,
        csrfToken: csrfToken,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        expiresAt: expiresAt
      });

      const cookies = [
        auth.serializeCookie('sw_session', rawToken, { maxAge: 86400, httpOnly: true, sameSite: 'Lax', secure: isSecure, path: '/' }),
        auth.serializeCookie('sw_csrf', csrfToken, { maxAge: 86400, httpOnly: false, sameSite: 'Lax', secure: isSecure, path: '/' })
      ];

      return sendJson(res, 200, {
        success: true,
        message: 'Authentication successful.',
        redirectTo: '/admin',
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          companyId: user.company_id
        },
        csrfToken: csrfToken
      }, { 'Set-Cookie': cookies });
    }

    // C. GET /api/auth/me - Retrieve Current Authenticated User Context
    if (pathOnly === '/api/auth/me' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendJson(res, 401, { authenticated: false, error: 'Authentication required.' });
      }

      return sendJson(res, 200, {
        authenticated: true,
        user: {
          id: authCtx.user.id,
          fullName: authCtx.user.full_name || authCtx.user.name,
          email: authCtx.user.email || null,
          role: authCtx.user.role || authCtx.userType,
          companyId: authCtx.companyId,
          userType: authCtx.userType
        },
        mustChangePassword: Boolean(authCtx.mustChangePassword),
        company: authCtx.company ? {
          id: authCtx.company.id,
          name: authCtx.company.name,
          industry: authCtx.company.industry,
          email: authCtx.company.email
        } : null,
        csrfToken: authCtx.session.csrf_token
      });
    }

    // D. POST /api/auth/logout - Invalidate Session and Clear Cookies
    if (pathOnly === '/api/auth/logout' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (authCtx) {
        const body = await parseJsonBody(req).catch(() => ({}));
        if (!verifyCsrf(req, authCtx, body)) {
          return sendError(res, 403, 'Invalid or missing CSRF token.');
        }
        db.deleteSession(authCtx.session.id);
      }

      const cookies = [
        auth.serializeCookie('sw_session', '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', path: '/' }),
        auth.serializeCookie('sw_csrf', '', { maxAge: 0, sameSite: 'Lax', path: '/' })
      ];

      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' }, { 'Set-Cookie': cookies });
    }

    // =========================================================
    // EMPLOYEE PORTAL ENDPOINTS (AUTHENTICATED & ISOLATED)
    // =========================================================

    // E. POST /api/employee/change-password - Mandatory / Self Password Change
    if (pathOnly === '/api/employee/change-password' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required.');
      }
      if (authCtx.userType !== 'EMPLOYEE') {
        return sendError(res, 403, 'Permission denied: Employee portal only.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { currentPassword, newPassword, confirmPassword } = body;
      if (!currentPassword || !newPassword) {
        return sendError(res, 400, 'Current password and new password are required.');
      }

      if (confirmPassword !== undefined && newPassword !== confirmPassword) {
        return sendError(res, 400, 'New password and confirmation do not match.');
      }

      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return sendError(res, 400, 'New password must be at least 8 characters long.');
      }

      const isValidCurrent = auth.verifyPassword(currentPassword, authCtx.account.password_salt, authCtx.account.password_hash);
      if (!isValidCurrent) {
        return sendError(res, 400, 'Current password is incorrect.');
      }

      if (currentPassword === newPassword) {
        return sendError(res, 400, 'New password must be different from current password.');
      }

      const newSalt = auth.generateSalt();
      const newHash = auth.hashPassword(newPassword, newSalt);
      db.updateEmployeePassword(authCtx.user.id, newHash, newSalt);

      return sendJson(res, 200, {
        success: true,
        message: 'Password updated successfully. You may now access your dashboard.',
        mustChangePassword: false
      });
    }

    // F. GET /api/employee/me - Authenticated Employee Personal Dashboard Data
    if (pathOnly === '/api/employee/me' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access employee dashboard.');
      }
      if (authCtx.userType !== 'EMPLOYEE') {
        return sendError(res, 403, 'Permission denied: Employee portal only.');
      }

      // Mandatory password change enforcement: reject access until changed
      if (authCtx.mustChangePassword) {
        return sendJson(res, 403, {
          error: 'Password change required before accessing employee dashboard.',
          code: 'PASSWORD_CHANGE_REQUIRED',
          mustChangePassword: true,
          employeeId: authCtx.user.id,
          name: authCtx.user.name
        });
      }

      // Strictly derive employee and company from session
      const emp = db.getEmployeeById(authCtx.user.id);
      if (!emp) {
        return sendError(res, 404, 'Employee record not found.');
      }
      const company = db.getCompanyById(authCtx.companyId);
      const latestEvent = db.getLatestEventForEmployee(emp.id);
      const effectivePerms = getAuthEffectivePermissions(authCtx);
      const directReports = db.getDirectReports(emp.id, authCtx.companyId);
      const reportingChain = db.getReportingChain(emp.id, authCtx.companyId);

      return sendJson(res, 200, {
        success: true,
        employee: {
          id: emp.id,
          name: emp.name,
          companyId: authCtx.companyId,
          companyName: company ? company.name : 'Unknown Company',
          department: emp.department,
          designation: emp.role,
          jobTitle: emp.jobTitleName || emp.role || 'Workforce Member',
          jobTitleName: emp.jobTitleName || null,
          jobTitleId: emp.jobTitleId || null,
          orgUnitName: emp.orgUnitName || null,
          orgUnitId: emp.orgUnitId || null,
          managerId: emp.managerId || null,
          managerName: emp.managerName || null,
          accessRoleId: emp.accessRoleId || null,
          accessRoleName: emp.accessRoleName || null,
          email: emp.email || null,
          phone: emp.phone || null,
          cardUid: emp.uid || null,
          cardStatus: emp.uid ? 'ACTIVE' : 'UNASSIGNED',
          status: emp.status,
          lastSeen: emp.lastSeen || emp.last_seen || 'Not detected today',
          avatarBg: emp.avatarBg || emp.avatar_bg || '#0284C7'
        },
        permissions: effectivePerms,
        directReportsCount: directReports.length,
        hasSubordinates: directReports.length > 0,
        reportingChain: reportingChain || [],
        latestEvent: latestEvent || null,
        csrfToken: authCtx.session.csrf_token
      });
    }

    // G. GET /api/employee/attendance - Authenticated Personal Attendance Records
    if (pathOnly === '/api/employee/attendance' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view attendance history.');
      }
      if (authCtx.userType !== 'EMPLOYEE') {
        return sendError(res, 403, 'Permission denied: Employee portal only.');
      }

      if (authCtx.mustChangePassword) {
        return sendJson(res, 403, {
          error: 'Password change required before accessing employee records.',
          code: 'PASSWORD_CHANGE_REQUIRED',
          mustChangePassword: true
        });
      }

      // Strictly derive empId and companyId from session
      const logs = db.getAttendanceEventsForEmployee(authCtx.user.id, authCtx.companyId);
      return sendJson(res, 200, logs);
    }

    // H. POST /api/employee/tap - Authenticated Self Smart Card Tap
    if (pathOnly === '/api/employee/tap' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to tap card.');
      }
      if (authCtx.userType !== 'EMPLOYEE') {
        return sendError(res, 403, 'Permission denied: Employee portal only.');
      }

      if (authCtx.mustChangePassword) {
        return sendJson(res, 403, {
          error: 'Password change required before tapping card.',
          code: 'PASSWORD_CHANGE_REQUIRED',
          mustChangePassword: true
        });
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { gate, mode } = body;
      const targetGate = (gate && typeof gate === 'string' && gate.trim().length > 0)
        ? gate.trim()
        : 'Gate 01 - Main Facility Turnstile';
      const targetMode = (mode && typeof mode === 'string' && ['AUTO', 'ENTRY', 'EXIT'].includes(mode.trim().toUpperCase()))
        ? mode.trim().toUpperCase()
        : 'AUTO';

      const emp = db.getEmployeeById(authCtx.user.id);
      if (!emp) {
        return sendError(res, 404, 'Employee record not found.');
      }

      try {
        const result = db.recordCardScan({
          empId: emp.id,
          uid: emp.uid || undefined,
          mode: targetMode,
          gate: targetGate
        });
        return sendJson(res, 200, result);
      } catch (scanErr) {
        return sendError(res, 400, scanErr.message);
      }
    }

    // =========================================================
    // 1. ORGANIZATIONAL HIERARCHY ENDPOINTS
    // =========================================================

    // 1A. GET /api/org/tree - Full Organization Tree
    if (pathOnly === '/api/org/tree' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access organizational tree.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:view')) {
        return sendError(res, 403, 'Permission denied: Organization view privileges required.');
      }

      const hierarchy = db.getOrgHierarchy(authCtx.companyId);
      if (!hierarchy) {
        return sendError(res, 404, 'Organization structure not found.');
      }
      return sendJson(res, 200, { success: true, ...hierarchy });
    }

    // 1B. Org Units Specific Match (/api/org/units/:id)
    const orgUnitDetailMatch = pathOnly.match(/^\/api\/org\/units\/([^\/]+)$/);

    if (orgUnitDetailMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetUnitId = decodeURIComponent(orgUnitDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update organizational unit.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingUnit = db.getOrgUnitById(targetUnitId, authCtx.companyId);
      if (!existingUnit) {
        return sendError(res, 404, `Organizational unit '${targetUnitId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { name, unitType, type, parentId, parentUnitId, levelId, managerId } = body;
      try {
        const updated = db.updateOrgUnit({
          id: targetUnitId,
          companyId: authCtx.companyId,
          name,
          unitType: unitType || type,
          parentUnitId: parentUnitId !== undefined ? parentUnitId : parentId,
          levelId,
          managerId
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Organizational unit updated successfully.',
          unit: updated
        });
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    if (orgUnitDetailMatch && method === 'DELETE') {
      const targetUnitId = decodeURIComponent(orgUnitDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to delete organizational unit.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingUnit = db.getOrgUnitById(targetUnitId, authCtx.companyId);
      if (!existingUnit) {
        return sendError(res, 404, `Organizational unit '${targetUnitId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      try {
        const result = db.deleteOrgUnit(targetUnitId, authCtx.companyId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    // 1C. GET / POST /api/org/units (Collection)
    if (pathOnly === '/api/org/units') {
      if (method === 'GET') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to view organizational units.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:view')) {
          return sendError(res, 403, 'Permission denied: Organization view privileges required.');
        }

        let isHierarchy = false;
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          isHierarchy = urlObj.searchParams.get('hierarchy') === 'true' || urlObj.searchParams.get('includeHierarchy') === 'true';
        } catch (_) {}

        const units = isHierarchy ? db.getOrgUnitHierarchy(authCtx.companyId) : db.getOrgUnits(authCtx.companyId);
        return sendJson(res, 200, units);
      }

      if (method === 'POST') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to create organizational unit.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
        }

        const body = await parseJsonBody(req);
        if (!verifyCsrf(req, authCtx, body)) {
          return sendError(res, 403, 'Invalid or missing CSRF token.');
        }

        const { id, name, unitType, type, parentId, parentUnitId, levelId, managerId } = body;
        try {
          const created = db.createOrgUnit({
            id,
            companyId: authCtx.companyId,
            name,
            unitType: unitType || type,
            parentUnitId: parentUnitId !== undefined ? parentUnitId : parentId,
            levelId,
            managerId
          });
          return sendJson(res, 201, {
            success: true,
            message: 'Organizational unit created successfully.',
            unit: created
          });
        } catch (err) {
          return sendError(res, err.statusCode || 400, err.message);
        }
      }
    }

    // 1D. Org Levels Specific Match (/api/org/levels/:id)
    const orgLevelDetailMatch = pathOnly.match(/^\/api\/org\/levels\/([^\/]+)$/);

    if (orgLevelDetailMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetLevelId = decodeURIComponent(orgLevelDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update organizational level.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingLevel = db.getOrgLevelById(targetLevelId, authCtx.companyId);
      if (!existingLevel) {
        return sendError(res, 404, `Organizational level '${targetLevelId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { name, rank, rankOrder, rank_order } = body;
      try {
        const updated = db.updateOrgLevel({
          id: targetLevelId,
          companyId: authCtx.companyId,
          name,
          rank: rank !== undefined ? rank : (rankOrder !== undefined ? rankOrder : rank_order)
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Organizational level updated successfully.',
          level: updated
        });
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    if (orgLevelDetailMatch && method === 'DELETE') {
      const targetLevelId = decodeURIComponent(orgLevelDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to delete organizational level.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingLevel = db.getOrgLevelById(targetLevelId, authCtx.companyId);
      if (!existingLevel) {
        return sendError(res, 404, `Organizational level '${targetLevelId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      try {
        const result = db.deleteOrgLevel(targetLevelId, authCtx.companyId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    // 1E. GET / POST /api/org/levels (Collection)
    if (pathOnly === '/api/org/levels') {
      if (method === 'GET') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to view organizational levels.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:view')) {
          return sendError(res, 403, 'Permission denied: Organization view privileges required.');
        }

        const levels = db.getOrgLevels(authCtx.companyId);
        return sendJson(res, 200, levels);
      }

      if (method === 'POST') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to create organizational level.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
        }

        const body = await parseJsonBody(req);
        if (!verifyCsrf(req, authCtx, body)) {
          return sendError(res, 403, 'Invalid or missing CSRF token.');
        }

        const { id, name, rank, rankOrder, rank_order } = body;
        try {
          const created = db.createOrgLevel({
            id,
            companyId: authCtx.companyId,
            name,
            rank: rank !== undefined ? rank : (rankOrder !== undefined ? rankOrder : rank_order)
          });
          return sendJson(res, 201, {
            success: true,
            message: 'Organizational level created successfully.',
            level: created
          });
        } catch (err) {
          return sendError(res, err.statusCode || 400, err.message);
        }
      }
    }

    // =========================================================
    // 2. JOB TITLES & ACCESS ROLES ENDPOINTS
    // =========================================================

    // 2A. Org Job Titles Specific Match (/api/org/job-titles/:id)
    const orgJobTitleDetailMatch = pathOnly.match(/^\/api\/org\/job-titles\/([^\/]+)$/);

    if (orgJobTitleDetailMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetJobId = decodeURIComponent(orgJobTitleDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update job title.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingJob = db.getJobTitleById(targetJobId, authCtx.companyId);
      if (!existingJob) {
        return sendError(res, 404, `Job title '${targetJobId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { title, description, isActive } = body;
      try {
        const updated = db.updateJobTitle({
          id: targetJobId,
          companyId: authCtx.companyId,
          title,
          description,
          isActive
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Job title updated successfully.',
          jobTitle: updated
        });
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    if (orgJobTitleDetailMatch && method === 'DELETE') {
      const targetJobId = decodeURIComponent(orgJobTitleDetailMatch[1]);

      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to delete job title.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
      }

      const existingJob = db.getJobTitleById(targetJobId, authCtx.companyId);
      if (!existingJob) {
        return sendError(res, 404, `Job title '${targetJobId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      try {
        const result = db.deleteJobTitle(targetJobId, authCtx.companyId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    // 2B. GET / POST /api/org/job-titles (Collection)
    if (pathOnly === '/api/org/job-titles') {
      if (method === 'GET') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to view job titles.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:view') && !hasPermission(authCtx, 'roles:manage')) {
          return sendError(res, 403, 'Permission denied: Organization or role view privileges required.');
        }

        let includeInactive = false;
        let unitId = null;
        try {
          const urlObj = new URL(req.url, 'http://localhost');
          includeInactive = urlObj.searchParams.get('includeInactive') === 'true';
          unitId = urlObj.searchParams.get('unitId') || urlObj.searchParams.get('orgUnitId') || urlObj.searchParams.get('departmentId');
        } catch (_) {}

        if (unitId) {
          const targetUnit = db.getOrgUnitById(unitId, authCtx.companyId);
          if (!targetUnit) {
            return sendError(res, 404, `Organizational unit '${unitId}' not found in your organization.`);
          }
          const jobTitles = db.getJobTitlesByUnit(unitId, authCtx.companyId, includeInactive);
          return sendJson(res, 200, jobTitles);
        }

        const jobTitles = db.getJobTitles(authCtx.companyId, includeInactive);
        return sendJson(res, 200, jobTitles);
      }

      if (method === 'POST') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to create job title.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'org:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Company-wide organization management privileges required.');
        }

        const body = await parseJsonBody(req);
        if (!verifyCsrf(req, authCtx, body)) {
          return sendError(res, 403, 'Invalid or missing CSRF token.');
        }

        const { id, title, description, isActive } = body;
        try {
          const created = db.createJobTitle({
            id,
            companyId: authCtx.companyId,
            title,
            description,
            isActive
          });
          return sendJson(res, 201, {
            success: true,
            message: 'Job title created successfully.',
            jobTitle: created
          });
        } catch (err) {
          return sendError(res, err.statusCode || 400, err.message);
        }
      }
    }

    // 2C. Role Permissions Specific Match (/api/roles/:id/permissions)
    const rolePermsMatch = pathOnly.match(/^\/api\/roles\/([^\/]+)\/permissions$/);

    if (rolePermsMatch && method === 'GET') {
      const targetRoleId = decodeURIComponent(rolePermsMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view role permissions.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'roles:manage')) {
        return sendError(res, 403, 'Permission denied: Role management privileges required.');
      }

      const existingRole = db.getAccessRoleById(targetRoleId, authCtx.companyId);
      if (!existingRole) {
        return sendError(res, 404, `Access role '${targetRoleId}' not found in your organization.`);
      }

      const permissions = db.getRolePermissions(targetRoleId, authCtx.companyId);
      return sendJson(res, 200, permissions);
    }

    if (rolePermsMatch && (method === 'PUT' || method === 'POST')) {
      const targetRoleId = decodeURIComponent(rolePermsMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to modify role permissions.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide role management privileges required.');
      }

      const existingRole = db.getAccessRoleById(targetRoleId, authCtx.companyId);
      if (!existingRole) {
        return sendError(res, 404, `Access role '${targetRoleId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      if (!Array.isArray(body.permissions)) {
        return sendError(res, 400, 'Permissions must be an array of { key, scope } objects.');
      }

      try {
        const updatedPerms = db.setRolePermissions(targetRoleId, authCtx.companyId, body.permissions);
        return sendJson(res, 200, {
          success: true,
          message: 'Role permissions updated successfully.',
          permissions: updatedPerms
        });
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    // 2D. Access Role Detail Match (/api/roles/:id)
    const roleDetailMatch = pathOnly.match(/^\/api\/roles\/([^\/]+)$/);

    if (roleDetailMatch && method === 'GET') {
      const targetRoleId = decodeURIComponent(roleDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view role.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'roles:manage') && !hasPermission(authCtx, 'employees:manage')) {
        return sendError(res, 403, 'Permission denied: Role or workforce management privileges required.');
      }

      const role = db.getAccessRoleById(targetRoleId, authCtx.companyId);
      if (!role) {
        return sendError(res, 404, `Access role '${targetRoleId}' not found in your organization.`);
      }
      return sendJson(res, 200, role);
    }

    if (roleDetailMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetRoleId = decodeURIComponent(roleDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update access role.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide role management privileges required.');
      }

      const existingRole = db.getAccessRoleById(targetRoleId, authCtx.companyId);
      if (!existingRole) {
        return sendError(res, 404, `Access role '${targetRoleId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { name, description, permissions } = body;
      try {
        const updated = db.updateAccessRole({
          id: targetRoleId,
          companyId: authCtx.companyId,
          name,
          description,
          permissions
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Access role updated successfully.',
          role: updated
        });
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    if (roleDetailMatch && method === 'DELETE') {
      const targetRoleId = decodeURIComponent(roleDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to delete access role.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Company-wide role management privileges required.');
      }

      const existingRole = db.getAccessRoleById(targetRoleId, authCtx.companyId);
      if (!existingRole) {
        return sendError(res, 404, `Access role '${targetRoleId}' not found in your organization.`);
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      try {
        const result = db.deleteAccessRole(targetRoleId, authCtx.companyId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendError(res, err.statusCode || 400, err.message);
      }
    }

    // 2E. GET / POST /api/roles (Collection)
    if (pathOnly === '/api/roles') {
      if (method === 'GET') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to view access roles.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'roles:manage') && !hasPermission(authCtx, 'employees:manage')) {
          return sendError(res, 403, 'Permission denied: Role or workforce management privileges required.');
        }

        const roles = db.getAccessRoles(authCtx.companyId);
        return sendJson(res, 200, roles);
      }

      if (method === 'POST') {
        const authCtx = resolveSession(req);
        if (!authCtx) {
          return sendError(res, 401, 'Authentication required to create access role.');
        }
        if (checkPasswordChangeRequired(authCtx, res)) return;
        if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Company-wide role management privileges required.');
        }

        const body = await parseJsonBody(req);
        if (!verifyCsrf(req, authCtx, body)) {
          return sendError(res, 403, 'Invalid or missing CSRF token.');
        }

        const { id, name, description, permissions } = body;
        try {
          const created = db.createAccessRole({
            id,
            companyId: authCtx.companyId,
            name,
            description,
            permissions
          });
          return sendJson(res, 201, {
            success: true,
            message: 'Access role created successfully.',
            role: created
          });
        } catch (err) {
          return sendError(res, err.statusCode || 400, err.message);
        }
      }
    }

    // =========================================================
    // 3. TEAM HIERARCHY & ROSTER ENDPOINTS
    // =========================================================

    // 3A. GET /api/team/roster - Team Workforce Members (Scoped to Permission)
    if (pathOnly === '/api/team/roster' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view team roster.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'employees:view')) {
        return sendError(res, 403, 'Permission denied: Employee view privileges required.');
      }

      const permittedIds = getPermittedEmployeeIds(authCtx, 'employees:view');
      let teamMembers = db.getAllEmployees(authCtx.companyId, false);
      if (permittedIds !== null) {
        teamMembers = teamMembers.filter(e => permittedIds.includes(e.id));
      }
      const enrichedMembers = teamMembers.map(m => {
        const latest = db.getLatestEventForEmployee(m.id);
        return {
          ...m,
          lastGate: latest ? latest.gate : null,
          lastEventType: latest ? latest.eventType : null,
          lastEventTime: latest ? latest.timestamp : null,
          isDirectReport: Boolean(authCtx.user && m.managerId === authCtx.user.id)
        };
      });
      return sendJson(res, 200, enrichedMembers);
    }

    // 3B. GET /api/team/attendance - Team Attendance Events (Scoped to Permission)
    if (pathOnly === '/api/team/attendance' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view team attendance.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'attendance:view')) {
        return sendError(res, 403, 'Permission denied: Attendance view privileges required.');
      }

      const permittedIds = getPermittedEmployeeIds(authCtx, 'attendance:view');
      const allEvents = db.getAllAttendanceEvents(authCtx.companyId);
      const filteredEvents = (permittedIds === null)
        ? allEvents
        : allEvents.filter(e => permittedIds.includes(e.empId || e.emp_id));

      return sendJson(res, 200, filteredEvents);
    }

    // 3C. GET /api/team/analytics - Team Attendance & Analytics Metrics
    if (pathOnly === '/api/team/analytics' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view team analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }

      const permittedIds = getPermittedEmployeeIds(authCtx, 'analytics:view');
      const allEmps = db.getAllEmployees(authCtx.companyId, false);
      const teamEmps = (permittedIds === null) ? allEmps : allEmps.filter(e => permittedIds.includes(e.id));

      const allEvents = db.getAllAttendanceEvents(authCtx.companyId);
      const teamEvents = (permittedIds === null)
        ? allEvents
        : allEvents.filter(e => permittedIds.includes(e.empId || e.emp_id));

      const insideCount = teamEmps.filter(e => e.status === 'INSIDE').length;
      const outsideCount = teamEmps.filter(e => e.status === 'OUTSIDE').length;
      const totalMembers = teamEmps.length;
      const occupancyRatePercent = totalMembers ? Math.round((insideCount / totalMembers) * 100) : 0;

      const deptCounts = {};
      for (const e of teamEmps) {
        const d = e.department || 'Unassigned';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
      }

      return sendJson(res, 200, {
        success: true,
        teamSummary: {
          totalMembers,
          insideCount,
          outsideCount,
          occupancyRatePercent
        },
        departmentBreakdown: deptCounts,
        members: teamEmps,
        recentEvents: teamEvents.slice(0, 25)
      });
    }

    // =========================================================
    // WORKFORCE OPERATIONAL ENDPOINTS (PROTECTED & SCOPED)
    // =========================================================

    // 1. GET /api/employees - List employees (Scoped to authenticated company and permissions)
    if (pathOnly === '/api/employees' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access workforce roster.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const canView = (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') ||
                      hasPermission(authCtx, 'employees:view');
      if (!canView) {
        return sendError(res, 403, 'Permission denied: Insufficient privileges to view employees.');
      }

      let includeArchived = false;
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        if (urlObj.searchParams.has('includeArchived')) {
          includeArchived = urlObj.searchParams.get('includeArchived') === 'true';
        }
      } catch (_) {}

      const permittedIds = getPermittedEmployeeIds(authCtx, 'employees:view');
      let employees = db.getAllEmployees(authCtx.companyId, includeArchived);
      if (permittedIds !== null) {
        employees = employees.filter(e => permittedIds.includes(e.id));
      }
      return sendJson(res, 200, employees);
    }

    // 2. POST /api/employees - Register new employee and create employee account (Phase 3)
    if (pathOnly === '/api/employees' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to register new workforce members.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const canManage = (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') ||
                        hasPermission(authCtx, 'employees:manage', 'COMPANY');
      if (!canManage) {
        return sendError(res, 403, 'Permission denied: Company-wide workforce management privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { id, name, department, role, uid, avatarBg, email, phone, managerId, orgUnitId, jobTitleId, accessRoleId } = body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return sendError(res, 400, 'Employee full name must be at least 2 characters long.');
      }
      if (!department || typeof department !== 'string' || !department.trim()) {
        return sendError(res, 400, 'Department is required.');
      }
      if (!role || typeof role !== 'string' || role.trim().length < 2) {
        return sendError(res, 400, 'Job designation/role must be at least 2 characters long.');
      }

      // If accessRoleId is supplied and differs, verify caller has roles:manage (COMPANY)
      if (accessRoleId && !hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
        return sendError(res, 403, 'Permission denied: Assigning access roles requires role management privileges.');
      }

      // Contact details validation (Employee Email and Phone Number)
      let normEmail = null;
      if (email !== undefined && email !== null && (typeof email !== 'string' || email.trim().length > 0)) {
        if (typeof email !== 'string') {
          return sendError(res, 400, 'Employee email must be a valid string.');
        }
        const trimmedEmail = email.trim();
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!EMAIL_REGEX.test(trimmedEmail)) {
          return sendError(res, 400, 'Invalid email format. Please provide a valid email address (e.g. employee@company.com).');
        }
        normEmail = trimmedEmail.toLowerCase();
      }

      let normPhone = null;
      if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.trim().length > 0)) {
        if (typeof phone !== 'string') {
          return sendError(res, 400, 'Phone number must be a valid string.');
        }
        const trimmedPhone = phone.trim();
        const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
        const digits = trimmedPhone.replace(/\D/g, '');
        if (!PHONE_REGEX.test(trimmedPhone) || digits.length < 7 || digits.length > 15) {
          return sendError(res, 400, 'Invalid phone number format. Please provide a valid phone number with 7 to 15 digits.');
        }
        normPhone = trimmedPhone;
      }

      // Generate or validate employee ID
      let targetId = (typeof id === 'string' && id.trim()) ? id.trim() : null;
      if (!targetId) {
        targetId = db.generateUniqueEmployeeId();
      } else if (db.getEmployeeById(targetId)) {
        return sendError(res, 409, `Employee with ID ${targetId} already exists.`);
      }

      // Optional RFID card UID validation & normalization
      let targetUid = null;
      if (uid && typeof uid === 'string' && uid.trim().length > 0) {
        targetUid = uid.trim().toUpperCase();
        if (targetUid.length < 4 || targetUid.length > 64) {
          return sendError(res, 400, 'Invalid UID format: Smart Card UID must be between 4 and 64 characters.');
        }
        if (db.getEmployeeByUid(targetUid)) {
          return sendError(res, 409, `Smart Card UID ${targetUid} is already assigned to another employee.`);
        }
      }

      // Derive company_id strictly from authenticated session
      const targetCompanyId = authCtx.companyId;

      // Duplicate email check scoped to authenticated company
      if (normEmail) {
        const existingWithEmail = db.getEmployeeByEmail(normEmail, targetCompanyId);
        if (existingWithEmail) {
          return sendError(res, 409, `An employee with email '${normEmail}' already exists in this organization.`);
        }
      }

      // Generate temporary password following the SmartWorkforce rule:
      // First 4 alphabetic letters of employee name + last 4 digits of phone number
      let temporaryPassword;
      if (normPhone) {
        try {
          temporaryPassword = auth.generateEmployeeTemporaryPassword(name.trim(), normPhone);
        } catch (pwErr) {
          return sendError(res, pwErr.statusCode || 400, pwErr.message);
        }
      } else {
        // Fallback for legacy calls omitting phone
        temporaryPassword = auth.generateTemporaryPassword(14);
      }

      let creationResult;
      try {
        creationResult = db.createEmployeeWithAccount({
          id: targetId,
          name: name.trim(),
          department: department.trim(),
          role: role.trim(),
          uid: targetUid,
          avatarBg,
          companyId: targetCompanyId,
          password: temporaryPassword,
          email: normEmail,
          phone: normPhone,
          managerId,
          orgUnitId,
          jobTitleId,
          accessRoleId
        });
      } catch (creationErr) {
        const status = creationErr.statusCode || 400;
        return sendError(res, status, creationErr.message);
      }

      const created = creationResult.employee;
      return sendJson(res, 201, {
        ...created,
        temporaryPassword: temporaryPassword,
        mustChangePassword: true,
        credentials: {
          employeeId: created.id,
          temporaryPassword: temporaryPassword,
          mustChangePassword: true,
          email: created.email,
          phone: created.phone
        }
      });
    }

    // =========================================================
    // 2B. SPECIFIC EMPLOYEE SUB-RESOURCE ACTIONS (Evaluated before generic /:id)
    // =========================================================

    // 2B-0a. PUT /api/employees/:id/reporting - Reassign Manager, Unit, Role
    const empReportingMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)\/reporting$/);
    if (empReportingMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetEmpId = decodeURIComponent(empReportingMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to modify employee reporting structure.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      if (!canAccessEmployee(authCtx, emp, 'employees:manage')) {
        return sendError(res, 403, 'Permission denied: Insufficient scope to manage this employee.');
      }

      // Prevent employees from self-reassigning manager or access role
      if (authCtx.userType === 'EMPLOYEE' && targetEmpId === authCtx.user.id) {
        return sendError(res, 403, 'Permission denied: Employees cannot modify their own reporting structure or access role.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { managerId, orgUnitId, jobTitleId, accessRoleId } = body;

      // Privilege Escalation Protection: changing accessRoleId requires roles:manage (COMPANY)
      if (accessRoleId !== undefined && accessRoleId !== emp.accessRoleId) {
        if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Modifying employee access roles requires role management privileges.');
        }
      }

      try {
        const updated = db.assignEmployeeOrgAndReporting({
          employeeId: targetEmpId,
          companyId: authCtx.companyId,
          managerId,
          orgUnitId,
          jobTitleId,
          accessRoleId
        });
        return sendJson(res, 200, {
          success: true,
          message: 'Reporting and organizational assignment updated successfully.',
          employee: updated
        });
      } catch (assignErr) {
        return sendError(res, assignErr.statusCode || 400, assignErr.message);
      }
    }

    if (empReportingMatch && method === 'GET') {
      const targetEmpId = decodeURIComponent(empReportingMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view reporting chain.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      if (!canAccessEmployee(authCtx, emp, 'employees:view')) {
        return sendError(res, 403, 'Permission denied: Insufficient scope to view this employee.');
      }

      const chain = db.getReportingChain(targetEmpId, authCtx.companyId);
      return sendJson(res, 200, chain);
    }

    // 2B-0b. GET /api/employees/:id/subordinates - Retrieve Direct or Recursive Subordinates
    const empSubordinatesMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)\/subordinates$/);
    if (empSubordinatesMatch && method === 'GET') {
      const targetEmpId = decodeURIComponent(empSubordinatesMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view subordinates.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      if (!canAccessEmployee(authCtx, emp, 'employees:view')) {
        return sendError(res, 403, 'Permission denied: Insufficient scope to view this employee.');
      }

      let mode = 'direct';
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        mode = (urlObj.searchParams.get('mode') || 'direct').toLowerCase();
      } catch (_) {}

      const subs = (mode === 'recursive' || mode === 'all')
        ? db.getRecursiveSubordinates(targetEmpId, authCtx.companyId)
        : db.getDirectReports(targetEmpId, authCtx.companyId);

      return sendJson(res, 200, subs);
    }

    // 2B-1. POST /api/employees/:id/reset-temporary-password - Admin Reset Temporary Password
    const empResetPwdMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)\/(?:reset-temporary-password|reset-password)$/);
    if (empResetPwdMatch && method === 'POST') {
      const targetEmpId = decodeURIComponent(empResetPwdMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to reset employee credentials.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      // Look up employee and enforce company isolation strictly from session
      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      // Reject archived employees
      if (emp.is_archived || emp.isArchived) {
        return sendError(res, 400, 'Cannot reset password for an archived employee. Please restore the employee first.');
      }

      // Reject invalid account states if account exists
      const existingAccount = db.getEmployeeAccountByEmpId(targetEmpId);
      if (existingAccount && existingAccount.account_status !== 'ACTIVE') {
        return sendError(res, 400, `Cannot reset password for an inactive employee account. Current status: ${existingAccount.account_status}. Please reactivate the employee first.`);
      }

      // Generate temporary password using the SmartWorkforce rule:
      // First 4 alphabetic letters of name + last 4 numeric digits of phone
      let temporaryPassword;
      try {
        temporaryPassword = auth.generateEmployeeTemporaryPassword(emp.name, emp.phone);
      } catch (pwErr) {
        return sendError(res, 400, `Cannot generate temporary password: ${pwErr.message}`);
      }

      // Generate fresh salt and scrypt hash
      const salt = auth.generateSalt();
      const hash = auth.hashPassword(temporaryPassword, salt);

      // Store in database, set must_change_password = 1, and invalidate existing sessions
      db.resetEmployeeTemporaryPassword({
        employeeId: targetEmpId,
        companyId: authCtx.companyId,
        passwordHash: hash,
        passwordSalt: salt
      });

      // Send single presentation of temporary password to administrator
      return sendJson(res, 200, {
        success: true,
        message: 'Temporary password reset successfully.',
        employeeId: emp.id,
        employeeName: emp.name,
        temporaryPassword: temporaryPassword,
        mustChangePassword: true
      });
    }

    // 2B-2. POST / PUT / PATCH /api/employees/:id/status - Deactivate or Reactivate Account
    const empStatusMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)\/status$/);
    if (empStatusMatch && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const targetEmpId = decodeURIComponent(empStatusMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to modify account status.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      const targetStatus = (body.status || body.accountStatus || '').trim().toUpperCase();
      if (!['ACTIVE', 'SUSPENDED'].includes(targetStatus)) {
        return sendError(res, 400, "Invalid status. Allowed values: 'ACTIVE', 'SUSPENDED'.");
      }

      let result;
      if (targetStatus === 'SUSPENDED') {
        result = db.deactivateEmployee(targetEmpId, authCtx.companyId);
      } else {
        result = db.reactivateEmployee(targetEmpId, authCtx.companyId);
      }

      return sendJson(res, 200, result);
    }

    // 2B-3. POST /api/employees/:id/restore - Restore Archived Employee Record
    const empRestoreMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)\/restore$/);
    if (empRestoreMatch && method === 'POST') {
      const targetEmpId = decodeURIComponent(empRestoreMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to restore employee.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      const restoreResult = db.restoreArchivedEmployee(targetEmpId, authCtx.companyId);
      return sendJson(res, 200, restoreResult);
    }

    // =========================================================
    // 2C. GENERIC EMPLOYEE CRUD BY ID (/api/employees/:id)
    // =========================================================
    const empDetailMatch = pathOnly.match(/^\/api\/employees\/([^\/]+)$/);

    // 2C-1. GET /api/employees/:id - Retrieve Detailed Employee Profile
    if (empDetailMatch && method === 'GET') {
      const targetEmpId = decodeURIComponent(empDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view employee details.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      if (!canAccessEmployee(authCtx, emp, 'employees:view')) {
        return sendError(res, 403, 'Permission denied: Insufficient scope to view this employee.');
      }

      const recentEvents = db.getAttendanceEventsForEmployee(emp.id, authCtx.companyId);
      const latestEvent = db.getLatestEventForEmployee(emp.id);
      const reportingChain = db.getReportingChain(emp.id, authCtx.companyId);

      return sendJson(res, 200, {
        ...emp,
        latestEvent: latestEvent || null,
        totalAttendanceRecords: recentEvents.length,
        recentAttendance: recentEvents.slice(0, 10),
        reportingChain: reportingChain || []
      });
    }

    // 2C-2. PUT / PATCH /api/employees/:id - Update Employee Record
    if (empDetailMatch && (method === 'PUT' || method === 'PATCH')) {
      const targetEmpId = decodeURIComponent(empDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update employee record.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      if (!canAccessEmployee(authCtx, emp, 'employees:manage')) {
        return sendError(res, 403, 'Permission denied: Insufficient scope to update this employee.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { name, department, role, uid, email, phone, managerId, orgUnitId, jobTitleId, accessRoleId } = body;

      // Prevent employees from self-reassigning manager or access role
      if (authCtx.userType === 'EMPLOYEE' && targetEmpId === authCtx.user.id && (managerId !== undefined || accessRoleId !== undefined)) {
        return sendError(res, 403, 'Permission denied: Employees cannot modify their own reporting structure or access role.');
      }

      // Check role assignment permission if accessRoleId changed
      if (accessRoleId !== undefined && accessRoleId !== emp.accessRoleId) {
        if (!hasPermission(authCtx, 'roles:manage', 'COMPANY')) {
          return sendError(res, 403, 'Permission denied: Modifying employee access roles requires role management privileges.');
        }
      }

      if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
        return sendError(res, 400, 'Employee full name must be at least 2 characters long.');
      }
      if (department !== undefined && (typeof department !== 'string' || !department.trim())) {
        return sendError(res, 400, 'Department is required.');
      }
      if (role !== undefined && (typeof role !== 'string' || role.trim().length < 2)) {
        return sendError(res, 400, 'Job designation / role must be at least 2 characters long.');
      }

      let normEmail = emp.email;
      if (email !== undefined) {
        if (email !== null && typeof email === 'string' && email.trim().length > 0) {
          const trimmedEmail = email.trim();
          const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!EMAIL_REGEX.test(trimmedEmail)) {
            return sendError(res, 400, 'Invalid email format. Please provide a valid email address (e.g. employee@company.com).');
          }
          normEmail = trimmedEmail.toLowerCase();
          const existingWithEmail = db.getEmployeeByEmail(normEmail, authCtx.companyId);
          if (existingWithEmail && existingWithEmail.id !== targetEmpId) {
            return sendError(res, 409, `An employee with email '${normEmail}' already exists in this organization.`);
          }
        } else {
          normEmail = null;
        }
      }

      let normPhone = emp.phone;
      if (phone !== undefined) {
        if (phone !== null && typeof phone === 'string' && phone.trim().length > 0) {
          const trimmedPhone = phone.trim();
          const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
          const digits = trimmedPhone.replace(/\D/g, '');
          if (!PHONE_REGEX.test(trimmedPhone) || digits.length < 7 || digits.length > 15) {
            return sendError(res, 400, 'Invalid phone number format. Please provide a valid phone number with 7 to 15 digits.');
          }
          normPhone = trimmedPhone;
        } else {
          normPhone = null;
        }
      }

      let normUid = emp.uid;
      if (uid !== undefined) {
        if (uid !== null && typeof uid === 'string' && uid.trim().length > 0) {
          normUid = uid.trim().toUpperCase();
          if (normUid.length < 4 || normUid.length > 64) {
            return sendError(res, 400, 'Invalid UID format: Smart Card UID must be between 4 and 64 characters.');
          }
          const existingWithUid = db.getEmployeeByUid(normUid);
          if (existingWithUid && existingWithUid.id !== targetEmpId) {
            return sendError(res, 409, `Smart Card UID ${normUid} is already assigned to another employee.`);
          }
        } else {
          normUid = null;
        }
      }

      try {
        const updated = db.updateEmployee({
          id: targetEmpId,
          name: name !== undefined ? name.trim() : emp.name,
          department: department !== undefined ? department.trim() : emp.department,
          role: role !== undefined ? role.trim() : emp.role,
          uid: normUid,
          email: normEmail,
          phone: normPhone,
          companyId: authCtx.companyId,
          managerId,
          orgUnitId,
          jobTitleId,
          accessRoleId
        });

        return sendJson(res, 200, {
          success: true,
          message: 'Employee record updated successfully.',
          employee: updated
        });
      } catch (updateErr) {
        return sendError(res, updateErr.statusCode || 400, updateErr.message);
      }
    }

    // 2C-3. DELETE /api/employees/:id - Safe Archive & Soft Delete Employee Record
    if (empDetailMatch && method === 'DELETE') {
      const targetEmpId = decodeURIComponent(empDetailMatch[1]);
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to delete employee.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const canDelete = (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') ||
                        hasPermission(authCtx, 'employees:manage', 'COMPANY');
      if (!canDelete) {
        return sendError(res, 403, 'Permission denied: Company-wide workforce management privileges required.');
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const emp = db.getEmployeeById(targetEmpId);
      if (!emp || (emp.companyId && emp.companyId !== authCtx.companyId)) {
        return sendError(res, 404, `Employee with ID '${targetEmpId}' not found in your organization.`);
      }

      // Safe reversible archiving:
      // Note: `attendance_events` table enforces `FOREIGN KEY (emp_id) REFERENCES employees(id) ON DELETE CASCADE`.
      // A raw SQL `DELETE FROM employees` would permanently obliterate all attendance events for this employee.
      // Safe soft-delete / archiving preserves audit records and attendance history intact.
      const archiveResult = db.deleteOrArchiveEmployee(targetEmpId, authCtx.companyId);
      return sendJson(res, 200, archiveResult);

    }

    // 3. GET /api/attendance/logs - Retrieve attendance event logs (Scoped to company and permissions)
    if (pathOnly === '/api/attendance/logs' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access attendance logs.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const canView = (authCtx.userType === 'COMPANY_HEAD' || authCtx.userType === 'COMPANY_ADMIN') ||
                      hasPermission(authCtx, 'attendance:view');
      if (!canView) {
        return sendError(res, 403, 'Permission denied: Attendance view privileges required.');
      }

      const permittedIds = getPermittedEmployeeIds(authCtx, 'attendance:view');
      let logs = db.getAllAttendanceEvents(authCtx.companyId);
      if (permittedIds !== null) {
        logs = logs.filter(evt => permittedIds.includes(evt.empId || evt.emp_id));
      }
      return sendJson(res, 200, logs);
    }

    // 4. POST /api/attendance/scan - Contactless Smart Card Tap (Hardware & Virtual Terminal)
    if (pathOnly === '/api/attendance/scan' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { empId, uid, mode, gate, deviceId, simulatedDistance, simulatedRssi } = body;

      // Optional Gateway Authentication for external hardware devices
      const configuredGatewayKey = process.env.GATEWAY_API_KEY;
      if (configuredGatewayKey) {
        const incomingKey = req.headers['x-gateway-key'] ||
          (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) ||
          body.gatewayKey;
        const incomingDeviceId = req.headers['x-device-id'] || deviceId;

        const isVirtualSimulator = incomingDeviceId && incomingDeviceId.startsWith('VIRTUAL-');
        if (incomingKey || (incomingDeviceId && !isVirtualSimulator)) {
          if (incomingKey !== configuredGatewayKey) {
            simulationSessionStats.recordAttempt('ERROR', { reason: 'UNAUTHORIZED' });
            return sendError(res, 401, 'Unauthorized: Invalid or missing gateway API key.');
          }
        }
      }

      // Input Validation
      if (!empId && !uid) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'MISSING_IDENTIFIER' });
        return sendError(res, 400, 'Either "uid" (Smart Card UID) or "empId" is required to record a scan.');
      }

      if (uid && (typeof uid !== 'string' || uid.trim().length < 4 || uid.trim().length > 64)) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'INVALID_UID' });
        return sendError(res, 400, 'Invalid UID format: Smart Card UID must be a string between 4 and 64 characters.');
      }

      if (empId && (typeof empId !== 'string' || empId.trim().length === 0 || empId.trim().length > 64)) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'INVALID_EMPID' });
        return sendError(res, 400, 'Invalid empId format: Employee ID must be a non-empty string under 64 characters.');
      }

      if (mode && !['AUTO', 'ENTRY', 'EXIT'].includes(mode.toUpperCase())) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'INVALID_MODE' });
        return sendError(res, 400, `Invalid scan mode '${mode}'. Allowed modes: AUTO, ENTRY, EXIT.`);
      }

      if (gate && (typeof gate !== 'string' || gate.trim().length > 120)) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'INVALID_GATE' });
        return sendError(res, 400, 'Invalid gate: Gate location must be a string under 120 characters.');
      }

      if (deviceId && (typeof deviceId !== 'string' || deviceId.trim().length > 64)) {
        simulationSessionStats.recordAttempt('ERROR', { reason: 'INVALID_DEVICE' });
        return sendError(res, 400, 'Invalid deviceId: Device identifier must be a string under 64 characters.');
      }

      try {
        const result = db.recordCardScan({
          empId,
          uid,
          mode: mode ? mode.toUpperCase() : 'AUTO',
          gate: gate ? gate.trim() : 'Gate 01 - Main Facility Turnstile',
          deviceId: deviceId ? deviceId.trim() : null
        });

        if (deviceId) {
          result.deviceId = deviceId;
        }
        if (simulatedDistance !== undefined) {
          result.simulatedDistance = simulatedDistance;
        }
        if (simulatedRssi !== undefined) {
          result.simulatedRssi = simulatedRssi;
        }

        if (result.ignored) {
          simulationSessionStats.recordAttempt('DEBOUNCED', { reason: result.reason });
        } else {
          simulationSessionStats.recordAttempt('ACCEPTED', {
            eventType: result.event ? result.event.eventType : 'ENTRY'
          });
        }

        return sendJson(res, 200, result);
      } catch (scanErr) {
        if (scanErr.code === 'UNKNOWN_UID') {
          simulationSessionStats.recordAttempt('UNKNOWN_UID', { uid: scanErr.uid });
          return sendJson(res, 404, {
            error: scanErr.message,
            code: 'UNKNOWN_UID',
            uid: scanErr.uid
          });
        }
        if (scanErr.code === 'EMPLOYEE_NOT_FOUND') {
          simulationSessionStats.recordAttempt('ERROR', { code: scanErr.code, empId: scanErr.empId });
          return sendJson(res, 404, {
            error: scanErr.message,
            code: 'EMPLOYEE_NOT_FOUND',
            empId: scanErr.empId
          });
        }
        if (scanErr.code === 'NOT_IN_FACILITY') {
          simulationSessionStats.recordAttempt('ERROR', { code: scanErr.code });
          return sendJson(res, 403, {
            error: scanErr.message,
            code: 'NOT_IN_FACILITY',
            requiredAction: 'FACILITY_ENTRY'
          });
        }
        if (scanErr.code === 'INVALID_MODE' || scanErr.code === 'MISSING_IDENTIFIER') {
          simulationSessionStats.recordAttempt('ERROR', { code: scanErr.code });
          return sendError(res, 400, scanErr.message);
        }
        simulationSessionStats.recordAttempt('ERROR', { message: scanErr.message });
        throw scanErr;
      }
    }

    // 5. DELETE /api/attendance/logs - Clear attendance log history (Protected)
    if (pathOnly === '/api/attendance/logs' && method === 'DELETE') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to clear attendance logs.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }
      const body = await parseJsonBody(req).catch(() => ({}));
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }
      const result = db.clearAttendanceEvents(authCtx.companyId);
      return sendJson(res, 200, result);
    }

    // =====================================================================
    // Room Occupancy & Zone Monitoring Endpoints
    // =====================================================================

    // 6. GET /api/rooms/occupancy/summary - Real-Time Room Occupancy Summary
    if (pathOnly === '/api/rooms/occupancy/summary' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view room occupancy.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const summary = db.getRoomOccupancySummary(authCtx.companyId);
      return sendJson(res, 200, summary);
    }

    // 7. GET /api/rooms - List all rooms
    if (pathOnly === '/api/rooms' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view rooms.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const rooms = db.getAllRooms(authCtx.companyId);

      // Enhance with current occupancy
      const enhancedRooms = rooms.map(room => {
        const capacityInfo = db.evaluateRoomCapacity(room.id);
        const occupants = db.getCurrentRoomOccupants(room.id);
        return {
          ...room,
          ...capacityInfo,
          occupants: occupants.map(occ => ({
            empId: occ.emp_id,
            name: occ.name,
            entryTime: occ.entry_time
          }))
        };
      });

      return sendJson(res, 200, enhancedRooms);
    }

    // 8. GET /api/rooms/:id/occupancy - Get specific room occupancy details
    if (pathOnly.match(/^\/api\/rooms\/[^/]+\/occupancy$/) && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view room occupancy.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const roomId = pathOnly.split('/')[3];
      const occupancy = db.getRoomOccupancy(roomId);

      if (!occupancy) {
        return sendError(res, 404, `Room '${roomId}' not found.`);
      }

      return sendJson(res, 200, occupancy);
    }

    // 9. POST /api/rooms - Create new room (Admin only)
    if (pathOnly === '/api/rooms' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to create rooms.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { name, roomType, floorNumber, building, capacityNormal, capacityWarning, capacityCritical } = body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return sendError(res, 400, 'Room name is required.');
      }

      const roomData = {
        companyId: authCtx.companyId,
        name: name.trim(),
        roomType: roomType || 'GENERAL',
        floorNumber: floorNumber || null,
        building: building || null,
        capacityNormal: capacityNormal || 50,
        capacityWarning: capacityWarning || 75,
        capacityCritical: capacityCritical || 100
      };

      const newRoom = db.createRoom(roomData);
      return sendJson(res, 201, newRoom);
    }

    // 10. PUT /api/rooms/:id - Update room configuration (Admin only)
    if (pathOnly.match(/^\/api\/rooms\/[^/]+$/) && method === 'PUT') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to update rooms.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const roomId = pathOnly.split('/')[3];
      const room = db.getRoomById(roomId);

      if (!room) {
        return sendError(res, 404, `Room '${roomId}' not found.`);
      }

      if (room.company_id !== authCtx.companyId) {
        return sendError(res, 403, 'Permission denied: Cannot modify rooms from other companies.');
      }

      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.roomType !== undefined) updates.roomType = body.roomType;
      if (body.floorNumber !== undefined) updates.floorNumber = body.floorNumber;
      if (body.building !== undefined) updates.building = body.building;
      if (body.capacityNormal !== undefined) updates.capacityNormal = body.capacityNormal;
      if (body.capacityWarning !== undefined) updates.capacityWarning = body.capacityWarning;
      if (body.capacityCritical !== undefined) updates.capacityCritical = body.capacityCritical;
      if (body.isActive !== undefined) updates.isActive = body.isActive;

      const updatedRoom = db.updateRoom(roomId, updates);
      return sendJson(res, 200, updatedRoom);
    }

    // 11. GET /api/readers - List all readers
    if (pathOnly === '/api/readers' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view readers.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;

      const readers = db.getAllReaders(authCtx.companyId);
      return sendJson(res, 200, readers);
    }

    // 12. POST /api/readers - Register new reader (Admin only)
    if (pathOnly === '/api/readers' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to create readers.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { deviceId, readerType, roomId, locationType, gateName, firmwareVersion } = body;

      if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
        return sendError(res, 400, 'Device ID is required.');
      }

      if (!gateName || typeof gateName !== 'string' || gateName.trim().length === 0) {
        return sendError(res, 400, 'Gate name is required.');
      }

      const readerData = {
        companyId: authCtx.companyId,
        deviceId: deviceId.trim(),
        readerType: readerType || 'RFID_HF',
        roomId: roomId || null,
        locationType: locationType || 'ROOM_ENTRY',
        gateName: gateName.trim(),
        firmwareVersion: firmwareVersion || null
      };

      const newReader = db.createReader(readerData);
      return sendJson(res, 201, newReader);
    }

    // =====================================================================
    // End Room Occupancy Endpoints
    // =====================================================================

    // 13. GET /api/analytics/overview - AI & Workforce Analytics Overview (Protected)
    if (pathOnly === '/api/analytics/overview' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }
      const overview = analytics.getAnalyticsOverview(authCtx.companyId);
      return sendJson(res, 200, overview);
    }

    // 7. GET /api/analytics/departments - Department attendance breakdown (Protected)
    if (pathOnly === '/api/analytics/departments' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }
      const deptData = analytics.getDepartmentAnalytics(authCtx.companyId);
      return sendJson(res, 200, deptData);
    }

    // 8. GET /api/analytics/punctuality - Punctuality & overtime ledger (Protected)
    if (pathOnly === '/api/analytics/punctuality' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }
      const punctualityData = analytics.getPunctualityAndOvertime(authCtx.companyId);
      return sendJson(res, 200, punctualityData);
    }

    // 9. GET /api/analytics/risks - Absenteeism risk indicators (Protected)
    if (pathOnly === '/api/analytics/risks' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }
      const risks = analytics.getAbsenteeismRiskIndicators(authCtx.companyId);
      return sendJson(res, 200, risks);
    }

    // 10. GET /api/analytics/anomalies - Flagged gate sequence discrepancies (Protected)
    if (pathOnly === '/api/analytics/anomalies' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
      }
      if (checkPasswordChangeRequired(authCtx, res)) return;
      if (!hasPermission(authCtx, 'analytics:view')) {
        return sendError(res, 403, 'Permission denied: Analytics view privileges required.');
      }
      const anomalies = analytics.getAttendanceAnomalies(authCtx.companyId);
      return sendJson(res, 200, anomalies);
    }

    // 11. GET /api/simulation/report - Simulation Run Report (Protected)
    if (pathOnly === '/api/simulation/report' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view simulation report.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }
      const employees = db.getAllEmployees(authCtx.companyId);
      const anomaliesData = analytics.getAttendanceAnomalies(authCtx.companyId);
      const anomaliesList = anomaliesData.anomalies || [];
      const insideEmployees = employees.filter(e => e.status === 'INSIDE');
      const outsideEmployees = employees.filter(e => e.status === 'OUTSIDE');

      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const formattedTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const report = {
        reportTimestamp: now.toISOString(),
        reportTimestampFormatted: formattedTimestamp,
        isSimulated: true,
        hardwareNotice: 'No physical RFID reader connected. RF distance (meters) and signal strength (RSSI dBm) are simulated in software.',
        targetHardwareArchitecture: 'UHF EPC Gen2 (860–960 MHz, subject to local regulatory requirements)',
        legacyProximityStandard: '13.56 MHz HF / NFC (ISO/IEC 14443A)',
        identityNotice: 'Card UID detection indicates smart badge presentation only; does not prove cardholder identity.',
        sessionSummary: {
          totalAttempts: simulationSessionStats.totalAttempts,
          acceptedScans: simulationSessionStats.acceptedScans,
          entriesLogged: simulationSessionStats.entriesLogged,
          exitsLogged: simulationSessionStats.exitsLogged,
          debouncedReads: simulationSessionStats.debouncedReads,
          rejectedUnknownUids: simulationSessionStats.rejectedUnknownUids,
          simulationErrors: simulationSessionStats.simulationErrors,
          startedAt: simulationSessionStats.startedAt,
          lastResetAt: simulationSessionStats.lastResetAt
        },
        sequenceAudit: {
          totalAnomaliesDetected: anomaliesList.length,
          unpairedEntriesCount: anomaliesList.filter(a => a.type === 'UNPAIRED_ENTRY').length,
          unpairedExitsCount: anomaliesList.filter(a => a.type === 'UNPAIRED_EXIT').length,
          rapidTransitionsCount: anomaliesList.filter(a => a.type === 'RAPID_GATE_TRANSITION').length,
          recentAnomalies: anomaliesList.slice(0, 10)
        },
        finalEmployeeStates: {
          totalEmployees: employees.length,
          insideCount: insideEmployees.length,
          outsideCount: outsideEmployees.length,
          occupancyRatePercent: employees.length ? Math.round((insideEmployees.length / employees.length) * 100) : 0,
          employees: employees.map(e => ({
            id: e.id,
            name: e.name,
            department: e.department,
            role: e.role,
            status: e.status,
            lastSeen: e.last_seen,
            cardUid: e.uid
          }))
        }
      };

      return sendJson(res, 200, report);
    }

    // 12. DELETE /api/simulation/report - Reset simulation metrics (Protected)
    if (pathOnly === '/api/simulation/report' && method === 'DELETE') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to reset simulation report.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }
      simulationSessionStats.reset();
      return sendJson(res, 200, {
        success: true,
        message: 'Simulation session metrics safely reset to zero.',
        resetAt: simulationSessionStats.lastResetAt
      });
    }

    // 404 for unknown API routes
    return sendError(res, 404, `API endpoint ${method} ${urlPath} not found.`);
  } catch (err) {
    console.error('API Error:', err);
    return sendError(res, 500, err.message || 'Internal Server Error');
  }
}

/**
 * HTTP Server Core
 */
function startServer(portToTry) {
  const server = http.createServer(async (req, res) => {
    // Enable CORS for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gateway-Key, X-Device-Id, X-CSRF-Token, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse URL path and strip query params
    const safeUrl = req.url.split('?')[0];

    // Route API requests
    if (safeUrl.startsWith('/api/')) {
      return handleApiRequest(req, res, safeUrl);
    }

    // Static File Serving (Multi-Portal Routing with Auth Protection)
    const frontendDir = path.resolve(__dirname, '..', 'frontend');
    let filePath;

    if (safeUrl === '/' || safeUrl === '/login' || safeUrl === '/login/') {
      filePath = path.join(frontendDir, 'login', 'index.html');
    } else if (safeUrl === '/admin' || safeUrl === '/admin/') {
      // Protect Admin dashboard: require COMPANY_HEAD or COMPANY_ADMIN session
      const authCtx = resolveSession(req);
      if (!authCtx || (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN')) {
        res.writeHead(302, {
          'Location': '/login?redirect=/admin',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end();
        return;
      }
      filePath = path.join(frontendDir, 'admin', 'index.html');
    } else if (safeUrl === '/employee' || safeUrl === '/employee/') {
      // Protect Employee portal: require active employee session
      const authCtx = resolveSession(req);
      if (!authCtx) {
        res.writeHead(302, {
          'Location': '/login?redirect=/employee',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end();
        return;
      }
      if (authCtx.userType !== 'EMPLOYEE') {
        res.writeHead(302, {
          'Location': '/admin',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end();
        return;
      }
      filePath = path.join(frontendDir, 'employee', 'index.html');
    } else if (safeUrl === '/style.css') {
      filePath = path.join(frontendDir, 'shared', 'css', 'style.css');
    } else if (safeUrl === '/office_building.jpg') {
      filePath = path.join(frontendDir, 'assets', 'office_building.jpg');
    } else if (safeUrl === '/script.js') {
      filePath = path.join(frontendDir, 'shared', 'js', 'common.js');
    } else if (safeUrl === '/login.js') {
      filePath = path.join(frontendDir, 'login', 'login.js');
    } else if (safeUrl === '/admin.js') {
      filePath = path.join(frontendDir, 'admin', 'admin.js');
    } else if (safeUrl === '/employee.js') {
      filePath = path.join(frontendDir, 'employee', 'employee.js');
    } else {
      const cleanPath = safeUrl.replace(/^\/+/, '');
      filePath = path.resolve(frontendDir, cleanPath);
    }

    // Prevent directory traversal
    if (!filePath.startsWith(frontendDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`Server Error: ${readErr.code}`);
          return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} in use, trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(portToTry, () => {
    const url = `http://localhost:${portToTry}`;
    console.log(`SmartWorkforce System running with SQLite Persistence at: ${url}`);
  });

  return server;
}

if (require.main === module) {
  startServer(port);
}

module.exports = {
  startServer,
  handleApiRequest,
  port,
  resolveSession,
  verifyCsrf,
  getAuthEffectivePermissions,
  hasPermission,
  canAccessEmployee,
  getPermittedEmployeeIds,
  checkPasswordChangeRequired
};

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
    const company = db.getCompanyById(session.company_id);
    return {
      session,
      rawToken,
      user: emp,
      company,
      userType: 'EMPLOYEE',
      companyId: session.company_id,
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

      // Generate server session with hashed token storage
      const rawToken = auth.generateOpaqueToken();
      const tokenHash = auth.hashToken(rawToken);
      const csrfToken = auth.generateCsrfToken();
      const expiresAt = new Date(Date.now() + 86400 * 1000).toISOString();

      db.createSession({
        id: tokenHash,
        accountId: regResult.user.id,
        userType: 'COMPANY_HEAD',
        companyId: regResult.company.id,
        csrfToken: csrfToken,
        ipAddress: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        expiresAt: expiresAt
      });

      const cookies = [
        auth.serializeCookie('sw_session', rawToken, { maxAge: 86400, httpOnly: true, sameSite: 'Lax', secure: isSecure, path: '/' }),
        auth.serializeCookie('sw_csrf', csrfToken, { maxAge: 86400, httpOnly: false, sameSite: 'Lax', secure: isSecure, path: '/' })
      ];

      return sendJson(res, 201, {
        success: true,
        message: 'Company registered successfully.',
        redirectTo: '/admin',
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
        },
        csrfToken: csrfToken
      }, { 'Set-Cookie': cookies });
    }

    // B. POST /api/auth/login - Server-side Company Head / Admin Login
    if (pathOnly === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { identity, email, adminId, password } = body;
      const targetIdentity = (identity || email || adminId || '').trim();

      if (!targetIdentity || !password) {
        return sendError(res, 400, 'Identity and password are required.');
      }

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
          email: authCtx.user.email,
          role: authCtx.user.role || authCtx.userType,
          companyId: authCtx.companyId
        },
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
    // WORKFORCE OPERATIONAL ENDPOINTS (PROTECTED & SCOPED)
    // =========================================================

    // 1. GET /api/employees - List employees (Scoped to authenticated company)
    if (pathOnly === '/api/employees' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access workforce roster.');
      }
      const employees = db.getAllEmployees(authCtx.companyId);
      return sendJson(res, 200, employees);
    }

    // 2. POST /api/employees - Register new employee
    if (pathOnly === '/api/employees' && method === 'POST') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to register new workforce members.');
      }
      if (authCtx.userType !== 'COMPANY_HEAD' && authCtx.userType !== 'COMPANY_ADMIN') {
        return sendError(res, 403, 'Permission denied: Administrator privileges required.');
      }

      const body = await parseJsonBody(req);
      if (!verifyCsrf(req, authCtx, body)) {
        return sendError(res, 403, 'Invalid or missing CSRF token.');
      }

      const { id, name, department, role, uid, avatarBg } = body;

      if (!id || !name || !department || !role || !uid) {
        return sendError(res, 400, 'Missing required fields: id, name, department, role, uid are required.');
      }

      if (db.getEmployeeById(id)) {
        return sendError(res, 409, `Employee with ID ${id} already exists.`);
      }
      if (db.getEmployeeByUid(uid)) {
        return sendError(res, 409, `Smart Card UID ${uid} is already assigned to another employee.`);
      }

      const created = db.createEmployee({
        id,
        name,
        department,
        role,
        uid,
        avatarBg,
        companyId: authCtx.companyId
      });
      return sendJson(res, 201, created);
    }

    // 3. GET /api/attendance/logs - Retrieve attendance event logs (Scoped to company)
    if (pathOnly === '/api/attendance/logs' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to access attendance logs.');
      }
      const logs = db.getAllAttendanceEvents(authCtx.companyId);
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
          gate: gate ? gate.trim() : 'Gate 01 - Main Facility Turnstile'
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

    // 6. GET /api/analytics/overview - AI & Workforce Analytics Overview (Protected)
    if (pathOnly === '/api/analytics/overview' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
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
      const deptData = analytics.getDepartmentAnalytics(authCtx.companyId);
      return sendJson(res, 200, deptData);
    }

    // 8. GET /api/analytics/punctuality - Punctuality & overtime ledger (Protected)
    if (pathOnly === '/api/analytics/punctuality' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
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
      const risks = analytics.getAbsenteeismRiskIndicators(authCtx.companyId);
      return sendJson(res, 200, risks);
    }

    // 10. GET /api/analytics/anomalies - Flagged gate sequence discrepancies (Protected)
    if (pathOnly === '/api/analytics/anomalies' && method === 'GET') {
      const authCtx = resolveSession(req);
      if (!authCtx) {
        return sendError(res, 401, 'Authentication required to view analytics.');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
      // Protect Employee portal: require active session
      const authCtx = resolveSession(req);
      if (!authCtx) {
        res.writeHead(302, {
          'Location': '/login?redirect=/employee',
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

module.exports = { startServer, handleApiRequest, port, resolveSession, verifyCsrf };

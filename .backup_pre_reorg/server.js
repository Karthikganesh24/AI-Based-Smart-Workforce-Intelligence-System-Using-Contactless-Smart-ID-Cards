const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('./database.js');
const analytics = require('./analytics.js');

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
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

/**
 * REST API Router
 */
async function handleApiRequest(req, res, urlPath) {
  const method = req.method.toUpperCase();
  const pathOnly = (typeof urlPath === 'string' && urlPath.length > 1)
    ? urlPath.replace(/\/+$/, '')
    : urlPath;

  try {
    // 1. GET /api/employees - List all employees
    if (pathOnly === '/api/employees' && method === 'GET') {
      const employees = db.getAllEmployees();
      return sendJson(res, 200, employees);
    }

    // 2. POST /api/employees - Register new employee
    if (pathOnly === '/api/employees' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { id, name, department, role, uid, avatarBg } = body;

      if (!id || !name || !department || !role || !uid) {
        return sendError(res, 400, 'Missing required fields: id, name, department, role, uid are required.');
      }

      // Check for existing ID or UID collision
      if (db.getEmployeeById(id)) {
        return sendError(res, 409, `Employee with ID ${id} already exists.`);
      }
      if (db.getEmployeeByUid(uid)) {
        return sendError(res, 409, `Smart Card UID ${uid} is already assigned to another employee.`);
      }

      const created = db.createEmployee({ id, name, department, role, uid, avatarBg });
      return sendJson(res, 201, created);
    }

    // 3. GET /api/attendance/logs - Retrieve all attendance event logs
    if (pathOnly === '/api/attendance/logs' && method === 'GET') {
      const logs = db.getAllAttendanceEvents();
      return sendJson(res, 200, logs);
    }

    // 4. POST /api/attendance/scan - Simulate or receive smart card tap (Entry / Exit)
    if (pathOnly === '/api/attendance/scan' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { empId, uid, mode, gate, deviceId, simulatedDistance, simulatedRssi } = body;

      // Optional Gateway Authentication for external device requests
      const configuredGatewayKey = process.env.GATEWAY_API_KEY;
      if (configuredGatewayKey) {
        const incomingKey = req.headers['x-gateway-key'] ||
          (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) ||
          body.gatewayKey;
        const incomingDeviceId = req.headers['x-device-id'] || deviceId;

        // If request identifies as an external hardware gateway device or provides a key, verify it
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

        // Phase 5B: Record actual attempt outcome
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

    // 5. DELETE /api/attendance/logs - Clear attendance log history
    if (pathOnly === '/api/attendance/logs' && method === 'DELETE') {
      const result = db.clearAttendanceEvents();
      return sendJson(res, 200, result);
    }

    // 6. GET /api/analytics/overview - High-level AI & Workforce Analytics Overview
    if (pathOnly === '/api/analytics/overview' && method === 'GET') {
      const overview = analytics.getAnalyticsOverview();
      return sendJson(res, 200, overview);
    }

    // 7. GET /api/analytics/departments - Department-wise attendance breakdown
    if (pathOnly === '/api/analytics/departments' && method === 'GET') {
      const deptData = analytics.getDepartmentAnalytics();
      return sendJson(res, 200, deptData);
    }

    // 8. GET /api/analytics/punctuality - Late arrival, early departure & overtime ledger
    if (pathOnly === '/api/analytics/punctuality' && method === 'GET') {
      const punctualityData = analytics.getPunctualityAndOvertime();
      return sendJson(res, 200, punctualityData);
    }

    // 9. GET /api/analytics/risks - Explainable absenteeism risk indicators
    if (pathOnly === '/api/analytics/risks' && method === 'GET') {
      const risks = analytics.getAbsenteeismRiskIndicators();
      return sendJson(res, 200, risks);
    }

    // 10. GET /api/analytics/anomalies - Flagged gate sequence discrepancies
    if (pathOnly === '/api/analytics/anomalies' && method === 'GET') {
      const anomalies = analytics.getAttendanceAnomalies();
      return sendJson(res, 200, anomalies);
    }

    // 11. GET /api/simulation/report - Phase 5B Virtual RFID Validation and Simulation Run Report
    if (pathOnly === '/api/simulation/report' && method === 'GET') {
      const employees = db.getAllEmployees();
      const anomaliesData = analytics.getAttendanceAnomalies();
      const anomaliesList = anomaliesData.anomalies || [];
      const insideEmployees = employees.filter(e => e.status === 'INSIDE');
      const outsideEmployees = employees.filter(e => e.status === 'OUTSIDE');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

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
            cardUid: e.card_uid
          }))
        }
      };

      return sendJson(res, 200, report);
    }

    // 12. DELETE /api/simulation/report - Safely reset simulation session metrics without deleting database history
    if (pathOnly === '/api/simulation/report' && method === 'DELETE') {
      simulationSessionStats.reset();
      return sendJson(res, 200, {
        success: true,
        message: 'Simulation session metrics safely reset to zero. Database attendance logs and employee rosters remain completely intact.',
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gateway-Key, X-Device-Id, Authorization');

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

    // Static File Serving
    let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
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

module.exports = { startServer, handleApiRequest, port };

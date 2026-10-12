const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('./database.js');

let port = parseInt(process.env.PORT, 10) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
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

  try {
    // 1. GET /api/employees - List all employees
    if (urlPath === '/api/employees' && method === 'GET') {
      const employees = db.getAllEmployees();
      return sendJson(res, 200, employees);
    }

    // 2. POST /api/employees - Register new employee
    if (urlPath === '/api/employees' && method === 'POST') {
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
    if (urlPath === '/api/attendance/logs' && method === 'GET') {
      const logs = db.getAllAttendanceEvents();
      return sendJson(res, 200, logs);
    }

    // 4. POST /api/attendance/scan - Simulate card tap (Entry / Exit)
    if (urlPath === '/api/attendance/scan' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { empId, mode, gate } = body;

      if (!empId) {
        return sendError(res, 400, 'Field "empId" is required to simulate smart card tap.');
      }

      const existingEmp = db.getEmployeeById(empId);
      if (!existingEmp) {
        return sendError(res, 404, `Employee ${empId} not found in database.`);
      }

      const result = db.recordCardScan({
        empId,
        mode: mode || 'AUTO',
        gate: gate || 'Gate 01 - Main Facility Turnstile'
      });

      return sendJson(res, 200, result);
    }

    // 5. DELETE /api/attendance/logs - Clear attendance log history
    if (urlPath === '/api/attendance/logs' && method === 'DELETE') {
      const result = db.clearAttendanceEvents();
      return sendJson(res, 200, result);
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

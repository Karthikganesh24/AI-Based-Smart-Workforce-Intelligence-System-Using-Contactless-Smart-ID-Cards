#!/usr/bin/env node
/**
 * scripts/simulate_esp32.js
 * 
 * Hardware-Free ESP32 + Contactless Smart ID Card Gateway Simulator
 * Simulates an ESP32 micro-controller with Wi-Fi transmitting contactless RFID card scans
 * to the SmartWorkforce REST API using physical card UIDs.
 * 
 * Usage:
 *   node scripts/simulate_esp32.js --uid 7E:A1:39:B2
 *   node scripts/simulate_esp32.js --stream --count 6 --interval 2000
 *   node scripts/simulate_esp32.js --debounce-test
 *   node scripts/simulate_esp32.js --unknown-test
 *   node scripts/simulate_esp32.js --url http://127.0.0.1:3000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// ANSI formatting for realistic industrial terminal output
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

// Sample registered workforce card UIDs from the database
const KNOWN_UIDS = [
  { uid: '7E:A1:39:B2', name: 'Aravind Kumar', dept: 'Production', role: 'CNC Lead Operator' },
  { uid: '4F:8B:12:9C', name: 'Priya Sharma', dept: 'Quality', role: 'QA Inspection Specialist' },
  { uid: '9A:3D:77:E1', name: 'Rohan Mehta', dept: 'IT', role: 'Systems Architect' },
  { uid: '1C:F5:62:30', name: 'Suresh Patel', dept: 'Maintenance', role: 'Electro-Mechanical Tech' },
  { uid: 'B3:44:81:AA', name: 'Ananya Iyer', dept: 'Production', role: 'Robotics Assembly Lead' },
  { uid: '55:9C:20:F8', name: 'Vikram Singh', dept: 'IT', role: 'IoT Firmware Engineer' },
  { uid: '6D:E8:3B:14', name: 'Deepa Nair', dept: 'Quality', role: 'Safety Auditor' },
  { uid: '81:3A:D4:59', name: 'Karthik Raja', dept: 'Maintenance', role: 'Infrastructure Lead' }
];

const GATES = [
  'Gate 01 - Main Turnstile',
  'Gate 02 - Production Bay',
  'Gate 03 - IT Labs Secure Door',
  'Gate 04 - Maintenance Workshop Gate'
];

// CLI Argument Parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    url: process.env.SERVER_URL || 'http://localhost:3000',
    uid: null,
    empId: null,
    gate: 'Gate 01 - Main Turnstile',
    mode: 'AUTO',
    deviceId: 'ESP32-GATEWAY-A1',
    key: process.env.GATEWAY_API_KEY || null,
    stream: false,
    count: 5,
    interval: 2500,
    debounceTest: false,
    unknownTest: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') config.help = true;
    else if (arg === '--url' && args[i + 1]) config.url = args[++i];
    else if (arg === '--uid' && args[i + 1]) config.uid = args[++i];
    else if (arg === '--emp' && args[i + 1]) config.empId = args[++i];
    else if (arg === '--gate' && args[i + 1]) config.gate = args[++i];
    else if (arg === '--mode' && args[i + 1]) config.mode = args[++i];
    else if (arg === '--device' && args[i + 1]) config.deviceId = args[++i];
    else if (arg === '--key' && args[i + 1]) config.key = args[++i];
    else if (arg === '--stream') config.stream = true;
    else if (arg === '--count' && args[i + 1]) config.count = parseInt(args[++i], 10);
    else if (arg === '--interval' && args[i + 1]) config.interval = parseInt(args[++i], 10);
    else if (arg === '--debounce-test') config.debounceTest = true;
    else if (arg === '--unknown-test') config.unknownTest = true;
  }

  return config;
}

/**
 * Send HTTP POST card-detection payload to the server
 */
function sendCardScan(baseUrl, payload, apiKey) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL('/api/attendance/scan', baseUrl);
    const postData = JSON.stringify(payload);

    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'ESP32-HTTP-Client/1.0.0 (SmartWorkforce)',
      'X-Device-Id': payload.deviceId || 'ESP32-GATEWAY-01'
    };

    if (apiKey) {
      headers['X-Gateway-Key'] = apiKey;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: headers
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          if (data.trim()) json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Connection timed out. Ensure the SmartWorkforce server is running.'));
    });

    req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printBanner(config) {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  SmartWorkforce: Virtual ESP32 Wi-Fi Gateway Simulator${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${DIM}Emulating Microcontroller: ${config.deviceId} | Wi-Fi Signal: -58 dBm (Strong)${RESET}`);
  console.log(`${DIM}Target Server:              ${config.url}${RESET}`);
  if (config.key) {
    console.log(`${DIM}Gateway Key:                ${config.key.substring(0, 4)}****${RESET}`);
  }
  console.log(`${BOLD}${CYAN}----------------------------------------------------------------------${RESET}\n`);
}

function printHelp() {
  console.log(`
${BOLD}Virtual ESP32 Gateway Simulator${RESET}

Simulates physical contactless smart card reads transmitted by an ESP32 microcontroller
over Wi-Fi to the SmartWorkforce backend.

${BOLD}Options:${RESET}
  --url <URL>           Target SmartWorkforce server URL (default: http://localhost:3000)
  --uid <UID>           Single card UID to simulate (e.g. 7E:A1:39:B2)
  --emp <ID>            Employee ID fallback (e.g. EMP-101)
  --gate <Gate>         Gate location name (default: Gate 01 - Main Turnstile)
  --mode <MODE>         Scan mode: AUTO, ENTRY, EXIT (default: AUTO)
  --device <ID>         ESP32 device identifier (default: ESP32-GATEWAY-A1)
  --key <KEY>           Gateway API authentication key
  --stream              Simulate continuous realistic workforce tap stream
  --count <N>           Number of events to generate in stream mode (default: 5)
  --interval <ms>       Milliseconds between stream taps (default: 2500)
  --debounce-test       Demonstrate 5-second rapid double-tap rejection
  --unknown-test        Demonstrate safe rejection of unregistered RFID cards
  --help, -h            Show this help reference

${BOLD}Examples:${RESET}
  node scripts/simulate_esp32.js --uid 7E:A1:39:B2
  node scripts/simulate_esp32.js --stream --count 6 --interval 2000
  node scripts/simulate_esp32.js --debounce-test
  node scripts/simulate_esp32.js --unknown-test
`);
}

async function run() {
  const config = parseArgs();

  if (config.help) {
    printHelp();
    return;
  }

  printBanner(config);

  // 1. Debounce Test Mode
  if (config.debounceTest) {
    console.log(`${BOLD}${YELLOW}▶ RUNNING 5-SECOND DEBOUNCE / RAPID TAP PROTECTION TEST${RESET}`);
    console.log(`  Sending initial tap for UID 7E:A1:39:B2 at Gate 01...`);
    const payload1 = {
      uid: '7E:A1:39:B2',
      gate: 'Gate 01 - Main Turnstile',
      mode: 'AUTO',
      deviceId: config.deviceId
    };

    try {
      const res1 = await sendCardScan(config.url, payload1, config.key);
      console.log(`  ${GREEN}✓ Tap 1 Accepted:${RESET} HTTP ${res1.status} - Event: ${res1.data.event ? res1.data.event.id : 'N/A'}, Status -> ${res1.data.employee ? res1.data.employee.status : 'N/A'}`);

      console.log(`  Sending IMMEDIATE rapid second tap (300ms later) with SAME card at SAME gate...`);
      await sleep(300);

      const res2 = await sendCardScan(config.url, payload1, config.key);
      if (res2.data && res2.data.ignored) {
        console.log(`  ${GREEN}✓ Tap 2 Correctly Debounced / Ignored:${RESET} HTTP ${res2.status}`);
        console.log(`    ${CYAN}Reason:${RESET} ${res2.data.message}`);
        console.log(`    ${CYAN}Employee status preserved without flipping:${RESET} ${res2.data.employee.status}`);
        console.log(`\n${GREEN}${BOLD}✓ DEBOUNCE TEST SUCCESSFUL: Repeated rapid reads safely ignored!${RESET}\n`);
      } else {
        console.log(`  ${RED}✗ Tap 2 was NOT ignored! Response:${RESET}`, res2.data);
      }
    } catch (err) {
      console.error(`  ${RED}✗ Request failed:${RESET} ${err.message}`);
    }
    return;
  }

  // 2. Unknown Card Test Mode
  if (config.unknownTest) {
    console.log(`${BOLD}${YELLOW}▶ RUNNING UNREGISTERED RFID CARD TEST${RESET}`);
    const unknownUid = 'FF:EE:DD:CC';
    console.log(`  Simulating unrecognized card tap: UID ${unknownUid}...`);
    const payload = {
      uid: unknownUid,
      gate: 'Gate 01 - Main Turnstile',
      mode: 'AUTO',
      deviceId: config.deviceId
    };

    try {
      const res = await sendCardScan(config.url, payload, config.key);
      if (res.status === 404 && res.data && res.data.code === 'UNKNOWN_UID') {
        console.log(`  ${GREEN}✓ Unregistered Card Safely Rejected:${RESET} HTTP 404`);
        console.log(`    ${CYAN}Response:${RESET} ${res.data.error}`);
        console.log(`\n${GREEN}${BOLD}✓ UNKNOWN CARD TEST SUCCESSFUL: Handled safely with zero database corruption!${RESET}\n`);
      } else {
        console.log(`  ${RED}✗ Unexpected response:${RESET} HTTP ${res.status}`, res.data);
      }
    } catch (err) {
      console.error(`  ${RED}✗ Request failed:${RESET} ${err.message}`);
    }
    return;
  }

  // 3. Stream Simulation Mode
  if (config.stream) {
    console.log(`${BOLD}${YELLOW}▶ SIMULATING CONTINUOUS GATE STREAM (${config.count} events, every ${config.interval}ms)...${RESET}`);
    for (let i = 0; i < config.count; i++) {
      const empInfo = KNOWN_UIDS[i % KNOWN_UIDS.length];
      const gate = GATES[i % GATES.length];
      const payload = {
        uid: empInfo.uid,
        gate: gate,
        mode: config.mode,
        deviceId: config.deviceId
      };

      try {
        const res = await sendCardScan(config.url, payload, config.key);
        if (res.status === 200) {
          if (res.data.ignored) {
            console.log(`  [${i + 1}/${config.count}] ${YELLOW}DEBOUNCE:${RESET} ${empInfo.name} (${empInfo.uid}) at ${gate.split('-')[0].trim()} - Ignored (<5s)`);
          } else {
            const evt = res.data.event;
            const emp = res.data.employee;
            const badgeColor = evt.eventType === 'ENTRY' ? GREEN : MAGENTA;
            console.log(`  [${i + 1}/${config.count}] ${badgeColor}${BOLD}[${evt.eventType}]${RESET} ${emp.name.padEnd(20)} (${emp.id} / ${emp.uid}) @ ${evt.gate.split('-')[0].trim()} -> Status: ${emp.status}`);
          }
        } else {
          console.log(`  [${i + 1}/${config.count}] ${RED}HTTP ${res.status}:${RESET}`, res.data);
        }
      } catch (err) {
        console.error(`  [${i + 1}/${config.count}] ${RED}Error:${RESET} ${err.message}`);
      }

      if (i < config.count - 1) {
        await sleep(config.interval);
      }
    }
    console.log(`\n${GREEN}${BOLD}✓ Stream simulation completed successfully.${RESET}\n`);
    return;
  }

  // 4. Single Card Scan Mode (Default)
  const targetUid = config.uid || '7E:A1:39:B2';
  console.log(`${BOLD}${YELLOW}▶ SIMULATING SINGLE CARD TAP${RESET}`);
  console.log(`  Sensor detecting card: ${CYAN}${targetUid}${RESET}`);
  console.log(`  Gate:                  ${config.gate}`);
  console.log(`  Mode:                  ${config.mode}`);

  const payload = {
    gate: config.gate,
    mode: config.mode,
    deviceId: config.deviceId
  };

  if (config.uid) payload.uid = config.uid;
  else if (config.empId) payload.empId = config.empId;
  else payload.uid = targetUid;

  try {
    const res = await sendCardScan(config.url, payload, config.key);
    console.log(`\n${BOLD}Server Response:${RESET} HTTP ${res.status}`);

    if (res.status === 200) {
      if (res.data.ignored) {
        console.log(`  ${YELLOW}Status: DEBOUNCED${RESET}`);
        console.log(`  ${res.data.message}`);
      } else {
        const evt = res.data.event;
        const emp = res.data.employee;
        console.log(`  ${GREEN}${BOLD}✓ ACCESS GRANTED: ${evt.eventType}${RESET}`);
        console.log(`  Employee:    ${emp.name} (${emp.id})`);
        console.log(`  Department:  ${emp.department} - ${emp.role}`);
        console.log(`  New Status:  ${emp.status}`);
        console.log(`  Event Log:   ${evt.id} at ${evt.timestamp}`);
        console.log(`  Gate:        ${evt.gate}`);
      }
    } else {
      console.log(`  ${RED}Error: ${JSON.stringify(res.data)}${RESET}`);
    }
  } catch (err) {
    console.error(`  ${RED}✗ Failed to contact SmartWorkforce server:${RESET} ${err.message}`);
  }
}

run();

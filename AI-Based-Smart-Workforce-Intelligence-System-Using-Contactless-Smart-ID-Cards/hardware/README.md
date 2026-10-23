# SmartWorkforce — Hardware & Contactless RFID Subsystem

This directory contains specifications, firmware interfacing protocols, and the hardware-free gateway simulator for the SmartWorkforce contactless smart ID attendance infrastructure.

---

## 1. Subsystem Architecture

SmartWorkforce captures employee attendance through physical or virtual contactless smart card taps. Each physical badge contains an embedded passive RFID/NFC transponder transmitting a globally unique 4-byte or 7-byte hexadecimal UID (e.g., `7E:A1:39:B2` or `04:A2:3B:5F:81:C0:99`).

```text
[ Physical Smart Badge ] 
         │ (13.56 MHz HF/NFC or UHF RFID)
         ▼
[ RFID Reader Module (MFRC522 / PN532) ]
         │ (SPI / I2C Bus)
         ▼
[ ESP32 Microcontroller Gateway Node ]
         │ (Wi-Fi 802.11 b/g/n, TLS / HTTP POST)
         ▼
[ SmartWorkforce Backend Server (`POST /api/attendance/scan`) ]
         │
         ├── 5-Second Duplicate Read Debounce Protection
         ├── Employee Identification & Presence Status Transition
         └── Atomic Transaction Logging in SQLite
```

---

## 2. Hardware Microcontroller Specifications

### Recommended Components
- **Microcontroller**: ESP32-WROOM-32 (Dual-core 240 MHz, 520 KB SRAM, Integrated 2.4 GHz Wi-Fi)
- **RFID Reader Module**: MFRC522 (13.56 MHz RFID/NFC) or PN532 (NFC/NTAG/Mifare Classic & Ultralight)
- **Feedback Indicators**:
  - Piezoelectric Buzzer (High-pitch chime for accepted entry, low-pitch buzz for debounced/rejected)
  - Bi-Color LED (Green = Access Granted / Presence Logged; Red = Unrecognized / Error)
  - 0.96" I2C OLED Display (SSD1306, optional for displaying employee name and timestamp)

### ESP32 to MFRC522 Pin Wiring (SPI Interface)
| MFRC522 Pin | ESP32 GPIO Pin | Function |
| :--- | :--- | :--- |
| **VCC** | 3.3V | Operating Power (Do NOT connect to 5V) |
| **RST** | GPIO 22 | Reset Line |
| **GND** | GND | Ground |
| **MISO** | GPIO 19 | SPI Master In / Slave Out |
| **MOSI** | GPIO 23 | SPI Master Out / Slave In |
| **SCK** | GPIO 18 | SPI Serial Clock |
| **SDA (SS)** | GPIO 5 | SPI Slave Select |

---

## 3. Gateway Communication Protocol

The ESP32 reads the smart card UID upon proximity detection (1–5 cm) and dispatches an HTTP POST request to the SmartWorkforce attendance endpoint:

- **Endpoint**: `POST /api/attendance/scan`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Gateway-Key: <GATEWAY_API_KEY>` (Optional authorization header configured via environment variables)
  - `X-Device-Id: ESP32-GATEWAY-A1`
- **JSON Payload**:
  ```json
  {
    "uid": "7E:A1:39:B2",
    "gate": "Gate 01 - Main Facility Turnstile",
    "mode": "AUTO",
    "deviceId": "ESP32-GATEWAY-A1",
    "simulatedDistance": 1.2,
    "simulatedRssi": -58
  }
  ```
- **Backend Response (`200 OK`)**:
  ```json
  {
    "ignored": false,
    "event": {
      "id": "LOG-1001",
      "timestamp": "23/10/2026, 09:30:15",
      "empId": "EMP-101",
      "empName": "Aravind Kumar",
      "department": "Production",
      "eventType": "ENTRY",
      "gate": "Gate 01 - Main Facility Turnstile",
      "status": "VERIFIED"
    },
    "employee": {
      "id": "EMP-101",
      "name": "Aravind Kumar",
      "status": "INSIDE"
    }
  }
  ```

---

## 4. Hardware-Free Gateway Simulator CLI

For evaluation, automated testing, or demonstration when physical ESP32 boards are not connected, the simulator reproduces the full hardware cycle:

- **Canonical Location**: [`hardware/simulator/simulate_rfid_gateway.js`](simulate_rfid_gateway.js)
- **Backward-Compatible Delegate**: [`scripts/simulate_esp32.js`](../../scripts/simulate_esp32.js)

### Available Commands
```bash
# 1. Single card tap simulation using registered card UID:
npm run simulate:esp32 -- --uid 7E:A1:39:B2

# 2. Continuous multi-employee walk-through stream (every 2 seconds):
npm run simulate:esp32 -- --stream --interval 2000

# 3. Test 5-second anti-fraud debounce window:
npm run simulate:esp32 -- --debounce-test

# 4. Test unrecognized/unregistered RFID card detection:
npm run simulate:esp32 -- --unknown-test

# 5. Specify target server URL:
node hardware/simulator/simulate_rfid_gateway.js --url http://localhost:3000
```

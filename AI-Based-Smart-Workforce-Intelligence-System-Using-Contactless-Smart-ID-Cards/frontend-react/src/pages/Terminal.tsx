/* Hallmark · genre: modern-minimal · macrostructure: Long Document · design-system: design.md · designed-as-app */

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@components/UI';
import { playSuccessSound } from '@utils/audio';
import toast from 'react-hot-toast';
import './Terminal.css';

// Mock employees for terminal simulation
const mockEmployees = [
  { id: 'EMP-101', name: 'Aravind Kumar', uid: '7E:A1:39:B2', department: 'Production', role: 'CNC Lead Operator', status: 'OUTSIDE' },
  { id: 'EMP-102', name: 'Priya Sharma', uid: '4F:8B:12:9C', department: 'Quality', role: 'QA Specialist', status: 'INSIDE' },
  { id: 'EMP-103', name: 'Rohan Mehta', uid: '9A:3D:77:E1', department: 'IT', role: 'Systems Architect', status: 'INSIDE' },
  { id: 'EMP-104', name: 'Suresh Patel', uid: '1C:F5:62:30', department: 'Maintenance', role: 'Electro-Mechanical Tech', status: 'OUTSIDE' },
  { id: 'EMP-105', name: 'Ananya Iyer', uid: 'B3:44:81:AA', department: 'Production', role: 'Robotics Assembly Lead', status: 'INSIDE' },
  { id: 'EMP-106', name: 'Vikram Singh', uid: '55:9C:20:F8', department: 'IT', role: 'IoT Firmware Engineer', status: 'OUTSIDE' },
  { id: 'EMP-107', name: 'Deepa Nair', uid: '6D:E8:3B:14', department: 'Quality', role: 'Safety & Compliance Auditor', status: 'INSIDE' },
  { id: 'EMP-108', name: 'Karthik Raja', uid: '81:3A:D4:59', department: 'Maintenance', role: 'Infrastructure Lead', status: 'INSIDE' },
];

type ScanResult = {
  success: boolean;
  message: string;
  employee?: typeof mockEmployees[0];
  eventType?: 'ENTRY' | 'EXIT';
  timestamp: string;
};

export const Terminal = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(mockEmployees[0].id);
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  const selectedEmployee = mockEmployees.find((e) => e.id === selectedEmployeeId);

  // Live animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = () => {
    setIsScanning(true);
    const employee = selectedEmployee;

    setTimeout(() => {
      if (!employee) {
        const result: ScanResult = {
          success: false,
          message: `Card not found in system`,
          timestamp: new Date().toISOString(),
        };
        setLastScanResult(result);
        setScanHistory((prev) => [result, ...prev].slice(0, 10));
        toast.error('Unknown card detected');
        setIsScanning(false);
        return;
      }

      // Auto toggle based on current status
      const eventType: 'ENTRY' | 'EXIT' = employee.status === 'OUTSIDE' ? 'ENTRY' : 'EXIT';

      // Update employee status
      employee.status = eventType === 'ENTRY' ? 'INSIDE' : 'OUTSIDE';

      const result: ScanResult = {
        success: true,
        message: `${eventType} recorded successfully`,
        employee,
        eventType,
        timestamp: new Date().toISOString(),
      };

      setLastScanResult(result);
      setScanHistory((prev) => [result, ...prev].slice(0, 10));
      playSuccessSound();
      toast.success(`${employee.name} - ${eventType}`);
      setIsScanning(false);
    }, 800);
  };

  return (
    <div className="terminal-page">
      <header className="page-header">
        <h1 className="page-title">Smart Card Terminal</h1>
        <p className="page-subtitle">
          BLE iBeacon proximity detection · Bluetooth Low Energy
        </p>
      </header>

      <div className="terminal-main">
        {/* Virtual Card Display */}
        <Card className="virtual-card-section">
          <div className={`virtual-card ${pulseAnimation ? 'pulse' : ''}`}>
            <div className="card-chip" />
            <div className="card-ble-waves">
              <svg className="ble-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
              </svg>
              <div className="wave"></div>
              <div className="wave"></div>
              <div className="wave"></div>
            </div>

            <div className="card-content">
              <div className="card-avatar">
                {selectedEmployee?.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="card-info">
                <div className="card-name">{selectedEmployee?.name}</div>
                <div className="card-role">{selectedEmployee?.role}</div>
                <div className="card-dept">{selectedEmployee?.department}</div>
              </div>
            </div>

            <div className="card-footer-info">
              <div className="card-id">{selectedEmployee?.id}</div>
              <Badge variant={selectedEmployee?.status === 'INSIDE' ? 'success' : 'default'} size="sm">
                {selectedEmployee?.status}
              </Badge>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="select-employee">
            <label>Select Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="employee-select"
            >
              {mockEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.status}
                </option>
              ))}
            </select>
          </div>

          {/* Tap Button */}
          <Button
            variant="primary"
            size="lg"
            onClick={handleScan}
            disabled={isScanning}
            className="tap-button"
          >
            {isScanning ? (
              <>
                <span className="scanning-spinner"></span>
                Detecting...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
                </svg>
                Present Badge
              </>
            )}
          </Button>
        </Card>

        {/* Live Result Display */}
        <div className="results-section">
          <Card className="result-display">
            <h2 className="section-title">Latest Scan</h2>
            {lastScanResult ? (
              <div className={`scan-result ${lastScanResult.success ? 'success' : 'error'}`}>
                <div className="result-icon">
                  {lastScanResult.success ? '✓' : '✗'}
                </div>
                <div className="result-info">
                  <div className="result-employee">{lastScanResult.employee?.name || 'Unknown'}</div>
                  <div className="result-event">
                    {lastScanResult.eventType && (
                      <Badge
                        variant={lastScanResult.eventType === 'ENTRY' ? 'success' : 'default'}
                        size="md"
                      >
                        {lastScanResult.eventType}
                      </Badge>
                    )}
                  </div>
                  <div className="result-time">
                    {new Date(lastScanResult.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-result">
                <div className="empty-icon">📱</div>
                <p>No scans yet</p>
                <p className="empty-hint">Select an employee and tap to begin</p>
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="history-display">
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-list">
              {scanHistory.length > 0 ? (
                scanHistory.map((result, idx) => (
                  <div key={idx} className={`activity-item ${result.success ? 'success' : 'error'}`}>
                    <div className="activity-icon">
                      {result.success ? '✓' : '✗'}
                    </div>
                    <div className="activity-details">
                      <span className="activity-name">{result.employee?.name || 'Unknown'}</span>
                      <span className="activity-event">{result.eventType}</span>
                    </div>
                    <div className="activity-time">
                      {new Date(result.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

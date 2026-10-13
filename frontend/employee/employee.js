/**
 * frontend/employee/employee.js
 * 
 * Employee Self-Service Portal Controller for SmartWorkforce.
 * Renders personal RFID smart badge, presence status, and punch activity.
 */

(function () {
  'use strict';

  const {
    api,
    showToast,
    playScannerBeep,
    playScannerWarning,
    playScannerBuzz,
    initLiveClock,
    initThemeToggle,
    getInitials,
    escapeHtml
  } = window.SmartWorkforceCommon;

  let employees = [];
  let currentEmployee = null;

  // DOM Elements
  const selector = document.getElementById('employeeSelector');
  const badgeAvatar = document.getElementById('badgeAvatar');
  const badgeName = document.getElementById('badgeName');
  const badgeRole = document.getElementById('badgeRole');
  const badgeUidText = document.getElementById('badgeUidText');
  const badgeEmpId = document.getElementById('badgeEmpId');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusLastSeen = document.getElementById('statusLastSeen');

  const tapGateSelect = document.getElementById('tapGateSelect');
  const tapModeSelect = document.getElementById('tapModeSelect');
  const btnSimulateTap = document.getElementById('btnSimulateTap');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  const empLogsTbody = document.getElementById('empLogsTbody');

  initLiveClock('empLiveClock');
  initThemeToggle('themeToggle');

  // Load initial employees
  async function loadEmployees() {
    try {
      employees = await api.getEmployees();
      if (!employees || employees.length === 0) return;

      selector.innerHTML = '';
      employees.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = `${emp.id} - ${emp.name} (${emp.department})`;
        selector.appendChild(opt);
      });

      // Check URL query param ?id=EMP-xxx
      const urlParams = new URLSearchParams(window.location.search);
      const requestedId = urlParams.get('id');
      const targetEmp = employees.find(e => e.id === requestedId) || employees[0];

      selector.value = targetEmp.id;
      selectEmployee(targetEmp.id);
    } catch (err) {
      console.error('Failed to load employees:', err);
      showToast('Could not load workforce records from server.', 'error');
    }
  }

  function selectEmployee(empId) {
    currentEmployee = employees.find(e => e.id === empId);
    if (!currentEmployee) return;

    badgeAvatar.textContent = getInitials(currentEmployee.name);
    badgeAvatar.style.backgroundColor = currentEmployee.avatarBg || '#0284C7';
    badgeName.textContent = currentEmployee.name;
    badgeRole.textContent = `${currentEmployee.role} • ${currentEmployee.department}`;
    badgeUidText.textContent = currentEmployee.uid;
    badgeEmpId.textContent = currentEmployee.id;

    const isInside = currentEmployee.status === 'INSIDE';
    statusDot.className = `status-indicator ${isInside ? 'status-inside' : 'status-outside'}`;
    statusText.textContent = isInside ? 'INSIDE FACILITY' : 'OUTSIDE PREMISES';
    statusText.style.color = isInside ? 'var(--status-inside)' : 'var(--status-outside)';
    statusLastSeen.textContent = currentEmployee.lastSeen || 'Not detected today';

    loadEmployeeLogs(currentEmployee.id);
  }

  // Load attendance events for selected employee
  async function loadEmployeeLogs(empId) {
    try {
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Fetching logs...</td></tr>`;
      const allLogs = await api.getAttendanceLogs();
      const myLogs = allLogs.filter(l => l.empId === empId).reverse();

      if (myLogs.length === 0) {
        empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No card scans registered today. Tap your card above to punch in.</td></tr>`;
        return;
      }

      empLogsTbody.innerHTML = myLogs.map(l => {
        const isEntry = l.eventType === 'ENTRY';
        const badgeClass = isEntry ? 'badge-entry' : 'badge-exit';
        return `
          <tr>
            <td style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(l.id)}</td>
            <td style="font-family: var(--font-mono); font-size: 0.82rem;">${escapeHtml(l.timestamp)}</td>
            <td style="font-size: 0.85rem;">${escapeHtml(l.gate)}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(l.eventType)}</span></td>
            <td><span class="badge badge-verified">${escapeHtml(l.status)}</span></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load logs:', err);
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-danger); padding: 20px;">Error loading logs.</td></tr>`;
    }
  }

  // Simulated Self Tap
  async function handleCardTap() {
    if (!currentEmployee) return;

    btnSimulateTap.disabled = true;
    const gate = tapGateSelect.value;
    const mode = tapModeSelect.value;

    try {
      const result = await api.recordCardScan({
        uid: currentEmployee.uid,
        gate,
        mode,
        deviceId: 'PORTAL-SELF-TAP'
      });

      if (result.ignored) {
        playScannerWarning();
        showToast(`Debounced: ${result.message}`, 'warning');
      } else {
        const isEntry = result.event && result.event.eventType === 'ENTRY';
        playScannerBeep(isEntry);
        showToast(
          `Smart Card Scanned: ${isEntry ? 'ENTRY' : 'EXIT'} logged at ${gate}`,
          isEntry ? 'entry' : 'exit'
        );

        // Update employee state
        if (result.employee) {
          const idx = employees.findIndex(e => e.id === result.employee.id);
          if (idx !== -1) employees[idx] = result.employee;
          selectEmployee(result.employee.id);
        }
      }
    } catch (err) {
      playScannerBuzz();
      showToast(`Scan Failed: ${err.message}`, 'error');
    } finally {
      btnSimulateTap.disabled = false;
    }
  }

  // Event Listeners
  selector.addEventListener('change', () => selectEmployee(selector.value));
  btnSimulateTap.addEventListener('click', handleCardTap);
  btnRefreshLogs.addEventListener('click', () => {
    if (currentEmployee) loadEmployeeLogs(currentEmployee.id);
  });

  loadEmployees();

})();

/**
 * frontend/employee/employee.js
 * 
 * Authenticated Employee Personal Portal Controller for SmartWorkforce.
 * Strict Session-Derived Identity: Renders personal profile, company affiliation,
 * contactless smart badge state, verified presence, and personal attendance history.
 * Enforces mandatory first-login password-change flow.
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

  let currentEmployee = null;
  let isMandatoryPasswordChange = false;

  // DOM Elements - Profile & Smart Badge
  const empCompanyName = document.getElementById('empCompanyName');
  const empCompanyMeta = document.getElementById('empCompanyMeta');
  const badgeAvatar = document.getElementById('badgeAvatar');
  const badgeName = document.getElementById('badgeName');
  const badgeRole = document.getElementById('badgeRole');
  const badgeUidText = document.getElementById('badgeUidText');
  const badgeUidStatus = document.getElementById('badgeUidStatus');
  const badgeEmpId = document.getElementById('badgeEmpId');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusLastSeen = document.getElementById('statusLastSeen');

  // DOM Elements - Interactive Tap & History
  const tapGateSelect = document.getElementById('tapGateSelect');
  const tapModeSelect = document.getElementById('tapModeSelect');
  const btnSimulateTap = document.getElementById('btnSimulateTap');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  const empLogsTbody = document.getElementById('empLogsTbody');
  const btnSignOut = document.getElementById('btnSignOut');

  // DOM Elements - Password Change Modal
  const passwordChangeModal = document.getElementById('passwordChangeModal');
  const passwordChangeForm = document.getElementById('passwordChangeForm');
  const pwdCurrentInput = document.getElementById('pwdCurrentInput');
  const pwdNewInput = document.getElementById('pwdNewInput');
  const pwdConfirmInput = document.getElementById('pwdConfirmInput');
  const pwdStatusBanner = document.getElementById('pwdStatusBanner');
  const btnSavePassword = document.getElementById('btnSavePassword');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnOpenPasswordModal = document.getElementById('btnOpenPasswordModal');

  // Initialize clock and theme
  initLiveClock('empLiveClock');
  initThemeToggle('themeToggle');

  /**
   * Load authenticated employee personal dashboard data
   */
  async function loadDashboard() {
    try {
      const data = await api.getEmployeeMe();
      if (!data || !data.employee) {
        throw new Error('Invalid employee payload received.');
      }

      currentEmployee = data.employee;
      if (data.csrfToken) {
        window.__swCsrfToken = data.csrfToken;
      }

      renderProfile(data.employee);
      await loadAttendanceLogs();

      // Check if user arrived via change-password URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'change-password') {
        openPasswordModal(false);
      }

    } catch (err) {
      console.error('Employee dashboard load error:', err);

      // Check for mandatory password change response (403 PASSWORD_CHANGE_REQUIRED)
      if (err.status === 403 && (err.data?.code === 'PASSWORD_CHANGE_REQUIRED' || err.data?.mustChangePassword)) {
        isMandatoryPasswordChange = true;
        if (err.data.name) {
          badgeName.textContent = err.data.name;
          badgeEmpId.textContent = err.data.employeeId || '--';
        }
        openPasswordModal(true);
        return;
      }

      // Check for authentication failure
      if (err.status === 401) {
        showToast('Session expired or authentication required. Redirecting to login...', 'warning');
        setTimeout(() => {
          window.location.href = '/login?redirect=/employee';
        }, 1000);
        return;
      }

      showToast(`Failed to load profile: ${err.message}`, 'error');
    }
  }

  /**
   * Render personal profile onto contactless smart badge and UI cards
   */
  function renderProfile(emp) {
    if (empCompanyName) empCompanyName.textContent = emp.companyName || 'Corporate Workforce';
    if (empCompanyMeta) empCompanyMeta.textContent = `${emp.department} • Company ID: ${emp.companyId}`;

    if (badgeAvatar) {
      badgeAvatar.textContent = getInitials(emp.name);
      badgeAvatar.style.backgroundColor = emp.avatarBg || '#0284C7';
    }
    if (badgeName) badgeName.textContent = emp.name;
    if (badgeRole) badgeRole.textContent = `${emp.designation || 'Workforce Member'} • ${emp.department}`;
    if (badgeEmpId) badgeEmpId.textContent = emp.id;

    if (emp.cardUid) {
      if (badgeUidText) badgeUidText.textContent = emp.cardUid;
      if (badgeUidStatus) {
        badgeUidStatus.className = 'card-uid-status active';
        badgeUidStatus.textContent = 'ACTIVE';
      }
    } else {
      if (badgeUidText) badgeUidText.textContent = 'NO CARD ASSIGNED';
      if (badgeUidStatus) {
        badgeUidStatus.className = 'card-uid-status unassigned';
        badgeUidStatus.textContent = 'UNASSIGNED';
      }
    }

    const isInside = emp.status === 'INSIDE';
    if (statusDot) {
      statusDot.className = `status-indicator ${isInside ? 'status-inside' : 'status-outside'}`;
    }
    if (statusText) {
      statusText.textContent = isInside ? 'INSIDE FACILITY' : 'OUTSIDE PREMISES';
      statusText.style.color = isInside ? 'var(--status-inside)' : 'var(--status-outside)';
    }
    if (statusLastSeen) {
      statusLastSeen.textContent = emp.lastSeen || 'Not detected today';
    }
  }

  /**
   * Load personal attendance activity logs (Strictly scoped to session)
   */
  async function loadAttendanceLogs() {
    if (!empLogsTbody) return;

    try {
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">Fetching verified records...</td></tr>`;
      const logs = await api.getEmployeeAttendance();

      if (!logs || logs.length === 0) {
        empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No personal attendance events recorded yet. Tap your card above to punch in.</td></tr>`;
        return;
      }

      empLogsTbody.innerHTML = logs.map(l => {
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
      console.error('Failed to load employee attendance logs:', err);
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-danger); padding: 20px;">Error loading personal logs.</td></tr>`;
    }
  }

  /**
   * Simulate contactless card tap presentation at target gate
   */
  async function handleCardTap() {
    if (!currentEmployee) {
      showToast('Profile not loaded. Please wait.', 'warning');
      return;
    }

    btnSimulateTap.disabled = true;
    const gate = tapGateSelect ? tapGateSelect.value : 'Gate 01 - Main Facility Turnstile';
    const mode = tapModeSelect ? tapModeSelect.value : 'AUTO';

    try {
      const result = await api.employeeTapCard({ gate, mode });

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

        if (result.employee) {
          currentEmployee = result.employee;
          renderProfile(result.employee);
        }
        await loadAttendanceLogs();
      }
    } catch (err) {
      playScannerBuzz();
      showToast(`Scan Failed: ${err.message}`, 'error');
    } finally {
      btnSimulateTap.disabled = false;
    }
  }

  /**
   * Password Change Modal Controls
   */
  function openPasswordModal(mandatory = false) {
    isMandatoryPasswordChange = mandatory;
    if (pwdStatusBanner) {
      pwdStatusBanner.style.display = 'none';
      pwdStatusBanner.className = 'modal-feedback';
    }
    if (pwdCurrentInput) pwdCurrentInput.value = '';
    if (pwdNewInput) pwdNewInput.value = '';
    if (pwdConfirmInput) pwdConfirmInput.value = '';

    const modalTitle = document.getElementById('modalTitle');
    const modalSub = document.getElementById('modalSub');

    if (mandatory) {
      if (modalTitle) modalTitle.textContent = 'Mandatory First-Login Password Change';
      if (modalSub) modalSub.textContent = 'For compliance and security, you must replace your temporary password with a secure permanent password before you can view your dashboard.';
      if (btnCancelModal) btnCancelModal.style.display = 'none';
    } else {
      if (modalTitle) modalTitle.textContent = 'Update Portal Password';
      if (modalSub) modalSub.textContent = 'Change your personal password used to access the SmartWorkforce Employee Portal.';
      if (btnCancelModal) btnCancelModal.style.display = 'block';
    }

    if (passwordChangeModal) passwordChangeModal.classList.remove('hidden');
    if (pwdCurrentInput) pwdCurrentInput.focus();
  }

  function closePasswordModal() {
    if (isMandatoryPasswordChange) return; // Cannot close if mandatory
    if (passwordChangeModal) passwordChangeModal.classList.add('hidden');
  }

  /**
   * Handle Password Change Form Submission
   */
  if (passwordChangeForm) {
    passwordChangeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPw = pwdCurrentInput.value;
      const newPw = pwdNewInput.value;
      const confirmPw = pwdConfirmInput.value;

      if (!currentPw || !newPw || !confirmPw) {
        pwdStatusBanner.className = 'modal-feedback error';
        pwdStatusBanner.textContent = '⚠️ All password fields are required.';
        pwdStatusBanner.style.display = 'block';
        return;
      }

      if (newPw.length < 8) {
        pwdStatusBanner.className = 'modal-feedback error';
        pwdStatusBanner.textContent = '⚠️ New password must be at least 8 characters long.';
        pwdStatusBanner.style.display = 'block';
        return;
      }

      if (newPw !== confirmPw) {
        pwdStatusBanner.className = 'modal-feedback error';
        pwdStatusBanner.textContent = '⚠️ New password and confirmation do not match.';
        pwdStatusBanner.style.display = 'block';
        return;
      }

      if (newPw === currentPw) {
        pwdStatusBanner.className = 'modal-feedback error';
        pwdStatusBanner.textContent = '⚠️ New password must be different from current temporary password.';
        pwdStatusBanner.style.display = 'block';
        return;
      }

      btnSavePassword.disabled = true;
      btnSavePassword.textContent = 'Updating Password...';

      try {
        const result = await api.changeEmployeePassword({
          currentPassword: currentPw,
          newPassword: newPw,
          confirmPassword: confirmPw
        });

        pwdStatusBanner.className = 'modal-feedback success';
        pwdStatusBanner.textContent = '✓ ' + (result.message || 'Password successfully updated.');
        pwdStatusBanner.style.display = 'block';
        showToast('Password updated successfully. Loading dashboard...', 'entry');

        isMandatoryPasswordChange = false;

        // Clean URL if ?action=change-password
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        setTimeout(() => {
          if (passwordChangeModal) passwordChangeModal.classList.add('hidden');
          btnSavePassword.disabled = false;
          btnSavePassword.textContent = 'Save Password & Continue';
          loadDashboard();
        }, 800);

      } catch (err) {
        pwdStatusBanner.className = 'modal-feedback error';
        pwdStatusBanner.textContent = `⚠️ Error: ${err.message}`;
        pwdStatusBanner.style.display = 'block';
        btnSavePassword.disabled = false;
        btnSavePassword.textContent = 'Save Password & Continue';
      }
    });
  }

  /**
   * Server-side Session Termination & Logout
   */
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      try {
        await api.logout();
      } catch (_) {}
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = '/login';
      }, 300);
    });
  }

  // Event Listeners
  if (btnSimulateTap) btnSimulateTap.addEventListener('click', handleCardTap);
  if (btnRefreshLogs) btnRefreshLogs.addEventListener('click', loadAttendanceLogs);
  if (btnOpenPasswordModal) btnOpenPasswordModal.addEventListener('click', () => openPasswordModal(false));
  if (btnCancelModal) btnCancelModal.addEventListener('click', closePasswordModal);

  // Initialize Dashboard
  loadDashboard();

})();

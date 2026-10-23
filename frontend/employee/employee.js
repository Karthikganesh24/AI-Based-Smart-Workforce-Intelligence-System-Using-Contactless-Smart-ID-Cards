/**
 * frontend/employee/employee.js
 * 
 * Authenticated Employee Personal Portal Controller for SmartWorkforce.
 * Design 4: Minimal (Clean & Simple) Enterprise Architecture.
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
  let currentTeamMembers = [];
  let currentTeamFilter = 'all';
  let teamSearchQuery = '';
  let userPermissions = {};

  // DOM Elements - Navigation & Header
  const navItemDashboard = document.getElementById('navItemDashboard');
  const navItemProfile = document.getElementById('navItemProfile');
  const navItemAttendance = document.getElementById('navItemAttendance');
  const navItemTeam = document.getElementById('navItemTeam');
  const navItemTeamText = document.getElementById('navItemTeamText');
  const headerAvatar = document.getElementById('headerAvatar');
  const headerName = document.getElementById('headerName');
  const headerRole = document.getElementById('headerRole');

  // DOM Elements - Welcome Banner
  const welcomeDate = document.getElementById('welcomeDate');
  const welcomeGreeting = document.getElementById('welcomeGreeting');

  // DOM Elements - Profile & Smart Badge
  const empCompanyName = document.getElementById('empCompanyName');
  const empCompanyMeta = document.getElementById('empCompanyMeta');
  const empJobTitle = document.getElementById('empJobTitle');
  const empOrgUnit = document.getElementById('empOrgUnit');
  const empReportingManager = document.getElementById('empReportingManager');
  const empAccessRole = document.getElementById('empAccessRole');
  const empReportingChainBox = document.getElementById('empReportingChainBox');
  const empChainFlow = document.getElementById('empChainFlow');
  const empChainCountBadge = document.getElementById('empChainCountBadge');
  const badgeAvatar = document.getElementById('badgeAvatar');
  const badgeName = document.getElementById('badgeName');
  const badgeRole = document.getElementById('badgeRole');
  const badgeUidText = document.getElementById('badgeUidText');
  const badgeUidStatus = document.getElementById('badgeUidStatus');
  const badgeEmpId = document.getElementById('badgeEmpId');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusLastSeen = document.getElementById('statusLastSeen');
  const badgeStatusBanner = document.getElementById('badgeStatusBanner');
  const badgeStatusPulse = document.getElementById('badgeStatusPulse');
  const badgeStatusText = document.getElementById('badgeStatusText');
  const badgeStatusSince = document.getElementById('badgeStatusSince');

  // DOM Elements - Overview 4-KPI Row
  const kpiTodayEntries = document.getElementById('kpiTodayEntries');
  const kpiTodayExits = document.getElementById('kpiTodayExits');
  const kpiLastGate = document.getElementById('kpiLastGate');
  const kpiLastGateTime = document.getElementById('kpiLastGateTime');

  // DOM Elements - Interactive Tap & History
  const tapGateSelect = document.getElementById('tapGateSelect');
  const tapModeSelect = document.getElementById('tapModeSelect');
  const btnSimulateTap = document.getElementById('btnSimulateTap');
  const terminalFeedbackScreen = document.getElementById('terminalFeedbackScreen');
  const terminalFeedbackIcon = document.getElementById('terminalFeedbackIcon');
  const terminalFeedbackTitle = document.getElementById('terminalFeedbackTitle');
  const terminalFeedbackDesc = document.getElementById('terminalFeedbackDesc');
  const terminalFeedbackBadge = document.getElementById('terminalFeedbackBadge');

  const historyCountBadge = document.getElementById('historyCountBadge');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  const empLogsTbody = document.getElementById('empLogsTbody');
  const btnSignOut = document.getElementById('btnSignOut');

  // DOM Elements - Phase 5 My Team & Manager Portal
  const sectionMyTeam = document.getElementById('sectionMyTeam');
  const teamSectionHeading = document.getElementById('teamSectionHeading');
  const teamScopeBadge = document.getElementById('teamScopeBadge');
  const btnFilterAll = document.getElementById('btnFilterAll');
  const btnFilterDirect = document.getElementById('btnFilterDirect');
  const btnFilterIndirect = document.getElementById('btnFilterIndirect');
  const countAll = document.getElementById('countAll');
  const countDirect = document.getElementById('countDirect');
  const countIndirect = document.getElementById('countIndirect');
  const btnRefreshTeam = document.getElementById('btnRefreshTeam');
  const teamKpiGrid = document.getElementById('teamKpiGrid');
  const teamKpiTotal = document.getElementById('teamKpiTotal');
  const teamKpiTotalSub = document.getElementById('teamKpiTotalSub');
  const teamKpiInside = document.getElementById('teamKpiInside');
  const teamKpiOutside = document.getElementById('teamKpiOutside');
  const teamKpiOccupancy = document.getElementById('teamKpiOccupancy');
  const teamDeptBreakdown = document.getElementById('teamDeptBreakdown');
  const teamDeptChips = document.getElementById('teamDeptChips');
  const teamSearchInput = document.getElementById('teamSearchInput');
  const teamEmptyState = document.getElementById('teamEmptyState');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');
  const teamTableWrap = document.getElementById('teamTableWrap');
  const teamTable = document.getElementById('teamTable');
  const teamTbody = document.getElementById('teamTbody');

  // DOM Elements - Authorized Member Profile Modal
  const memberProfileModal = document.getElementById('memberProfileModal');
  const btnMemberModalClose = document.getElementById('btnMemberModalClose');
  const btnMemberModalDismiss = document.getElementById('btnMemberModalDismiss');
  const memberModalAvatar = document.getElementById('memberModalAvatar');
  const memberModalName = document.getElementById('memberModalName');
  const memberModalRelationBadge = document.getElementById('memberModalRelationBadge');
  const memberModalId = document.getElementById('memberModalId');
  const memberModalJobTitle = document.getElementById('memberModalJobTitle');
  const memberModalOrgUnit = document.getElementById('memberModalOrgUnit');
  const memberModalDept = document.getElementById('memberModalDept');
  const memberModalManager = document.getElementById('memberModalManager');
  const memberModalRole = document.getElementById('memberModalRole');
  const memberModalCardUid = document.getElementById('memberModalCardUid');
  const memberModalPresence = document.getElementById('memberModalPresence');
  const memberModalChainFlow = document.getElementById('memberModalChainFlow');
  const memberModalAttendanceTbody = document.getElementById('memberModalAttendanceTbody');

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

  // Initialize clock and theme (Design 4 defaults to light)
  initLiveClock('empLiveClock');
  initThemeToggle('themeToggle', 'light');

  // Navigation Links
  function setActiveNav(item) {
    [navItemDashboard, navItemProfile, navItemAttendance, navItemTeam].forEach(el => {
      if (el) el.classList.remove('active');
    });
    if (item) item.classList.add('active');
  }

  if (navItemDashboard) {
    navItemDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(navItemDashboard);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (navItemProfile) {
    navItemProfile.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(navItemProfile);
      const target = document.getElementById('cardEmployeeProfile');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (navItemAttendance) {
    navItemAttendance.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(navItemAttendance);
      const target = document.getElementById('cardAttendanceHistory');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (navItemTeam) {
    navItemTeam.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(navItemTeam);
      if (sectionMyTeam) sectionMyTeam.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Update date header
  function updateDateHeader() {
    if (welcomeDate) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
      welcomeDate.textContent = `${dateStr} • VERIFIED SESSION`;
    }
  }

  /**
   * Load authenticated employee personal dashboard data
   */
  async function loadDashboard() {
    updateDateHeader();
    try {
      const data = await api.getEmployeeMe();
      if (!data || !data.employee) {
        throw new Error('Invalid employee payload received.');
      }

      currentEmployee = data.employee;
      userPermissions = data.permissions || {};
      if (data.csrfToken) {
        window.__swCsrfToken = data.csrfToken;
      }

      renderProfile(data.employee, data.reportingChain);
      await loadAttendanceLogs();

      // Feature 2 & 3: Permission-driven team and management access
      const empScope = userPermissions['employees:view'] || 'SELF';
      const hasDirectReports = (data.directReportsCount > 0) || Boolean(data.hasSubordinates);
      const hasTeamPrivilege = hasDirectReports || ['DIRECT_REPORTS', 'DESCENDANTS', 'DEPARTMENT', 'COMPANY'].includes(empScope);

      if (hasTeamPrivilege) {
        if (navItemTeam) navItemTeam.style.display = 'flex';
        if (sectionMyTeam) sectionMyTeam.style.display = 'block';

        if (teamScopeBadge) {
          const scopeLabels = {
            'DIRECT_REPORTS': 'Direct Reports Scope',
            'DESCENDANTS': 'Descendants Scope',
            'DEPARTMENT': 'Department Scope',
            'COMPANY': 'Enterprise Scope'
          };
          teamScopeBadge.textContent = scopeLabels[empScope] || 'Team Scope';
        }

        const isDeptLevel = ['DEPARTMENT', 'COMPANY', 'DESCENDANTS'].includes(empScope) ||
                            ['DEPARTMENT', 'COMPANY'].includes(userPermissions['analytics:view']);

        if (teamSectionHeading) {
          teamSectionHeading.textContent = isDeptLevel ? 'Department & Team Workforce' : 'My Team';
        }
        if (navItemTeamText) {
          navItemTeamText.textContent = isDeptLevel ? 'Team & Dept' : 'My Team';
        }

        await loadTeamData(userPermissions);
      } else {
        if (navItemTeam) navItemTeam.style.display = 'none';
        if (sectionMyTeam) sectionMyTeam.style.display = 'none';
      }

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
          if (badgeName) badgeName.textContent = err.data.name;
          if (badgeEmpId) badgeEmpId.textContent = err.data.employeeId || '--';
          if (welcomeGreeting) welcomeGreeting.textContent = `Welcome, ${err.data.name}`;
          if (headerName) headerName.textContent = err.data.name;
          if (headerAvatar) headerAvatar.textContent = getInitials(err.data.name);
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
  function renderProfile(emp, reportingChain = []) {
    const initials = getInitials(emp.name);
    const bg = emp.avatarBg || '#0284C7';

    // Header Capsule
    if (headerAvatar) {
      headerAvatar.textContent = initials;
      headerAvatar.style.backgroundColor = bg;
    }
    if (headerName) headerName.textContent = emp.name;
    if (headerRole) headerRole.textContent = emp.jobTitle || emp.designation || emp.role || 'Workforce Member';

    // Welcome Greeting
    if (welcomeGreeting) {
      welcomeGreeting.textContent = `Welcome back, ${emp.name || 'Workforce Member'}`;
    }

    // Company Affiliation & Scope
    if (empCompanyName) empCompanyName.textContent = emp.companyName || 'Corporate Workforce';
    if (empCompanyMeta) empCompanyMeta.textContent = `${emp.orgUnitName || emp.department || 'Operations'} • Company ID: ${emp.companyId || '--'}`;

    // Employee Badge Card
    if (badgeAvatar) {
      badgeAvatar.textContent = initials;
      badgeAvatar.style.backgroundColor = bg;
    }
    if (badgeName) badgeName.textContent = emp.name;
    if (badgeRole) badgeRole.textContent = `${emp.jobTitle || emp.designation || emp.role || 'Workforce Member'} • ${emp.orgUnitName || emp.department || 'Operations'}`;
    if (badgeEmpId) badgeEmpId.textContent = emp.id;

    // Feature 1: Detailed Profile Fields
    if (empJobTitle) {
      empJobTitle.textContent = emp.jobTitle || emp.jobTitleName || emp.designation || emp.role || 'Workforce Member';
    }
    if (empOrgUnit) {
      empOrgUnit.textContent = emp.orgUnitName || 'Not Assigned';
    }
    if (empReportingManager) {
      empReportingManager.textContent = emp.managerName ? `${emp.managerName} (${emp.managerId})` : 'Direct to Top Leadership / Root';
    }
    if (empAccessRole) {
      empAccessRole.textContent = emp.accessRoleName || emp.role || 'Employee';
    }

    // Render Reporting Hierarchy Breadcrumb
    renderReportingChain(reportingChain || []);

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

    // Update KPI Presence card
    if (statusDot) {
      statusDot.className = `status-indicator ${isInside ? 'status-inside' : 'status-outside'}`;
    }
    if (statusText) {
      statusText.textContent = isInside ? 'INSIDE FACILITY' : 'OUTSIDE PREMISES';
      statusText.style.color = isInside ? 'var(--emp-emerald-text)' : 'var(--emp-amber-text)';
    }
    if (statusLastSeen) {
      statusLastSeen.textContent = emp.lastSeen || 'Not detected today';
    }

    // Update Badge Status Banner
    if (badgeStatusBanner) {
      badgeStatusBanner.className = `badge-status-banner ${isInside ? '' : 'is-outside'}`;
    }
    if (badgeStatusText) {
      badgeStatusText.textContent = isInside ? 'INSIDE FACILITY' : 'OUTSIDE PREMISES';
    }
    if (badgeStatusSince) {
      badgeStatusSince.textContent = emp.lastSeen ? `Last scan: ${emp.lastSeen}` : 'No scans logged today';
    }
  }

  /**
   * Render upward reporting lineage breadcrumb (Feature 1)
   */
  function renderReportingChain(chain) {
    if (!empChainFlow) return;

    if (!Array.isArray(chain) || chain.length === 0) {
      if (empChainCountBadge) empChainCountBadge.textContent = 'Top Level';
      empChainFlow.innerHTML = '<span style="font-size: 0.8rem; color: var(--emp-text-muted);">Top-level executive (No superior manager assigned)</span>';
      return;
    }

    if (chain.length === 1) {
      if (empChainCountBadge) empChainCountBadge.textContent = 'Root Level';
      const selfNode = chain[0];
      const title = selfNode.jobTitleName || selfNode.role || 'Executive';
      empChainFlow.innerHTML = `
        <div class="chain-step-pill is-current" title="${escapeHtml(selfNode.name)} (${escapeHtml(selfNode.id)})">
          <span class="chain-step-title">${escapeHtml(title)}:</span>
          <span class="chain-step-name">${escapeHtml(selfNode.name)} (You)</span>
        </div>
        <span style="font-size: 0.75rem; color: var(--emp-text-muted); margin-left: 6px;">• Top-level organization lead</span>
      `;
      return;
    }

    if (empChainCountBadge) {
      empChainCountBadge.textContent = `${chain.length} Tiers Lineage`;
    }

    // Chain is ordered depth ASC (0 = self, 1 = manager, 2 = director, ...).
    // Reverse it to display top-down lineage: Executive -> Director -> Manager -> Self (You)
    const flow = [...chain].reverse();
    empChainFlow.innerHTML = flow.map((node, idx) => {
      const isMe = node.id === currentEmployee?.id;
      const title = node.jobTitleName || node.role || (isMe ? 'Member' : 'Manager');
      const pill = `
        <div class="chain-step-pill ${isMe ? 'is-current' : ''}" title="${escapeHtml(node.name)} (${escapeHtml(node.id)})">
          <span class="chain-step-title">${escapeHtml(title)}:</span>
          <span class="chain-step-name">${escapeHtml(node.name)}${isMe ? ' (You)' : ''}</span>
        </div>
      `;
      const arrow = (idx < flow.length - 1) ? '<span class="chain-arrow">→</span>' : '';
      return pill + arrow;
    }).join('');
  }

  /**
   * Load team roster & analytics metrics (Feature 2 & 3)
   */
  async function loadTeamData(perms = {}) {
    if (!teamTbody) return;

    try {
      teamTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--emp-text-muted); padding: 20px;">Fetching authorized team roster...</td></tr>';

      // 1. Fetch team roster (scoped strictly by backend access control)
      const members = await api.getTeamRoster();
      currentTeamMembers = Array.isArray(members) ? members : [];

      // 2. Compute counts
      const directCount = currentTeamMembers.filter(m => m.isDirectReport).length;
      const indirectCount = currentTeamMembers.filter(m => !m.isDirectReport && m.id !== currentEmployee?.id).length;

      if (countAll) countAll.textContent = currentTeamMembers.length;
      if (countDirect) countDirect.textContent = directCount;
      if (countIndirect) {
        countIndirect.textContent = indirectCount;
        if (btnFilterIndirect) {
          btnFilterIndirect.style.display = indirectCount > 0 ? 'inline-block' : 'none';
        }
      }

      // 3. Team Analytics & Summaries
      const hasAnalyticsScope = ['DIRECT_REPORTS', 'DESCENDANTS', 'DEPARTMENT', 'COMPANY'].includes(perms['analytics:view']);
      if (hasAnalyticsScope) {
        try {
          const analyticsData = await api.getTeamAnalytics();
          if (analyticsData && analyticsData.teamSummary) {
            const summary = analyticsData.teamSummary;
            if (teamKpiTotal) teamKpiTotal.textContent = summary.totalMembers ?? currentTeamMembers.length;
            if (teamKpiInside) teamKpiInside.textContent = summary.insideCount ?? 0;
            if (teamKpiOutside) teamKpiOutside.textContent = summary.outsideCount ?? 0;
            if (teamKpiOccupancy) teamKpiOccupancy.textContent = `${summary.occupancyRatePercent ?? 0}%`;
          }

          // Render department distribution chips if available
          if (teamDeptBreakdown && teamDeptChips && analyticsData.departmentBreakdown) {
            const depts = Object.entries(analyticsData.departmentBreakdown);
            if (depts.length > 1) {
              teamDeptChips.innerHTML = depts.map(([d, count]) => `
                <span class="team-dept-chip">
                  <strong>${escapeHtml(d)}:</strong> ${count} ${count === 1 ? 'member' : 'members'}
                </span>
              `).join('');
              teamDeptBreakdown.style.display = 'block';
            } else {
              teamDeptBreakdown.style.display = 'none';
            }
          }
        } catch (analyticsErr) {
          // Graceful fallback: compute simple metrics from roster
          computeRosterStatsFallback();
        }
      } else {
        // Simple fallback from team roster directly
        computeRosterStatsFallback();
        if (teamDeptBreakdown) teamDeptBreakdown.style.display = 'none';
      }

      renderTeamTable();

    } catch (err) {
      console.error('Failed to load team data:', err);
      if (teamTbody) {
        teamTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--emp-rose-text); padding: 20px;">Error loading team roster: ${escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  function computeRosterStatsFallback() {
    const total = currentTeamMembers.length;
    const inside = currentTeamMembers.filter(m => m.status === 'INSIDE').length;
    const outside = currentTeamMembers.filter(m => m.status !== 'INSIDE').length;
    const rate = total ? Math.round((inside / total) * 100) : 0;

    if (teamKpiTotal) teamKpiTotal.textContent = total;
    if (teamKpiInside) teamKpiInside.textContent = inside;
    if (teamKpiOutside) teamKpiOutside.textContent = outside;
    if (teamKpiOccupancy) teamKpiOccupancy.textContent = `${rate}%`;
  }

  /**
   * Render filtered and searched team table rows
   */
  function renderTeamTable() {
    if (!teamTbody) return;

    if (currentTeamMembers.length === 0) {
      if (teamEmptyState) teamEmptyState.style.display = 'block';
      if (teamTableWrap) teamTableWrap.style.display = 'none';
      return;
    }

    if (teamEmptyState) teamEmptyState.style.display = 'none';
    if (teamTableWrap) teamTableWrap.style.display = 'block';

    let filtered = currentTeamMembers;

    // Filter by tab pill
    if (currentTeamFilter === 'direct') {
      filtered = filtered.filter(m => m.isDirectReport);
    } else if (currentTeamFilter === 'indirect') {
      filtered = filtered.filter(m => !m.isDirectReport && m.id !== currentEmployee?.id);
    }

    // Filter by search query
    if (teamSearchQuery) {
      filtered = filtered.filter(m => {
        const text = [
          m.name,
          m.id,
          m.role,
          m.jobTitleName,
          m.orgUnitName,
          m.department,
          m.managerName
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(teamSearchQuery);
      });
    }

    if (filtered.length === 0) {
      teamTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--emp-text-muted); padding: 24px;">No team members match the current filter or search criteria.</td></tr>';
      return;
    }

    teamTbody.innerHTML = filtered.map(m => {
      const isMe = m.id === currentEmployee?.id;
      const initials = getInitials(m.name);
      const bg = m.avatarBg || '#0284C7';
      const isInside = m.status === 'INSIDE';
      const statusBadge = isInside
        ? '<span class="badge badge-entry">🟢 INSIDE</span>'
        : '<span class="badge badge-exit">⚪ OUTSIDE</span>';
      
      const relationBadge = m.isDirectReport
        ? '<span class="badge badge-direct">✓ Direct Report</span>'
        : (isMe
          ? '<span class="badge badge-entry">Manager (You)</span>'
          : `<span class="badge badge-indirect">Indirect Report • Reports to ${escapeHtml(m.managerName || 'Manager')}</span>`);

      const roleUnit = `${escapeHtml(m.jobTitleName || m.role || 'Staff')} • ${escapeHtml(m.orgUnitName || m.department || 'Operations')}`;
      
      const gateText = m.lastGate
        ? `${escapeHtml(m.lastGate)} <span style="font-size: 0.72rem; color: var(--emp-text-muted);">(${escapeHtml(m.lastEventType || 'DETECTED')})</span>`
        : '<span style="color: var(--emp-text-muted); font-size: 0.78rem;">No scan today</span>';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="badge-avatar-wrap" style="width: 32px; height: 32px; font-size: 0.75rem; background-color: ${escapeHtml(bg)}; flex-shrink: 0;">${escapeHtml(initials)}</div>
              <div style="min-width: 0;">
                <div style="font-weight: 600; font-size: 0.88rem; color: var(--emp-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(m.name)}${isMe ? ' (You)' : ''}</div>
                <div style="font-family: var(--font-family-mono); font-size: 0.72rem; color: var(--emp-text-muted);">${escapeHtml(m.id)}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.85rem; font-weight: 500;">${roleUnit}</div>
          </td>
          <td>
            <div>${relationBadge}</div>
          </td>
          <td>
            <div>${statusBadge}</div>
            <div style="font-size: 0.7rem; color: var(--emp-text-muted); margin-top: 2px;">${escapeHtml(m.lastSeen || 'Not detected')}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem;">${gateText}</div>
          </td>
          <td>
            <button type="button" class="btn-view-member" data-id="${escapeHtml(m.id)}" title="View authorized profile & attendance">
              View Profile
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listeners to View Profile buttons
    teamTbody.querySelectorAll('.btn-view-member').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-id');
        if (empId) openMemberProfileModal(empId);
      });
    });
  }

  /**
   * Open Authorized Team Member Profile Modal (Feature 2 & 3)
   */
  async function openMemberProfileModal(empId) {
    if (!memberProfileModal) return;

    // Reset fields to loading state
    if (memberModalName) memberModalName.textContent = 'Loading profile...';
    if (memberModalId) memberModalId.textContent = empId;
    if (memberModalJobTitle) memberModalJobTitle.textContent = '--';
    if (memberModalOrgUnit) memberModalOrgUnit.textContent = '--';
    if (memberModalDept) memberModalDept.textContent = '--';
    if (memberModalManager) memberModalManager.textContent = '--';
    if (memberModalRole) memberModalRole.textContent = '--';
    if (memberModalCardUid) memberModalCardUid.textContent = '--';
    if (memberModalPresence) memberModalPresence.textContent = 'Checking...';
    if (memberModalChainFlow) memberModalChainFlow.innerHTML = '<span style="font-size: 0.78rem; color: var(--emp-text-muted);">Loading reporting lineage...</span>';
    if (memberModalAttendanceTbody) memberModalAttendanceTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--emp-text-muted); padding: 12px;">Loading recent attendance events...</td></tr>';

    memberProfileModal.classList.remove('hidden');

    try {
      const member = await api.getEmployee(empId);
      if (!member) throw new Error('Member not found.');

      const isDirect = (member.managerId === currentEmployee?.id);

      if (memberModalAvatar) {
        memberModalAvatar.textContent = getInitials(member.name);
        memberModalAvatar.style.backgroundColor = member.avatarBg || '#0284C7';
      }
      if (memberModalName) memberModalName.textContent = member.name;
      if (memberModalRelationBadge) {
        if (isDirect) {
          memberModalRelationBadge.className = 'badge badge-direct';
          memberModalRelationBadge.textContent = '✓ Direct Report';
        } else if (member.id === currentEmployee?.id) {
          memberModalRelationBadge.className = 'badge badge-entry';
          memberModalRelationBadge.textContent = 'Manager (You)';
        } else {
          memberModalRelationBadge.className = 'badge badge-indirect';
          memberModalRelationBadge.textContent = `Indirect Report • Reports to ${member.managerName || 'Manager'}`;
        }
      }

      if (memberModalId) memberModalId.textContent = member.id;
      if (memberModalJobTitle) memberModalJobTitle.textContent = member.jobTitleName || member.role || 'Staff';
      if (memberModalOrgUnit) memberModalOrgUnit.textContent = member.orgUnitName || 'Not Assigned';
      if (memberModalDept) memberModalDept.textContent = member.department || 'Operations';
      if (memberModalManager) memberModalManager.textContent = member.managerName ? `${member.managerName} (${member.managerId})` : 'Direct to Top Leadership';
      if (memberModalRole) memberModalRole.textContent = member.accessRoleName || 'Employee';
      if (memberModalCardUid) memberModalCardUid.textContent = member.uid || 'No Card Assigned';
      if (memberModalPresence) {
        const isInside = member.status === 'INSIDE';
        memberModalPresence.innerHTML = `
          <span class="badge ${isInside ? 'badge-entry' : 'badge-exit'}">${isInside ? '🟢 INSIDE' : '⚪ OUTSIDE'}</span>
          <span style="font-size: 0.72rem; color: var(--emp-text-muted); margin-left: 6px;">${escapeHtml(member.lastSeen || 'Not detected')}</span>
        `;
      }

      // Upward reporting chain
      let chain = member.reportingChain;
      if (!chain || chain.length === 0) {
        try {
          chain = await api.getEmployeeReporting(empId);
        } catch (_) {
          chain = [];
        }
      }

      if (memberModalChainFlow) {
        if (Array.isArray(chain) && chain.length > 0) {
          const flow = [...chain].reverse();
          memberModalChainFlow.innerHTML = flow.map((node, idx) => {
            const isTarget = node.id === member.id;
            const role = node.jobTitleName || node.role || 'Leader';
            const pill = `
              <div class="chain-step-pill ${isTarget ? 'is-current' : ''}" style="font-size: 0.75rem; padding: 3px 8px;">
                <span class="chain-step-title">${escapeHtml(role)}:</span>
                <span class="chain-step-name">${escapeHtml(node.name)}</span>
              </div>
            `;
            const arrow = (idx < flow.length - 1) ? '<span class="chain-arrow">→</span>' : '';
            return pill + arrow;
          }).join('');
        } else {
          memberModalChainFlow.innerHTML = '<span style="font-size: 0.78rem; color: var(--emp-text-muted);">No reporting ancestors recorded.</span>';
        }
      }

      // Recent attendance logs
      if (memberModalAttendanceTbody) {
        const events = member.recentAttendance || [];
        if (events.length === 0) {
          memberModalAttendanceTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--emp-text-muted); padding: 12px;">No attendance events recorded today.</td></tr>';
        } else {
          memberModalAttendanceTbody.innerHTML = events.map(evt => {
            const isEntry = evt.eventType === 'ENTRY';
            const badgeClass = isEntry ? 'badge-entry' : 'badge-exit';
            return `
              <tr>
                <td style="font-family: var(--font-family-mono); font-size: 0.75rem;">${escapeHtml(evt.timestamp)}</td>
                <td style="font-weight: 500;">${escapeHtml(evt.gate)}</td>
                <td><span class="badge ${badgeClass}" style="font-size: 0.7rem; padding: 2px 6px;">${escapeHtml(evt.eventType)}</span></td>
                <td><span class="badge badge-verified" style="font-size: 0.7rem; padding: 2px 6px;">✓ ${escapeHtml(evt.status || 'VERIFIED')}</span></td>
              </tr>
            `;
          }).join('');
        }
      }

    } catch (err) {
      console.error('Failed to load member profile details:', err);
      showToast(`Unable to open profile: ${err.message}`, 'error');
      if (memberModalName) memberModalName.textContent = 'Access Restricted';
      if (memberModalChainFlow) {
        memberModalChainFlow.innerHTML = `<span style="font-size: 0.8rem; color: var(--emp-rose-text);">${escapeHtml(err.message)}</span>`;
      }
    }
  }

  function closeMemberProfileModal() {
    if (memberProfileModal) memberProfileModal.classList.add('hidden');
  }

  /**
   * Load personal attendance activity logs (Strictly scoped to session)
   * And compute summary KPI cards from real attendance data.
   */
  async function loadAttendanceLogs() {
    if (!empLogsTbody) return;

    try {
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--emp-text-muted); padding: 20px;">Fetching verified records...</td></tr>`;
      const logs = await api.getEmployeeAttendance();

      // Compute KPI summaries from authenticated logs
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      let todayEntriesCount = 0;
      let todayExitsCount = 0;
      let lastGateName = '--';
      let lastGateDesc = 'No gate detections today';

      if (Array.isArray(logs) && logs.length > 0) {
        logs.forEach(l => {
          const logDate = (l.timestamp || l.created_at || '').slice(0, 10);
          if (logDate === todayStr) {
            if (l.eventType === 'ENTRY') todayEntriesCount++;
            else if (l.eventType === 'EXIT') todayExitsCount++;
          }
        });

        const latest = logs[0];
        if (latest) {
          lastGateName = latest.gate || '--';
          lastGateDesc = `${latest.eventType} • ${latest.timestamp || 'Recent'}`;
        }
      }

      if (kpiTodayEntries) kpiTodayEntries.textContent = todayEntriesCount;
      if (kpiTodayExits) kpiTodayExits.textContent = todayExitsCount;
      if (kpiLastGate) kpiLastGate.textContent = lastGateName;
      if (kpiLastGateTime) kpiLastGateTime.textContent = lastGateDesc;

      const totalCount = Array.isArray(logs) ? logs.length : 0;
      if (historyCountBadge) {
        historyCountBadge.textContent = `${totalCount} ${totalCount === 1 ? 'Record' : 'Records'}`;
      }

      if (!logs || logs.length === 0) {
        empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--emp-text-muted); padding: 24px;">No personal attendance events recorded yet. Tap your card above to punch in.</td></tr>`;
        return;
      }

      empLogsTbody.innerHTML = logs.map(l => {
        const isEntry = l.eventType === 'ENTRY';
        const badgeClass = isEntry ? 'badge-entry' : 'badge-exit';
        const iconSymbol = isEntry ? '↗' : '↘';
        return `
          <tr>
            <td style="font-family: var(--font-family-mono); font-size: 0.82rem; color: var(--emp-text-muted);">${escapeHtml(l.id)}</td>
            <td style="font-family: var(--font-family-mono); font-size: 0.82rem;">${escapeHtml(l.timestamp)}</td>
            <td style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(l.gate)}</td>
            <td><span class="badge ${badgeClass}">${iconSymbol} ${escapeHtml(l.eventType)}</span></td>
            <td><span class="badge badge-verified">✓ ${escapeHtml(l.status || 'VERIFIED')}</span></td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load employee attendance logs:', err);
      empLogsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--emp-rose-text); padding: 20px;">Error loading personal logs.</td></tr>`;
    }
  }

  /**
   * Update Terminal Feedback Screen Display
   */
  function updateTerminalFeedback(type, title, desc, badgeText, isEntry = true) {
    if (!terminalFeedbackScreen) return;

    if (terminalFeedbackIcon) {
      if (type === 'success') {
        terminalFeedbackIcon.className = 'terminal-screen-icon';
        terminalFeedbackIcon.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      } else if (type === 'warning') {
        terminalFeedbackIcon.className = 'terminal-screen-icon is-warning';
        terminalFeedbackIcon.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        `;
      } else {
        terminalFeedbackIcon.className = 'terminal-screen-icon is-error';
        terminalFeedbackIcon.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 18px; height: 18px;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      }
    }

    if (terminalFeedbackTitle) terminalFeedbackTitle.textContent = title;
    if (terminalFeedbackDesc) terminalFeedbackDesc.textContent = desc;

    if (terminalFeedbackBadge) {
      if (type === 'success') {
        terminalFeedbackBadge.className = `badge ${isEntry ? 'badge-entry' : 'badge-exit'}`;
        terminalFeedbackBadge.style.background = '';
        terminalFeedbackBadge.style.color = '';
        terminalFeedbackBadge.style.border = '';
      } else if (type === 'warning') {
        terminalFeedbackBadge.className = 'badge';
        terminalFeedbackBadge.style.background = 'var(--emp-amber-subtle)';
        terminalFeedbackBadge.style.color = 'var(--emp-amber-text)';
        terminalFeedbackBadge.style.border = '1px solid var(--emp-amber-border)';
      } else {
        terminalFeedbackBadge.className = 'badge badge-exit';
        terminalFeedbackBadge.style.background = '';
        terminalFeedbackBadge.style.color = '';
        terminalFeedbackBadge.style.border = '';
      }
      terminalFeedbackBadge.textContent = badgeText;
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
        updateTerminalFeedback(
          'warning',
          'Scan Debounced (Duplicate Read)',
          result.message || 'Rapid successive scan ignored to prevent double-punching.',
          'DEBOUNCED'
        );
      } else {
        const isEntry = result.event && result.event.eventType === 'ENTRY';
        playScannerBeep(isEntry);
        showToast(
          `Smart Card Scanned: ${isEntry ? 'ENTRY' : 'EXIT'} logged at ${gate}`,
          isEntry ? 'entry' : 'exit'
        );

        updateTerminalFeedback(
          'success',
          `Verified ${isEntry ? 'ENTRY' : 'EXIT'} at ${gate}`,
          `Smart Card scanned successfully at ${result.event?.timestamp || 'just now'}`,
          isEntry ? 'ENTRY GRANTED' : 'EXIT LOGGED',
          isEntry
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
      updateTerminalFeedback(
        'error',
        'Access Denied / Scan Error',
        err.message || 'Smart card presentation failed.',
        'REJECTED'
      );
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

  // Phase 5: Team Filter Pills
  [btnFilterAll, btnFilterDirect, btnFilterIndirect].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        [btnFilterAll, btnFilterDirect, btnFilterIndirect].forEach(b => {
          if (b) b.classList.remove('active');
        });
        btn.classList.add('active');
        currentTeamFilter = btn.getAttribute('data-filter') || 'all';
        renderTeamTable();
      });
    }
  });

  // Phase 5: Team Search Input
  if (teamSearchInput) {
    teamSearchInput.addEventListener('input', (e) => {
      teamSearchQuery = e.target.value.toLowerCase().trim();
      renderTeamTable();
    });
  }

  // Phase 5: Refresh Team Button
  if (btnRefreshTeam) {
    btnRefreshTeam.addEventListener('click', () => {
      showToast('Refreshing team roster and presence telemetry...', 'info');
      loadTeamData(userPermissions);
    });
  }

  // Phase 5: Member Profile Modal Controls
  if (btnMemberModalClose) btnMemberModalClose.addEventListener('click', closeMemberProfileModal);
  if (btnMemberModalDismiss) btnMemberModalDismiss.addEventListener('click', closeMemberProfileModal);

  // Close modals on outside backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === memberProfileModal) {
      closeMemberProfileModal();
    }
    if (e.target === passwordChangeModal && !isMandatoryPasswordChange) {
      closePasswordModal();
    }
  });

  // Initialize Dashboard
  loadDashboard();

})();

(function () {
  'use strict';

  // ==========================================
  // 1. WORKFORCE DATABASE (Backed by SQLite /api/employees)
  // Departments: Production, IT, Quality, Maintenance
  // ==========================================
  let employees = [
    {
      id: 'EMP-101',
      name: 'Aravind Kumar',
      department: 'Production',
      role: 'CNC Lead Operator',
      uid: '7E:A1:39:B2',
      status: 'OUTSIDE',
      lastSeen: 'Not detected today',
      avatarBg: '#0284C7'
    },
    {
      id: 'EMP-102',
      name: 'Priya Sharma',
      department: 'Quality',
      role: 'QA Inspection Specialist',
      uid: '4F:8B:12:9C',
      status: 'INSIDE',
      lastSeen: '08:45:10 AM',
      avatarBg: '#059669'
    },
    {
      id: 'EMP-103',
      name: 'Rohan Mehta',
      department: 'IT',
      role: 'Systems Architect',
      uid: '9A:3D:77:E1',
      status: 'INSIDE',
      lastSeen: '09:02:44 AM',
      avatarBg: '#7C3AED'
    },
    {
      id: 'EMP-104',
      name: 'Suresh Patel',
      department: 'Maintenance',
      role: 'Electro-Mechanical Tech',
      uid: '1C:F5:62:30',
      status: 'OUTSIDE',
      lastSeen: 'Yesterday 05:30 PM',
      avatarBg: '#D97706'
    },
    {
      id: 'EMP-105',
      name: 'Ananya Iyer',
      department: 'Production',
      role: 'Robotics Assembly Lead',
      uid: 'B3:44:81:AA',
      status: 'INSIDE',
      lastSeen: '08:50:22 AM',
      avatarBg: '#0284C7'
    },
    {
      id: 'EMP-106',
      name: 'Vikram Singh',
      department: 'IT',
      role: 'IoT Firmware Engineer',
      uid: '55:9C:20:F8',
      status: 'OUTSIDE',
      lastSeen: 'Not detected today',
      avatarBg: '#7C3AED'
    },
    {
      id: 'EMP-107',
      name: 'Deepa Nair',
      department: 'Quality',
      role: 'Safety & Compliance Auditor',
      uid: '6D:E8:3B:14',
      status: 'INSIDE',
      lastSeen: '09:12:05 AM',
      avatarBg: '#059669'
    },
    {
      id: 'EMP-108',
      name: 'Karthik Raja',
      department: 'Maintenance',
      role: 'Infrastructure Lead',
      uid: '81:3A:D4:59',
      status: 'INSIDE',
      lastSeen: '08:35:40 AM',
      avatarBg: '#D97706'
    },
    {
      id: 'EMP-109',
      name: 'Sneha Kulkarni',
      department: 'Production',
      role: 'Fabrication Supervisor',
      uid: '38:B7:C2:90',
      status: 'OUTSIDE',
      lastSeen: 'Yesterday 06:15 PM',
      avatarBg: '#0284C7'
    },
    {
      id: 'EMP-110',
      name: 'Manoj Verma',
      department: 'IT',
      role: 'DevOps & Cloud Engineer',
      uid: 'AA:11:09:47',
      status: 'OUTSIDE',
      lastSeen: 'Not detected today',
      avatarBg: '#7C3AED'
    },
    {
      id: 'EMP-111',
      name: 'Lakshmi Narayanan',
      department: 'Quality',
      role: 'Metrology Lab In-Charge',
      uid: 'CC:5E:82:1D',
      status: 'OUTSIDE',
      lastSeen: 'Yesterday 05:45 PM',
      avatarBg: '#059669'
    },
    {
      id: 'EMP-112',
      name: 'Ganesh Das',
      department: 'Production',
      role: 'Material Handling Coordinator',
      uid: 'F4:71:03:6B',
      status: 'INSIDE',
      lastSeen: '08:58:31 AM',
      avatarBg: '#0284C7'
    }
  ];

  // Initial Shift Attendance Log Transactions
  let attendanceLogs = [
    {
      id: 'LOG-1001',
      timestamp: '2026-10-10 08:35:40',
      empId: 'EMP-108',
      empName: 'Karthik Raja',
      department: 'Maintenance',
      eventType: 'ENTRY',
      gate: 'Gate 04 - Maintenance Workshop Gate',
      status: 'VERIFIED'
    },
    {
      id: 'LOG-1002',
      timestamp: '2026-10-10 08:45:10',
      empId: 'EMP-102',
      empName: 'Priya Sharma',
      department: 'Quality',
      eventType: 'ENTRY',
      gate: 'Gate 01 - Main Turnstile',
      status: 'VERIFIED'
    },
    {
      id: 'LOG-1003',
      timestamp: '2026-10-10 08:50:22',
      empId: 'EMP-105',
      empName: 'Ananya Iyer',
      department: 'Production',
      eventType: 'ENTRY',
      gate: 'Gate 02 - Production Bay',
      status: 'VERIFIED'
    },
    {
      id: 'LOG-1004',
      timestamp: '2026-10-10 08:58:31',
      empId: 'EMP-112',
      empName: 'Ganesh Das',
      department: 'Production',
      eventType: 'ENTRY',
      gate: 'Gate 02 - Production Bay',
      status: 'VERIFIED'
    },
    {
      id: 'LOG-1005',
      timestamp: '2026-10-10 09:02:44',
      empId: 'EMP-103',
      empName: 'Rohan Mehta',
      department: 'IT',
      eventType: 'ENTRY',
      gate: 'Gate 03 - IT Labs Secure Door',
      status: 'VERIFIED'
    },
    {
      id: 'LOG-1006',
      timestamp: '2026-10-10 09:12:05',
      empId: 'EMP-107',
      empName: 'Deepa Nair',
      department: 'Quality',
      eventType: 'ENTRY',
      gate: 'Gate 01 - Main Turnstile',
      status: 'VERIFIED'
    }
  ];

  let logCounter = 1007;
  let soundEnabled = true;
  const SHIFT_START_TIME = '09:00:00'; // Target shift start

  // ==========================================
  // 2. DOM REFERENCES
  // ==========================================
  const liveClockDisplay = document.getElementById('liveClockDisplay');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const soundIcon = document.getElementById('soundIcon');
  const soundText = document.getElementById('soundText');
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');

  // Navigation & View Elements
  const adminSidebar = document.getElementById('adminSidebar');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnCloseSidebar = document.getElementById('btnCloseSidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const currentPageHeading = document.getElementById('currentPageHeading');
  const currentPageSubheading = document.getElementById('currentPageSubheading');
  const navBadgePresent = document.getElementById('navBadgePresent');

  // Quick View Jump Buttons
  const btnHeroOpenTerminal = document.getElementById('btnHeroOpenTerminal');
  const btnHeroViewRoster = document.getElementById('btnHeroViewRoster');
  const btnGoToFullRoster = document.getElementById('btnGoToFullRoster');
  const btnGoToGateHistory = document.getElementById('btnGoToGateHistory');

  // KPI elements
  const kpiTotalEmp = document.getElementById('kpiTotalEmp');
  const kpiPresentEmp = document.getElementById('kpiPresentEmp');
  const kpiAbsentEmp = document.getElementById('kpiAbsentEmp');
  const kpiLateEmp = document.getElementById('kpiLateEmp');
  const kpiInsideEmp = document.getElementById('kpiInsideEmp');
  const kpiOutsideEmp = document.getElementById('kpiOutsideEmp');
  const kpiInsideSub = document.getElementById('kpiInsideSub');
  const kpiAbsentSub = document.getElementById('kpiAbsentSub');
  const kpiLateSub = document.getElementById('kpiLateSub');
  const kpiAbsentRate = document.getElementById('kpiAbsentRate');
  const kpiOnTimeRateTag = document.getElementById('kpiOnTimeRateTag');
  const occupancyFill = document.getElementById('occupancyFill');
  const kpiTotalEvents = document.getElementById('kpiTotalEvents');
  const kpiEntryCount = document.getElementById('kpiEntryCount');
  const kpiExitCount = document.getElementById('kpiExitCount');
  const statOnTimePercent = document.getElementById('statOnTimePercent');

  // Virtual Card Stage
  const virtualCard = document.getElementById('virtualCard');
  const cardAvatar = document.getElementById('cardAvatar');
  const cardEmpName = document.getElementById('cardEmpName');
  const cardEmpRole = document.getElementById('cardEmpRole');
  const cardEmpDept = document.getElementById('cardEmpDept');
  const cardEmpId = document.getElementById('cardEmpId');
  const cardEmpUid = document.getElementById('cardEmpUid');
  const cardStatusBadge = document.getElementById('cardStatusBadge');

  // Simulator Controls
  const selectEmployee = document.getElementById('selectEmployee');
  const selectGateLocation = document.getElementById('selectGateLocation');
  const btnSimulateScan = document.getElementById('btnSimulateScan');
  const btnQuickDemoTap = document.getElementById('btnQuickDemoTap');
  const scannerAntenna = document.getElementById('scannerAntenna');
  const scannerLcdScreen = document.getElementById('scannerLcdScreen');

  // Streams & Breakdown
  const deptGridContainer = document.getElementById('deptGridContainer');
  const streamList = document.getElementById('streamList');
  const streamCountTag = document.getElementById('streamCountTag');
  const terminalLogPreview = document.getElementById('terminalLogPreview');

  // Tables
  const attendanceRosterTableBody = document.getElementById('attendanceRosterTableBody');
  const overviewRosterTableBody = document.getElementById('overviewRosterTableBody');
  const employeeTableBody = document.getElementById('employeeTableBody');
  const attendanceLogTableBody = document.getElementById('attendanceLogTableBody');

  // Table Filters & Search
  const inputSearchAttendance = document.getElementById('inputSearchAttendance');
  const filterAttendanceDept = document.getElementById('filterAttendanceDept');
  const filterAttendanceStatus = document.getElementById('filterAttendanceStatus');

  const inputSearchEmployees = document.getElementById('inputSearchEmployees');
  const filterEmpDept = document.getElementById('filterEmpDept');
  const filterEmpStatus = document.getElementById('filterEmpStatus');
  const filterEmpAccountStatus = document.getElementById('filterEmpAccountStatus');

  const inputSearchLogs = document.getElementById('inputSearchLogs');
  const filterLogEventType = document.getElementById('filterLogEventType');
  const btnExportCSV = document.getElementById('btnExportCSV');
  const btnExportAttendanceCSV = document.getElementById('btnExportAttendanceCSV');
  const btnClearLogs = document.getElementById('btnClearLogs');
  const toastContainer = document.getElementById('toastContainer');

  // Phase 5A: Virtual RFID Hardware Simulator Elements
  const inputCustomUid = document.getElementById('inputCustomUid');
  const btnChipUseSelected = document.getElementById('btnChipUseSelected');
  const btnChipUnknown = document.getElementById('btnChipUnknown');
  const btnChipInvalid = document.getElementById('btnChipInvalid');
  const btnChipRandomEmp = document.getElementById('btnChipRandomEmp');
  const sliderReadDistance = document.getElementById('sliderReadDistance');
  const valReadDistance = document.getElementById('valReadDistance');
  const sliderSignalRssi = document.getElementById('sliderSignalRssi');
  const valSignalRssi = document.getElementById('valSignalRssi');
  const btnBurstDebounceScan = document.getElementById('btnBurstDebounceScan');
  const btnUnknownCardTest = document.getElementById('btnUnknownCardTest');
  const btnMultiEmployeeBatch = document.getElementById('btnMultiEmployeeBatch');
  const diagStatusPill = document.getElementById('diagStatusPill');
  const diagSimUid = document.getElementById('diagSimUid');
  const diagSimEmp = document.getElementById('diagSimEmp');
  const diagSimGate = document.getElementById('diagSimGate');
  const diagSimTelemetry = document.getElementById('diagSimTelemetry');
  const diagSimResponse = document.getElementById('diagSimResponse');
  const diagSimAttendance = document.getElementById('diagSimAttendance');
  const diagOutcomeBanner = document.getElementById('diagOutcomeBanner');
  const diagOutcomeIcon = document.getElementById('diagOutcomeIcon');
  const diagOutcomeTitle = document.getElementById('diagOutcomeTitle');
  const diagOutcomeDesc = document.getElementById('diagOutcomeDesc');
  const btnClearSimLogs = document.getElementById('btnClearSimLogs');
  const btnRefreshSimReport = document.getElementById('btnRefreshSimReport');
  const btnResetSimReport = document.getElementById('btnResetSimReport');

  // Modal: Add Employee & Phase 3 Credential Display
  const modalAddEmployee = document.getElementById('modalAddEmployee');
  const modalAddEmployeeTitle = document.getElementById('modalAddEmployeeTitle');
  const btnOpenAddEmployeeModal = document.getElementById('btnOpenAddEmployeeModal');
  const btnCloseAddEmployeeModal = document.getElementById('btnCloseAddEmployeeModal');
  const btnCancelAddEmployee = document.getElementById('btnCancelAddEmployee');
  const formAddEmployee = document.getElementById('formAddEmployee');
  const stageEmployeeCredentials = document.getElementById('stageEmployeeCredentials');
  const btnGenUid = document.getElementById('btnGenUid');
  const newEmpName = document.getElementById('newEmpName');
  const newEmpDept = document.getElementById('newEmpDept');
  const newEmpRole = document.getElementById('newEmpRole');
  const newEmpEmail = document.getElementById('newEmpEmail');
  const newEmpEmailError = document.getElementById('newEmpEmailError');
  const newEmpPhone = document.getElementById('newEmpPhone');
  const newEmpPhoneError = document.getElementById('newEmpPhoneError');
  const newEmpUid = document.getElementById('newEmpUid');
  const modalAddEmployeeError = document.getElementById('modalAddEmployeeError');
  const dispCredEmpId = document.getElementById('dispCredEmpId');
  const dispCredPassword = document.getElementById('dispCredPassword');
  const dispCredCardUid = document.getElementById('dispCredCardUid');
  const rowCredCardUid = document.getElementById('rowCredCardUid');
  const dispCredEmail = document.getElementById('dispCredEmail');
  const rowCredEmail = document.getElementById('rowCredEmail');
  const dispCredPhone = document.getElementById('dispCredPhone');
  const rowCredPhone = document.getElementById('rowCredPhone');
  const credEmpSummaryName = document.getElementById('credEmpSummaryName');
  const credEmpSummaryDept = document.getElementById('credEmpSummaryDept');
  const btnCopyCredId = document.getElementById('btnCopyCredId');
  const btnCopyCredPassword = document.getElementById('btnCopyCredPassword');
  const btnCopyAllCredentials = document.getElementById('btnCopyAllCredentials');
  const btnDoneAddEmployee = document.getElementById('btnDoneAddEmployee');

  // Modal: View Employee Profile
  const modalViewEmployee = document.getElementById('modalViewEmployee');
  const btnCloseViewEmployeeModal = document.getElementById('btnCloseViewEmployeeModal');
  const btnCloseViewModalBtn = document.getElementById('btnCloseViewModalBtn');
  const btnEditFromViewModal = document.getElementById('btnEditFromViewModal');
  const viewEmpAvatar = document.getElementById('viewEmpAvatar');
  const viewEmpName = document.getElementById('viewEmpName');
  const viewEmpAccountBadge = document.getElementById('viewEmpAccountBadge');
  const viewEmpIdBadge = document.getElementById('viewEmpIdBadge');
  const viewEmpRoleDept = document.getElementById('viewEmpRoleDept');
  const viewEmpEmail = document.getElementById('viewEmpEmail');
  const viewEmpPhone = document.getElementById('viewEmpPhone');
  const viewEmpUid = document.getElementById('viewEmpUid');
  const viewEmpPresence = document.getElementById('viewEmpPresence');
  const viewEmpLastSeen = document.getElementById('viewEmpLastSeen');
  const viewEmpPwStatus = document.getElementById('viewEmpPwStatus');
  const viewEmpTotalRecords = document.getElementById('viewEmpTotalRecords');
  const viewEmpRecentLogs = document.getElementById('viewEmpRecentLogs');

  // Modal: Edit Employee
  const modalEditEmployee = document.getElementById('modalEditEmployee');
  const btnCloseEditEmployeeModal = document.getElementById('btnCloseEditEmployeeModal');
  const btnCancelEditEmployee = document.getElementById('btnCancelEditEmployee');
  const formEditEmployee = document.getElementById('formEditEmployee');
  const editEmpId = document.getElementById('editEmpId');
  const editEmpName = document.getElementById('editEmpName');
  const editEmpDept = document.getElementById('editEmpDept');
  const editEmpRole = document.getElementById('editEmpRole');
  const editEmpEmail = document.getElementById('editEmpEmail');
  const editEmpEmailError = document.getElementById('editEmpEmailError');
  const editEmpPhone = document.getElementById('editEmpPhone');
  const editEmpPhoneError = document.getElementById('editEmpPhoneError');
  const editEmpUid = document.getElementById('editEmpUid');
  const btnGenEditUid = document.getElementById('btnGenEditUid');
  const modalEditEmployeeError = document.getElementById('modalEditEmployeeError');
  const btnSubmitEditEmployee = document.getElementById('btnSubmitEditEmployee');

  // Modal: Confirmation Dialog
  const modalConfirmAction = document.getElementById('modalConfirmAction');
  const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');
  const btnCancelConfirmAction = document.getElementById('btnCancelConfirmAction');
  const btnSubmitConfirmAction = document.getElementById('btnSubmitConfirmAction');
  const confirmActionTitle = document.getElementById('confirmActionTitle');
  const confirmActionMessage = document.getElementById('confirmActionMessage');
  const confirmActionWarning = document.getElementById('confirmActionWarning');
  const confirmActionIcon = document.getElementById('confirmActionIcon');

  // Modal: Reset Temporary Password Result
  const modalResetPasswordResult = document.getElementById('modalResetPasswordResult');
  const btnCloseResetPwdModal = document.getElementById('btnCloseResetPwdModal');
  const btnDoneResetPwd = document.getElementById('btnDoneResetPwd');
  const dispResetEmpId = document.getElementById('dispResetEmpId');
  const dispResetPassword = document.getElementById('dispResetPassword');
  const resetPwdEmpSummaryName = document.getElementById('resetPwdEmpSummaryName');
  const resetPwdEmpSummaryDesc = document.getElementById('resetPwdEmpSummaryDesc');
  const btnCopyResetEmpId = document.getElementById('btnCopyResetEmpId');
  const btnCopyResetPassword = document.getElementById('btnCopyResetPassword');
  const btnCopyAllResetCredentials = document.getElementById('btnCopyAllResetCredentials');

  // ==========================================
  // 3. AUDIO FEEDBACK (Synthesized Web Audio API)
  // Zero external files, 100% offline
  // ==========================================
  function playScannerBeep(isEntry = true) {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isEntry) {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.setValueAtTime(1800, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      } else {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch (e) {}
  }

  function playScannerWarning() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  }

  function playScannerBuzz() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.setValueAtTime(120, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {}
  }

  // ==========================================
  // 4. UTILITIES & TIME HELPERS
  // ==========================================
  function getInitials(name) {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function getFormattedCurrentTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  function getFormattedTimeOnly() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  }

  function getRandomHexByte() {
    return Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
  }

  function generateRandomCardUid() {
    return `${getRandomHexByte()}:${getRandomHexByte()}:${getRandomHexByte()}:${getRandomHexByte()}`;
  }

  function showToast(message, type = 'entry') {
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'entry' ? '🟢' : '🔵';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Live Clock
  function updateClock() {
    const now = new Date();
    if (liveClockDisplay) {
      liveClockDisplay.textContent = now.toLocaleTimeString();
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Audio Toggle
  btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundText.textContent = soundEnabled ? 'Sound ON' : 'Muted';
  });

  // Dual Theme (Default: Stripe / Apple Executive Light)
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Dark';
    }
    try {
      localStorage.setItem('smartworkforce_theme', theme);
    } catch (e) {}
  }

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      applyTheme(isCurrentlyDark ? 'light' : 'dark');
      renderAttendanceCharts();
    });
  }

  try {
    const savedTheme = localStorage.getItem('smartworkforce_theme');
    if (savedTheme === 'dark') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  } catch (e) {
    applyTheme('light');
  }

  // ==========================================
  // 5. VIEW NAVIGATION & ROUTING
  // ==========================================
  const viewHeadings = {
    'view-overview': {
      title: 'Dashboard Overview',
      subtitle: 'Real-time Workforce Presence, Contactless RFID Gate Telemetry & Shift Analytics'
    },
    'view-attendance': {
      title: 'Attendance Roster',
      subtitle: 'Comprehensive Daily Attendance Records, Check-In/Check-Out Stamps & Statuses'
    },
    'view-terminal': {
      title: 'Smart Card Terminal',
      subtitle: 'Contactless 13.56MHz RFID/NFC Hardware Gate Simulator & Antenna Stage'
    },
    'view-employees': {
      title: 'Workforce Directory',
      subtitle: 'Registered Employee Badges, Hardware UIDs & Department Records'
    },
    'view-history': {
      title: 'Gate History Log',
      subtitle: 'Immutable Chronological Audit Trail of Gate Entries, Exits and Verification Stamps'
    },
    'view-analytics': {
      title: 'Analytics & Deep Statistics',
      subtitle: 'Shift Hourly Distribution, Punctuality Metrics & Facility Security Level'
    },
    'view-org-tree': {
      title: 'Organization Tree & Hierarchy',
      subtitle: 'Manage Company Divisions, Units, Hierarchy Levels & Reporting Relationships'
    },
    'view-job-titles': {
      title: 'Job Titles & Designations',
      subtitle: 'Standardized Corporate Titles, Responsibilities & Workforce Classification'
    },
    'view-roles-perms': {
      title: 'Roles & Access Permissions',
      subtitle: 'Configure Granular Permission Keys, Resource Scopes & Governance Matrix'
    }
  };

  function switchView(targetViewId) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === targetViewId);
    });

    viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetViewId);
    });

    if (viewHeadings[targetViewId]) {
      currentPageHeading.textContent = viewHeadings[targetViewId].title;
      currentPageSubheading.textContent = viewHeadings[targetViewId].subtitle;
    }

    // Close mobile sidebar if open
    adminSidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');

    // Trigger chart render if analytics or overview view
    if (targetViewId === 'view-overview' || targetViewId === 'view-analytics') {
      renderAttendanceCharts();
    } else if (targetViewId === 'view-org-tree') {
      loadOrgTreeData();
    } else if (targetViewId === 'view-job-titles') {
      loadJobTitles();
    } else if (targetViewId === 'view-roles-perms') {
      loadRoles();
    }
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });

  // Mobile Drawer Toggle
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      adminSidebar.classList.toggle('open');
      sidebarBackdrop.classList.toggle('active');
    });
  }

  if (btnCloseSidebar) {
    btnCloseSidebar.addEventListener('click', () => {
      adminSidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      adminSidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  // Quick navigation helpers
  if (btnHeroOpenTerminal) btnHeroOpenTerminal.addEventListener('click', () => switchView('view-terminal'));
  if (btnHeroViewRoster) btnHeroViewRoster.addEventListener('click', () => switchView('view-attendance'));
  if (btnGoToFullRoster) btnGoToFullRoster.addEventListener('click', () => switchView('view-attendance'));
  if (btnGoToGateHistory) btnGoToGateHistory.addEventListener('click', () => switchView('view-history'));

  // ==========================================
  // 6. ATTENDANCE ROSTER COMPUTATION ENGINE
  // Calculates Check-In, Check-Out, Late Status
  // ==========================================
  function getTodayAttendanceRecords() {
    return employees.map(emp => {
      const empLogs = attendanceLogs.filter(l => l.empId === emp.id);
      const entries = empLogs.filter(l => l.eventType === 'ENTRY');
      const exits = empLogs.filter(l => l.eventType === 'EXIT');

      const firstEntry = entries.length > 0 ? entries[0] : null;
      const lastExit = exits.length > 0 ? exits[exits.length - 1] : null;

      let checkInTime = '--:--';
      let checkOutTime = '--:--';
      let durationStr = '0 hrs';
      let statusKey = 'ABSENT';
      let statusLabel = 'Absent';
      let statusClass = 'absent';
      let isLate = false;

      if (firstEntry) {
        const timePart = firstEntry.timestamp.split(' ')[1] || firstEntry.timestamp;
        checkInTime = timePart;
        isLate = timePart > SHIFT_START_TIME;

        if (emp.status === 'INSIDE') {
          checkOutTime = 'Active (Inside)';
          statusKey = isLate ? 'LATE' : 'PRESENT_ON_TIME';
          statusLabel = isLate ? 'Late Arrival' : 'Present (On-Time)';
          statusClass = isLate ? 'late' : 'present';
        } else {
          checkOutTime = lastExit ? (lastExit.timestamp.split(' ')[1] || lastExit.timestamp) : '--:--';
          statusKey = 'CHECKED_OUT';
          statusLabel = isLate ? 'Late (Left)' : 'Checked Out';
          statusClass = 'checked-out';
        }

        // Approximate duration
        const now = new Date();
        const entryDate = new Date(firstEntry.timestamp.replace(/-/g, '/'));
        const diffMs = Math.max(0, now - entryDate);
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationStr = `${diffHrs}h ${diffMins}m`;
      }

      return {
        ...emp,
        firstEntry,
        lastExit,
        checkInTime,
        checkOutTime,
        durationStr,
        statusKey,
        statusLabel,
        statusClass,
        isLate
      };
    });
  }

  // ==========================================
  // 7. KPI STATS UPDATER
  // ==========================================
  function updateKPIs() {
    const attendanceRecords = getTodayAttendanceRecords();
    const total = employees.length;
    const present = employees.filter(e => e.status === 'INSIDE').length;
    const absent = attendanceRecords.filter(r => r.statusKey === 'ABSENT').length;
    const late = attendanceRecords.filter(r => r.isLate).length;
    const checkedInCount = total - absent;

    const occupancyPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;
    const onTimeCount = checkedInCount - late;
    const onTimePct = checkedInCount > 0 ? Math.round((onTimeCount / checkedInCount) * 100) : 0;

    const totalEvents = attendanceLogs.length;
    const entries = attendanceLogs.filter(l => l.eventType === 'ENTRY').length;
    const exits = attendanceLogs.filter(l => l.eventType === 'EXIT').length;

    // Primary KPI cards
    if (kpiTotalEmp) kpiTotalEmp.textContent = total;
    if (kpiPresentEmp) kpiPresentEmp.textContent = present;
    if (kpiAbsentEmp) kpiAbsentEmp.textContent = absent;
    if (kpiLateEmp) kpiLateEmp.textContent = late;

    // Preserved compatibility elements
    if (kpiInsideEmp) kpiInsideEmp.textContent = present;
    if (kpiOutsideEmp) kpiOutsideEmp.textContent = total - present;

    // Subtexts & Pills
    if (kpiInsideSub) kpiInsideSub.textContent = `${occupancyPct}% Facility Occupancy`;
    if (occupancyFill) occupancyFill.style.width = `${occupancyPct}%`;
    if (kpiAbsentSub) kpiAbsentSub.textContent = `${absent} workforce off-premises`;
    if (kpiAbsentRate) kpiAbsentRate.textContent = `${absentPct}% Absent`;
    if (kpiLateSub) kpiLateSub.textContent = `${late} employee${late === 1 ? '' : 's'} arrived after 09:00 AM`;
    if (kpiOnTimeRateTag) kpiOnTimeRateTag.textContent = `${onTimePct}% On-Time`;

    if (navBadgePresent) navBadgePresent.textContent = `${present} Present`;
    if (statOnTimePercent) statOnTimePercent.textContent = `${onTimePct}%`;

    // Secondary Telemetry
    if (kpiTotalEvents) kpiTotalEvents.textContent = totalEvents;
    if (kpiEntryCount) kpiEntryCount.textContent = `${entries} Entries`;
    if (kpiExitCount) kpiExitCount.textContent = `${exits} Exits`;
  }

  // ==========================================
  // 8. DEPARTMENT BREAKDOWN & REALTIME STREAM
  // ==========================================
  function updateDepartmentGrid() {
    const depts = [
      { name: 'Production', class: 'prod' },
      { name: 'IT', class: 'it' },
      { name: 'Quality', class: 'qa' },
      { name: 'Maintenance', class: 'maint' }
    ];

    if (!deptGridContainer) return;
    deptGridContainer.innerHTML = '';

    depts.forEach(d => {
      const deptEmployees = employees.filter(e => e.department.toLowerCase().includes(d.name.toLowerCase()));
      const countTotal = deptEmployees.length;
      const countInside = deptEmployees.filter(e => e.status === 'INSIDE').length;
      const pct = countTotal > 0 ? Math.round((countInside / countTotal) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'dept-card';
      card.innerHTML = `
        <div>
          <div class="dept-card-header">
            <span class="dept-name">${d.name}</span>
            <span class="dept-pill ${d.class}">${countInside}/${countTotal}</span>
          </div>
          <div class="dept-stats">
            Present: <span>${countInside}</span> &bull; Absent: <span>${countTotal - countInside}</span>
          </div>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); margin-bottom: 4px;">
            <span>Occupancy</span>
            <span style="font-family: var(--font-mono);">${pct}%</span>
          </div>
          <div class="dept-mini-progress">
            <div class="dept-mini-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
      deptGridContainer.appendChild(card);
    });
  }

  function updateStreamList() {
    if (streamCountTag) streamCountTag.textContent = `${attendanceLogs.length} Total Logs`;
    if (!streamList) return;

    if (attendanceLogs.length === 0) {
      streamList.innerHTML = `
        <li class="stream-item" style="color: var(--text-dim); justify-content: center; padding: 20px 0;">
          No gate events logged yet.
        </li>
      `;
      if (terminalLogPreview) {
        terminalLogPreview.innerHTML = streamList.innerHTML;
      }
      return;
    }

    const recent = attendanceLogs.slice().reverse().slice(0, 6);
    streamList.innerHTML = '';

    recent.forEach(log => {
      const li = document.createElement('li');
      li.className = 'stream-item';
      const timeParts = log.timestamp.split(' ');
      const timeShort = timeParts[1] || log.timestamp;
      const actionClass = log.eventType === 'ENTRY' ? 'stream-action-entry' : 'stream-action-exit';
      const actionSymbol = log.eventType === 'ENTRY' ? 'IN ▲' : 'OUT ▼';

      li.innerHTML = `
        <span class="stream-time">[${timeShort}]</span>
        <span class="${actionClass}">${actionSymbol} ${log.eventType}</span>
        <span class="stream-name">${log.empName}</span>
        <span style="color: var(--text-dim); font-size: 0.72rem;">(${log.empId})</span>
      `;
      streamList.appendChild(li);
    });

    if (terminalLogPreview) {
      terminalLogPreview.innerHTML = streamList.innerHTML;
    }
  }

  // ==========================================
  // 9. VIRTUAL CARD PREVIEW & SELECTION
  // ==========================================
  function populateEmployeeSelect() {
    if (!selectEmployee) return;
    const currentVal = selectEmployee.value;
    selectEmployee.innerHTML = '';
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = `${emp.id} - ${emp.name} (${emp.department}) [${emp.status}]`;
      selectEmployee.appendChild(opt);
    });
    if (currentVal && employees.some(e => e.id === currentVal)) {
      selectEmployee.value = currentVal;
    }
  }

  function updateVirtualCardPreview(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    if (cardAvatar) {
      cardAvatar.textContent = getInitials(emp.name);
      cardAvatar.style.backgroundColor = emp.avatarBg;
    }
    if (cardEmpName) cardEmpName.textContent = emp.name;
    if (cardEmpRole) cardEmpRole.textContent = emp.role;
    if (cardEmpDept) cardEmpDept.textContent = `${emp.department} Department`;
    if (cardEmpId) cardEmpId.textContent = emp.id;
    if (cardEmpUid) cardEmpUid.textContent = emp.uid;

    if (inputCustomUid) {
      inputCustomUid.value = emp.uid;
    }

    if (cardStatusBadge) {
      if (emp.status === 'INSIDE') {
        cardStatusBadge.textContent = 'INSIDE FACILITY';
        cardStatusBadge.className = 'card-status-badge badge-inside';
      } else {
        cardStatusBadge.textContent = 'OUTSIDE FACILITY';
        cardStatusBadge.className = 'card-status-badge badge-outside';
      }
    }

    if (diagSimUid) diagSimUid.textContent = emp.uid;
    if (diagSimEmp) diagSimEmp.textContent = `${emp.name} (${emp.id})`;
  }

  if (selectEmployee) {
    selectEmployee.addEventListener('change', () => {
      updateVirtualCardPreview(selectEmployee.value);
    });
  }

  if (inputCustomUid) {
    inputCustomUid.addEventListener('input', () => {
      const val = inputCustomUid.value.trim().toUpperCase();
      const matchedEmp = employees.find(e => e.uid.toUpperCase() === val);
      if (matchedEmp) {
        if (selectEmployee) selectEmployee.value = matchedEmp.id;
        updateVirtualCardPreview(matchedEmp.id);
      } else {
        // Unknown or custom UID preview
        if (cardAvatar) {
          cardAvatar.textContent = '??';
          cardAvatar.style.backgroundColor = '#64748B';
        }
        if (cardEmpName) cardEmpName.textContent = val ? 'Unregistered Test Badge' : 'Empty Card Slot';
        if (cardEmpRole) cardEmpRole.textContent = 'Hardware Emulation Mode';
        if (cardEmpDept) cardEmpDept.textContent = 'External / Guest Reader';
        if (cardEmpId) cardEmpId.textContent = 'UNENROLLED';
        if (cardEmpUid) cardEmpUid.textContent = val || 'NO-UID';
        if (cardStatusBadge) {
          cardStatusBadge.textContent = 'NOT ENROLLED';
          cardStatusBadge.className = 'card-status-badge badge-outside';
        }
        if (diagSimUid) diagSimUid.textContent = val || '--';
        if (diagSimEmp) diagSimEmp.textContent = '[Unregistered Test Card]';
      }
    });
  }

  // ==========================================
  // 10. RENDER ATTENDANCE ROSTER TABLES
  // ==========================================
  function renderAttendanceRosterTable() {
    if (!attendanceRosterTableBody) return;

    const query = inputSearchAttendance ? inputSearchAttendance.value.trim().toLowerCase() : '';
    const deptFilter = filterAttendanceDept ? filterAttendanceDept.value : 'ALL';
    const statusFilter = filterAttendanceStatus ? filterAttendanceStatus.value : 'ALL';

    const records = getTodayAttendanceRecords();

    const filtered = records.filter(rec => {
      const matchQuery =
        !query ||
        rec.id.toLowerCase().includes(query) ||
        rec.name.toLowerCase().includes(query) ||
        rec.department.toLowerCase().includes(query) ||
        rec.role.toLowerCase().includes(query);

      const matchDept = deptFilter === 'ALL' || rec.department === deptFilter;
      const matchStatus = statusFilter === 'ALL' || rec.statusKey === statusFilter;

      return matchQuery && matchDept && matchStatus;
    });

    if (filtered.length === 0) {
      attendanceRosterTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div>No employee records matched your roster filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    attendanceRosterTableBody.innerHTML = '';
    filtered.forEach(rec => {
      const tr = document.createElement('tr');
      const isInside = rec.status === 'INSIDE';

      tr.innerHTML = `
        <td><span class="emp-id-badge">${rec.id}</span></td>
        <td>
          <div class="emp-name-cell">
            <div class="emp-avatar-sm" style="background-color: ${rec.avatarBg};">${getInitials(rec.name)}</div>
            <div>
              <div style="font-weight: 600; color: var(--text-main);">${rec.name}</div>
              <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim);">${rec.uid}</div>
            </div>
          </div>
        </td>
        <td>${rec.department}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${rec.role}</td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem; font-weight: 600;">
          ${rec.checkInTime !== '--:--' ? `⏰ ${rec.checkInTime}` : '<span style="color: var(--text-dim);">--:--</span>'}
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.82rem;">
          ${rec.checkOutTime === 'Active (Inside)' ? '<span style="color: var(--status-inside); font-weight: 600;">● Active</span>' : (rec.checkOutTime !== '--:--' ? rec.checkOutTime : '<span style="color: var(--text-dim);">--:--</span>')}
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${rec.durationStr}</td>
        <td>
          <span class="status-badge ${rec.statusClass}">
            ${rec.statusLabel}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-quick-tap" data-emp-id="${rec.id}" title="Simulate badge tap at gate">
            <svg style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24">
              <path d="M4.9 19.1C2.5 16.7 2.5 12.8 4.9 10.4M7.8 16.2C6.2 14.6 6.2 12 7.8 10.4M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            </svg>
            Tap ${isInside ? 'Exit' : 'Entry'}
          </button>
        </td>
      `;
      attendanceRosterTableBody.appendChild(tr);
    });

    // Attach quick tap listeners
    attendanceRosterTableBody.querySelectorAll('.btn-quick-tap').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        executeSmartCardScan(empId, 'AUTO');
      });
    });
  }

  function renderOverviewRosterSnapshot() {
    if (!overviewRosterTableBody) return;
    const records = getTodayAttendanceRecords().slice(0, 6);

    overviewRosterTableBody.innerHTML = '';
    records.forEach(rec => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="emp-name-cell">
            <div class="emp-avatar-sm" style="background-color: ${rec.avatarBg};">${getInitials(rec.name)}</div>
            <span style="font-weight: 600;">${rec.name}</span>
          </div>
        </td>
        <td style="font-size: 0.78rem;">${rec.department}</td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${rec.checkInTime}</td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${rec.checkOutTime}</td>
        <td>
          <span class="status-badge ${rec.statusClass}">
            ${rec.statusLabel}
          </span>
        </td>
      `;
      overviewRosterTableBody.appendChild(tr);
    });
  }

  // ==========================================
  // 11. RENDER EMPLOYEE DIRECTORY TABLE
  // ==========================================
  // ==========================================
  // 11. RENDER EMPLOYEE DIRECTORY TABLE
  // ==========================================
  function renderEmployeeTable() {
    if (!employeeTableBody) return;

    // Clean up any action menus previously moved to body
    document.querySelectorAll('body > .action-menu-dropdown').forEach(m => m.remove());

    const query = inputSearchEmployees ? inputSearchEmployees.value.trim().toLowerCase() : '';
    const deptFilter = filterEmpDept ? filterEmpDept.value : 'ALL';
    const statusFilter = filterEmpStatus ? filterEmpStatus.value : 'ALL';
    const accountFilter = filterEmpAccountStatus ? filterEmpAccountStatus.value : 'ALL';

    const filtered = employees.filter(emp => {
      const matchQuery =
        !query ||
        emp.id.toLowerCase().includes(query) ||
        emp.name.toLowerCase().includes(query) ||
        emp.role.toLowerCase().includes(query) ||
        (emp.uid && emp.uid.toLowerCase().includes(query)) ||
        (emp.email && emp.email.toLowerCase().includes(query)) ||
        (emp.phone && emp.phone.includes(query));

      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;
      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;

      let matchAccount = true;
      if (accountFilter === 'ACTIVE') {
        matchAccount = !emp.isArchived && emp.accountStatus === 'ACTIVE';
      } else if (accountFilter === 'SUSPENDED') {
        matchAccount = !emp.isArchived && emp.accountStatus === 'SUSPENDED';
      } else if (accountFilter === 'ARCHIVED') {
        matchAccount = Boolean(emp.isArchived);
      } else if (accountFilter === 'ALL') {
        matchAccount = !emp.isArchived;
      } else if (accountFilter === 'EVERYTHING') {
        matchAccount = true;
      }

      return matchQuery && matchDept && matchStatus && matchAccount;
    });

    // Update Directory Summary and Badges
    const insideCount = filtered.filter(e => e.status === 'INSIDE').length;
    const outsideCount = filtered.filter(e => e.status !== 'INSIDE').length;
    const activeCount = filtered.filter(e => !e.isArchived && e.accountStatus === 'ACTIVE').length;

    const empDirectoryCount = document.getElementById('empDirectoryCount');
    if (empDirectoryCount) {
      empDirectoryCount.textContent = `${filtered.length} Member${filtered.length === 1 ? '' : 's'}`;
    }

    const footerSummary = document.getElementById('workforceFooterSummary');
    if (footerSummary) {
      footerSummary.innerHTML = `Showing <strong>${filtered.length}</strong> of ${employees.length} workforce members &bull; <span style="color: var(--status-inside); font-weight: 600;">${insideCount} Inside</span> &bull; <span style="color: var(--text-muted); font-weight: 600;">${outsideCount} Outside</span> &bull; <span style="color: #10B981; font-weight: 600;">${activeCount} Active</span>`;
    }

    const btnResetEmpFilters = document.getElementById('btnResetEmpFilters');
    if (btnResetEmpFilters) {
      const hasActiveFilter = (query !== '') || (deptFilter !== 'ALL') || (statusFilter !== 'ALL') || (accountFilter !== 'ALL');
      if (hasActiveFilter) {
        btnResetEmpFilters.classList.add('visible');
      } else {
        btnResetEmpFilters.classList.remove('visible');
      }
    }

    if (filtered.length === 0) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state" style="padding: 48px 16px; text-align: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 38px; height: 38px; margin: 0 auto 12px; color: var(--text-muted); display: block;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); margin-bottom: 6px;">No employee records matched your filter criteria</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 16px;">Try adjusting your search query, department, presence, or account status filters.</div>
            <button type="button" class="btn-action-secondary" id="btnEmptyResetFilters" style="margin: 0 auto; width: auto; font-size: 0.8rem; padding: 6px 14px;">
              Reset All Filters
            </button>
          </td>
        </tr>
      `;

      const btnEmptyReset = employeeTableBody.querySelector('#btnEmptyResetFilters');
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', resetAllEmployeeFilters);
      }
      return;
    }

    employeeTableBody.innerHTML = '';
    filtered.forEach(emp => {
      const tr = document.createElement('tr');
      const isInside = emp.status === 'INSIDE';
      const isSuspended = emp.accountStatus === 'SUSPENDED';
      const isArchived = Boolean(emp.isArchived);

      let accountBadge = '<span class="badge-status-active">● Active</span>';
      if (isArchived) {
        accountBadge = '<span class="badge-status-archived">● Archived</span>';
      } else if (isSuspended) {
        accountBadge = '<span class="badge-status-suspended">● Suspended</span>';
      }

      tr.innerHTML = `
        <td class="col-emp-id"><span class="emp-id-badge">${emp.id}</span></td>
        <td class="col-emp-name">
          <div class="emp-name-cell">
            <div class="emp-avatar-sm" style="background-color: ${emp.avatarBg};">${getInitials(emp.name)}</div>
            <div class="emp-name-details">
              <span class="emp-full-name">${emp.name}</span>
              ${emp.email ? `<span class="emp-sub-email">${emp.email}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="col-emp-dept">${emp.department}</td>
        <td class="col-emp-role"><span class="emp-role-text">${emp.role}</span></td>
        <td class="col-emp-uid"><span class="emp-uid-code">${emp.uid || '<em style="color:var(--text-muted);">None</em>'}</span></td>
        <td class="col-emp-acc">${accountBadge}</td>
        <td class="col-emp-presence">
          <span class="status-badge ${isInside ? 'present' : 'checked-out'}">
            ${isInside ? '● INSIDE' : '○ OUTSIDE'}
          </span>
        </td>
        <td class="col-emp-seen"><span class="emp-last-seen-text">${emp.lastSeen}</span></td>
        <td class="col-emp-actions" style="text-align: right;">
          <div class="action-cell">
            <button type="button" class="btn-quick-tap" data-emp-id="${emp.id}" title="Tap Smart ID at Gate" ${isArchived ? 'disabled style="opacity: 0.45; cursor: not-allowed;"' : ''}>
              <svg style="width: 13px; height: 13px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24">
                <path d="M4.9 19.1C2.5 16.7 2.5 12.8 4.9 10.4M7.8 16.2C6.2 14.6 6.2 12 7.8 10.4M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
              </svg>
              <span>Tap ${isInside ? 'Exit' : 'Entry'}</span>
            </button>

            <button type="button" class="btn-action-menu" data-emp-id="${emp.id}" title="Manage Employee Actions" aria-label="Manage Employee">
              &bull;&bull;&bull;
            </button>

            <div class="action-menu-dropdown" id="actionMenu-${emp.id}">
              <button type="button" class="action-menu-item btn-act-view" data-emp-id="${emp.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>View Details</span>
              </button>
              <button type="button" class="action-menu-item btn-act-edit" data-emp-id="${emp.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit Employee</span>
              </button>
              ${!isArchived ? `
                <button type="button" class="action-menu-item btn-act-reset-pwd" data-emp-id="${emp.id}" title="Reset Temporary Password">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <span style="color: #38BDF8;">Reset Temporary Password</span>
                </button>
                <button type="button" class="action-menu-item btn-act-status" data-emp-id="${emp.id}" data-current-status="${emp.accountStatus}">
                  ${isSuspended ? `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span style="color: #10B981;">Reactivate</span>
                  ` : `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    <span style="color: #F59E0B;">Deactivate</span>
                  `}
                </button>
                <button type="button" class="action-menu-item danger btn-act-delete" data-emp-id="${emp.id}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Delete / Archive</span>
                </button>
              ` : `
                <button type="button" class="action-menu-item btn-act-restore" data-emp-id="${emp.id}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
                  <span style="color: #10B981;">Restore Employee</span>
                </button>
              `}
            </div>
          </div>
        </td>
      `;

      // Wire action buttons within this row
      const btnQuickTap = tr.querySelector('.btn-quick-tap');
      if (btnQuickTap) {
        btnQuickTap.addEventListener('click', (e) => {
          e.stopPropagation();
          executeSmartCardScan(emp.id, 'AUTO');
        });
      }

      const btnMenu = tr.querySelector('.btn-action-menu');
      if (btnMenu) {
        btnMenu.addEventListener('click', (e) => {
          e.stopPropagation();
          openActionMenu(btnMenu, emp.id);
        });
      }

      const btnView = tr.querySelector('.btn-act-view');
      if (btnView) {
        btnView.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          openViewEmployeeModal(emp.id);
        });
      }

      const btnEdit = tr.querySelector('.btn-act-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          openEditEmployeeModal(emp.id);
        });
      }

      const btnResetPwd = tr.querySelector('.btn-act-reset-pwd');
      if (btnResetPwd) {
        btnResetPwd.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          promptResetEmployeePassword(emp.id);
        });
      }

      const btnStatus = tr.querySelector('.btn-act-status');
      if (btnStatus) {
        btnStatus.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          promptToggleEmployeeStatus(emp.id, emp.accountStatus);
        });
      }

      const btnDelete = tr.querySelector('.btn-act-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          promptDeleteEmployee(emp.id);
        });
      }

      const btnRestore = tr.querySelector('.btn-act-restore');
      if (btnRestore) {
        btnRestore.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllActionDropdowns();
          restoreEmployee(emp.id);
        });
      }

      employeeTableBody.appendChild(tr);
    });
  }

  function resetAllEmployeeFilters() {
    if (inputSearchEmployees) inputSearchEmployees.value = '';
    if (filterEmpDept) filterEmpDept.value = 'ALL';
    if (filterEmpStatus) filterEmpStatus.value = 'ALL';
    if (filterEmpAccountStatus) filterEmpAccountStatus.value = 'ALL';
    renderEmployeeTable();
  }

  function openActionMenu(btn, empId) {
    const targetMenu = document.getElementById(`actionMenu-${empId}`);
    if (!targetMenu) return;

    const isAlreadyOpen = targetMenu.classList.contains('show');
    closeAllActionDropdowns();

    if (isAlreadyOpen) return;

    // Move to body to prevent any overflow clipping from table scroll containers
    if (targetMenu.parentElement !== document.body) {
      document.body.appendChild(targetMenu);
    }

    // Display menu to measure dimensions
    targetMenu.classList.add('show');
    targetMenu.style.position = 'fixed';
    targetMenu.style.zIndex = '99999';
    targetMenu.style.visibility = 'hidden';

    const rect = btn.getBoundingClientRect();
    const menuWidth = targetMenu.offsetWidth || 190;
    const menuHeight = targetMenu.offsetHeight || 175;

    // Viewport boundaries
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    if (spaceBelow < menuHeight + 10 && spaceAbove > spaceBelow) {
      // Open upward above button
      top = Math.max(10, rect.top - menuHeight - 6);
    } else {
      // Open downward below button
      top = Math.min(window.innerHeight - menuHeight - 10, rect.bottom + 6);
    }

    // Align right edge of menu to right edge of button
    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    targetMenu.style.top = `${top}px`;
    targetMenu.style.left = `${left}px`;
    targetMenu.style.right = 'auto';
    targetMenu.style.bottom = 'auto';
    targetMenu.style.visibility = 'visible';
  }

  function closeAllActionDropdowns() {
    document.querySelectorAll('.action-menu-dropdown.show').forEach(m => {
      m.classList.remove('show');
    });
  }

  // Global listeners to close dropdowns when scrolling or clicking outside
  window.addEventListener('scroll', closeAllActionDropdowns, true);
  window.addEventListener('resize', closeAllActionDropdowns);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-action-menu') && !e.target.closest('.action-menu-dropdown')) {
      closeAllActionDropdowns();
    }
  });

  const btnResetEmpFilters = document.getElementById('btnResetEmpFilters');
  if (btnResetEmpFilters) {
    btnResetEmpFilters.addEventListener('click', resetAllEmployeeFilters);
  }

  // ==========================================
  // 12. RENDER ATTENDANCE HISTORY LOG TABLE
  // ==========================================
  function renderAttendanceLogTable(highlightNewest = false) {
    if (!attendanceLogTableBody) return;

    const query = inputSearchLogs ? inputSearchLogs.value.trim().toLowerCase() : '';
    const typeFilter = filterLogEventType ? filterLogEventType.value : 'ALL';

    const filtered = attendanceLogs.filter(log => {
      const matchQuery =
        !query ||
        log.id.toLowerCase().includes(query) ||
        log.empId.toLowerCase().includes(query) ||
        log.empName.toLowerCase().includes(query) ||
        log.department.toLowerCase().includes(query) ||
        log.gate.toLowerCase().includes(query);

      const matchType = typeFilter === 'ALL' || log.eventType === typeFilter;
      return matchQuery && matchType;
    });

    if (filtered.length === 0) {
      attendanceLogTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div>No attendance events match your query.</div>
          </td>
        </tr>
      `;
      return;
    }

    const reversed = filtered.slice().reverse();
    attendanceLogTableBody.innerHTML = '';

    reversed.forEach((log, index) => {
      const tr = document.createElement('tr');
      if (highlightNewest && index === 0) {
        tr.classList.add('new-row-highlight');
      }

      const isEntry = log.eventType === 'ENTRY';

      tr.innerHTML = `
        <td><span class="emp-id-badge" style="color: #A78BFA; background: rgba(167, 139, 250, 0.1);">${log.id}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem;">${log.timestamp}</td>
        <td><span class="emp-id-badge">${log.empId}</span></td>
        <td style="font-weight: 600; color: var(--text-main);">${log.empName}</td>
        <td>${log.department}</td>
        <td>
          <span class="status-badge ${isEntry ? 'present' : 'late'}">
            ${isEntry ? '▲ ENTRY' : '▼ EXIT'}
          </span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${log.gate}</td>
        <td>
          <span style="font-size: 0.72rem; font-family: var(--font-mono); color: var(--status-inside); font-weight: 600;">
            ✓ ${log.status}
          </span>
        </td>
      `;
      attendanceLogTableBody.appendChild(tr);
    });
  }

  // Filter change event bindings
  if (inputSearchAttendance) inputSearchAttendance.addEventListener('input', renderAttendanceRosterTable);
  if (filterAttendanceDept) filterAttendanceDept.addEventListener('change', renderAttendanceRosterTable);
  if (filterAttendanceStatus) filterAttendanceStatus.addEventListener('change', renderAttendanceRosterTable);

  if (inputSearchEmployees) inputSearchEmployees.addEventListener('input', renderEmployeeTable);
  if (filterEmpDept) filterEmpDept.addEventListener('change', renderEmployeeTable);
  if (filterEmpStatus) filterEmpStatus.addEventListener('change', renderEmployeeTable);

  if (inputSearchLogs) inputSearchLogs.addEventListener('input', () => renderAttendanceLogTable(false));
  if (filterLogEventType) filterLogEventType.addEventListener('change', () => renderAttendanceLogTable(false));

  // ==========================================
  // 13. ATTENDANCE CHARTS (PURE VECTOR SVG)
  // Zero external libraries, 100% offline & sharp
  // ==========================================
  function renderAttendanceCharts() {
    const hourlyContainer = document.getElementById('chartHourlyTraffic');
    const fullAnalyticsContainer = document.getElementById('chartAnalyticsFull');
    const donutContainer = document.getElementById('chartPunctualityDonut');

    // Aggregate hourly data: 08:00, 08:30, 09:00, 09:30, 10:00, 11:00, 12:00
    const timeSlots = [
      { label: '08:00 - 08:30', start: '08:00:00', end: '08:30:00', onTime: 0, late: 0 },
      { label: '08:30 - 09:00', start: '08:30:00', end: '09:00:00', onTime: 0, late: 0 },
      { label: '09:00 - 09:30', start: '09:00:00', end: '09:30:00', onTime: 0, late: 0 },
      { label: '09:30 - 10:00', start: '09:30:00', end: '10:00:00', onTime: 0, late: 0 },
      { label: '10:00 - 11:00', start: '10:00:00', end: '11:00:00', onTime: 0, late: 0 },
      { label: '11:00 - 12:00', start: '11:00:00', end: '12:00:00', onTime: 0, late: 0 }
    ];

    attendanceLogs.filter(l => l.eventType === 'ENTRY').forEach(log => {
      const timePart = log.timestamp.split(' ')[1] || '08:45:00';
      const isLate = timePart > SHIFT_START_TIME;
      let matched = false;

      for (let slot of timeSlots) {
        if (timePart >= slot.start && timePart < slot.end) {
          if (isLate) slot.late++;
          else slot.onTime++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (isLate) timeSlots[timeSlots.length - 1].late++;
        else timeSlots[1].onTime++;
      }
    });

    const maxCount = Math.max(4, ...timeSlots.map(s => s.onTime + s.late));

    function buildSvgBarChart(width, height) {
      const paddingLeft = 40;
      const paddingBottom = 30;
      const chartWidth = width - paddingLeft - 20;
      const chartHeight = height - paddingBottom - 20;
      const barWidth = chartWidth / timeSlots.length;

      let barsHtml = '';

      timeSlots.forEach((slot, index) => {
        const totalSlot = slot.onTime + slot.late;
        const totalHeight = totalSlot > 0 ? (totalSlot / maxCount) * chartHeight : 0;
        const onTimeHeight = slot.onTime > 0 ? (slot.onTime / maxCount) * chartHeight : 0;
        const lateHeight = slot.late > 0 ? (slot.late / maxCount) * chartHeight : 0;

        const x = paddingLeft + index * barWidth + barWidth * 0.18;
        const bWidth = barWidth * 0.64;
        const yBase = chartHeight + 10;

        // On-Time Bar
        if (onTimeHeight > 0) {
          barsHtml += `
            <rect x="${x}" y="${yBase - onTimeHeight}" width="${bWidth}" height="${onTimeHeight}" rx="4"
              fill="url(#gradientOnTime)" style="transition: all 0.4s ease;">
              <title>${slot.label}: ${slot.onTime} On-Time entries</title>
            </rect>
          `;
        }

        // Late Bar stacked
        if (lateHeight > 0) {
          barsHtml += `
            <rect x="${x}" y="${yBase - onTimeHeight - lateHeight}" width="${bWidth}" height="${lateHeight}" rx="4"
              fill="url(#gradientLate)" style="transition: all 0.4s ease;">
              <title>${slot.label}: ${slot.late} Late entries</title>
            </rect>
          `;
        }

        // Count label on top of bar
        if (totalSlot > 0) {
          barsHtml += `
            <text x="${x + bWidth / 2}" y="${yBase - totalHeight - 6}" font-family="JetBrains Mono, monospace" font-size="10"
              font-weight="700" fill="var(--text-main)" text-anchor="middle">${totalSlot}</text>
          `;
        }

        // X-axis label
        const shortLabel = slot.label.split(' - ')[0];
        barsHtml += `
          <text x="${x + bWidth / 2}" y="${height - 8}" font-family="Inter, sans-serif" font-size="10"
            fill="var(--text-dim)" text-anchor="middle">${shortLabel}</text>
        `;
      });

      // Background grid lines
      let gridLines = '';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round((maxCount / 4) * i);
        const y = chartHeight + 10 - (chartHeight / 4) * i;
        gridLines += `
          <line x1="${paddingLeft}" y1="${y}" x2="${width - 15}" y2="${y}" stroke="var(--border-subtle)" stroke-width="1" stroke-dasharray="3,3"/>
          <text x="${paddingLeft - 8}" y="${y + 4}" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--text-dim)" text-anchor="end">${val}</text>
        `;
      }

      return `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
          <defs>
            <linearGradient id="gradientOnTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10B981" />
              <stop offset="100%" stop-color="#059669" />
            </linearGradient>
            <linearGradient id="gradientLate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F97316" />
              <stop offset="100%" stop-color="#DC2626" />
            </linearGradient>
          </defs>
          ${gridLines}
          ${barsHtml}
        </svg>
      `;
    }

    if (hourlyContainer) {
      hourlyContainer.innerHTML = buildSvgBarChart(540, 220);
    }
    if (fullAnalyticsContainer) {
      fullAnalyticsContainer.innerHTML = buildSvgBarChart(680, 240);
    }

    // Punctuality Donut Chart
    if (donutContainer) {
      const records = getTodayAttendanceRecords();
      const presentOnTime = records.filter(r => r.statusKey === 'PRESENT_ON_TIME').length;
      const lateArrivals = records.filter(r => r.isLate).length;
      const absentees = records.filter(r => r.statusKey === 'ABSENT').length;
      const total = employees.length || 1;

      const pOnTime = (presentOnTime / total);
      const pLate = (lateArrivals / total);
      const pAbsent = (absentees / total);

      const circumference = 2 * Math.PI * 45; // r = 45 -> ~282.7

      const dashOnTime = circumference * pOnTime;
      const dashLate = circumference * pLate;
      const dashAbsent = circumference * pAbsent;

      const offsetOnTime = 0;
      const offsetLate = -dashOnTime;
      const offsetAbsent = -(dashOnTime + dashLate);

      donutContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap;">
          <div style="position: relative; width: 140px; height: 140px;">
            <svg viewBox="0 0 120 120" style="transform: rotate(-90deg); width: 100%; height: 100%;">
              <circle cx="60" cy="60" r="45" fill="none" stroke="var(--border-subtle)" stroke-width="14"/>
              
              <!-- Present On-Time (Emerald) -->
              <circle cx="60" cy="60" r="45" fill="none" stroke="#10B981" stroke-width="14"
                stroke-dasharray="${dashOnTime} ${circumference}" stroke-dashoffset="${offsetOnTime}" stroke-linecap="round"/>
              
              <!-- Late (Amber/Orange) -->
              <circle cx="60" cy="60" r="45" fill="none" stroke="#F97316" stroke-width="14"
                stroke-dasharray="${dashLate} ${circumference}" stroke-dashoffset="${offsetLate}" stroke-linecap="round"/>

              <!-- Absent (Slate) -->
              <circle cx="60" cy="60" r="45" fill="none" stroke="#64748B" stroke-width="14"
                stroke-dasharray="${dashAbsent} ${circumference}" stroke-dashoffset="${offsetAbsent}" stroke-linecap="round"/>
            </svg>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span style="font-family: var(--font-mono); font-size: 1.3rem; font-weight: 700; color: var(--text-main);">${Math.round(pOnTime * 100)}%</span>
              <span style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">On-Time</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981;"></span>
              <span style="color: var(--text-secondary);">Present On-Time:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main); margin-left: auto;">${presentOnTime} (${Math.round(pOnTime * 100)}%)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #F97316;"></span>
              <span style="color: var(--text-secondary);">Late Arrivals:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main); margin-left: auto;">${lateArrivals} (${Math.round(pLate * 100)}%)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background: #64748B;"></span>
              <span style="color: var(--text-secondary);">Absent / Not Logged:</span>
              <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-main); margin-left: auto;">${absentees} (${Math.round(pAbsent * 100)}%)</span>
            </div>
          </div>
        </div>
      `;
    }

    // Update Phase 4 AI & Workforce Analytics Ledger, Risks & Anomalies
    renderAiAnalyticsDashboard();
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // 13.5. PHASE 4: AI WORKFORCE ANALYTICS DASHBOARD
  // ==========================================
  async function renderAiAnalyticsDashboard() {
    const statEarlyDepartures = document.getElementById('statEarlyDepartures');
    const statTotalOvertime = document.getElementById('statTotalOvertime');
    const statAnomaliesCount = document.getElementById('statAnomaliesCount');
    const analyticsDeptGrid = document.getElementById('analyticsDeptGrid');
    const tablePunctualityBody = document.getElementById('tablePunctualityBody');
    const tableRiskIndicatorsBody = document.getElementById('tableRiskIndicatorsBody');
    const tableAnomaliesBody = document.getElementById('tableAnomaliesBody');

    try {
      const [overviewRes, deptsRes, punctualityRes, risksRes, anomaliesRes] = await Promise.all([
        fetch('/api/analytics/overview').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/departments').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/punctuality').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/risks').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/analytics/anomalies').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      if (overviewRes && overviewRes.summary) {
        if (statEarlyDepartures) statEarlyDepartures.textContent = overviewRes.summary.earlyDeparturesCount || '0';
        if (statTotalOvertime) statTotalOvertime.textContent = `${overviewRes.summary.totalOvertimeHours || 0}h`;
        if (statAnomaliesCount) statAnomaliesCount.textContent = overviewRes.anomaliesCount || '0';
      }

      // 1. Department Breakdown Grid
      if (analyticsDeptGrid && deptsRes && deptsRes.departments) {
        if (deptsRes.departments.length === 0) {
          analyticsDeptGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
              <p>No department telemetry logged yet.</p>
            </div>
          `;
        } else {
          analyticsDeptGrid.innerHTML = deptsRes.departments.map(d => `
            <div class="dept-analytics-card">
              <div class="dept-card-header">
                <span class="dept-card-title">${escapeHtml(d.department)}</span>
                <span class="dept-rate-badge">${d.attendanceRatePercent}% Present</span>
              </div>
              <div class="dept-progress-bar">
                <div class="dept-progress-fill" style="width: ${d.attendanceRatePercent}%;"></div>
              </div>
              <div class="dept-metrics-row">
                <span>Headcount: <strong>${d.presentCount}/${d.totalHeadcount}</strong></span>
                <span>Inside: <strong>${d.insideFacility}</strong> &bull; Out: <strong>${d.outsideFacility}</strong></span>
              </div>
              <div class="dept-metrics-row" style="font-size: 0.74rem; color: var(--text-dim); border-top: 1px solid var(--border-subtle); padding-top: 6px;">
                <span>On-time: <strong>${d.onTimeRatePercent}%</strong></span>
                <span>Late: <strong>${d.lateCount}</strong></span>
                <span>OT: <strong>${d.totalOvertimeHours}h</strong></span>
              </div>
            </div>
          `).join('');
        }
      }

      // 2. Punctuality & Overtime Ledger Table
      if (tablePunctualityBody && punctualityRes && punctualityRes.records) {
        if (punctualityRes.records.length === 0) {
          tablePunctualityBody.innerHTML = `
            <tr>
              <td colspan="8" class="empty-state">
                <p>No workforce attendance logs available for schedule evaluation today.</p>
              </td>
            </tr>
          `;
        } else {
          tablePunctualityBody.innerHTML = punctualityRes.records.map(r => {
            let punctualityBadge = '';
            if (!r.hasCheckedIn) {
              punctualityBadge = `<span class="status-badge absent">Not Logged</span>`;
            } else if (r.isLate) {
              punctualityBadge = `<span class="status-badge checked-out" style="background:#FFFBEB; color:#D97706; border-color:#FDE68A;">Late (+${r.lateMinutes}m)</span>`;
            } else {
              punctualityBadge = `<span class="status-badge verified">On-Time</span>`;
            }

            let earlyBadge = '—';
            if (r.isEarlyDeparture === true) {
              earlyBadge = `<span style="color:#DC2626; font-weight:600;">Early (-${r.earlyMinutes}m)</span>`;
            } else if (r.isEarlyDeparture === false) {
              earlyBadge = `<span style="color:#059669;">Completed</span>`;
            } else if (r.hasCheckedIn) {
              earlyBadge = `<span style="color:var(--text-dim);">Shift In Progress</span>`;
            }

            const durationStr = r.workDurationHours !== null ? `${r.workDurationHours}h` : (r.hasCheckedIn ? 'In Progress' : '—');
            const overtimeStr = r.overtimeHours !== null && r.overtimeHours > 0
              ? `<span style="color:#059669; font-weight:700;">+${r.overtimeHours}h</span>`
              : (r.workDurationHours !== null ? '0.0h' : '—');

            return `
              <tr>
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(r.empName)}</div>
                  <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-dim);">${escapeHtml(r.empId)}</div>
                </td>
                <td>${escapeHtml(r.department)}</td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">${r.entryTime || '—'}</td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">${r.exitTime || '—'}</td>
                <td>${punctualityBadge}</td>
                <td style="font-size: 0.8rem;">${earlyBadge}</td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">${durationStr}</td>
                <td style="font-family: var(--font-mono); font-size: 0.8rem;">${overtimeStr}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // 3. Explainable Absenteeism-Risk Table
      if (tableRiskIndicatorsBody && risksRes && risksRes.indicators) {
        if (risksRes.indicators.length === 0) {
          tableRiskIndicatorsBody.innerHTML = `
            <tr>
              <td colspan="6" class="empty-state">
                <p>No historical attendance data available for risk assessment.</p>
              </td>
            </tr>
          `;
        } else {
          tableRiskIndicatorsBody.innerHTML = risksRes.indicators.map(ind => {
            let riskBadgeClass = 'low';
            let riskLabel = ind.riskLevel;

            if (ind.riskLevel === 'ELEVATED') {
              riskBadgeClass = 'elevated';
            } else if (ind.riskLevel === 'MODERATE') {
              riskBadgeClass = 'moderate';
            } else if (ind.riskLevel === 'INSUFFICIENT_DATA') {
              riskBadgeClass = 'insufficient';
              riskLabel = 'Pending History';
            }

            const factorsList = ind.factors && ind.factors.length > 0
              ? `<ul style="margin: 0; padding-left: 16px; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">${ind.factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
              : `<span style="font-size: 0.76rem; color: var(--text-dim);">No irregular factors documented</span>`;

            const regularityStr = ind.attendanceRatePercent !== null
              ? `<strong>${ind.attendanceRatePercent}%</strong> (${ind.daysAttended}/${ind.daysEvaluated} days)`
              : `<span style="color: var(--text-dim);">Insufficient data</span>`;

            const auditRecommendation = ind.riskLevel === 'ELEVATED'
              ? `<span style="color: #DC2626; font-weight: 600; font-size: 0.78rem;">HR Review Recommended</span>`
              : (ind.riskLevel === 'MODERATE'
                ? `<span style="color: #D97706; font-size: 0.78rem;">Routine Monitoring</span>`
                : `<span style="color: #059669; font-size: 0.78rem;">Normal Parameters</span>`);

            return `
              <tr>
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(ind.empName)}</div>
                  <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-dim);">${escapeHtml(ind.empId)}</div>
                </td>
                <td>
                  <div>${escapeHtml(ind.department)}</div>
                  <div style="font-size: 0.74rem; color: var(--text-dim);">${escapeHtml(ind.role)}</div>
                </td>
                <td><span class="risk-badge ${riskBadgeClass}">${riskLabel}</span></td>
                <td style="font-size: 0.8rem;">${regularityStr}</td>
                <td>${factorsList}</td>
                <td>${auditRecommendation}</td>
              </tr>
            `;
          }).join('');
        }
      }

      // 4. Anomaly Log Table
      if (tableAnomaliesBody && anomaliesRes && anomaliesRes.anomalies) {
        if (anomaliesRes.anomalies.length === 0) {
          tableAnomaliesBody.innerHTML = `
            <tr>
              <td colspan="6" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p>Zero gate telemetry discrepancies detected across logged events.</p>
              </td>
            </tr>
          `;
        } else {
          tableAnomaliesBody.innerHTML = anomaliesRes.anomalies.map(anom => {
            const pillClass = anom.severity === 'NOTICE' ? 'notice' : 'info';
            return `
              <tr>
                <td><span class="anomaly-pill ${pillClass}">${escapeHtml(anom.type)}</span></td>
                <td style="font-size: 0.76rem; font-weight: 600; color: var(--text-secondary);">${escapeHtml(anom.severity)}</td>
                <td>
                  <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(anom.empName)}</div>
                  <div style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-dim);">${escapeHtml(anom.empId)}</div>
                </td>
                <td>
                  <div style="font-family: var(--font-mono); font-size: 0.78rem;">${escapeHtml(anom.eventId)}</div>
                  <div style="font-size: 0.74rem; color: var(--text-dim);">${escapeHtml(anom.timestamp)}</div>
                </td>
                <td style="font-size: 0.78rem;">${escapeHtml(anom.gate)}</td>
                <td>
                  <div style="font-size: 0.78rem; color: var(--text-main); font-weight: 500;">${escapeHtml(anom.summary)}</div>
                  <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 2px;">${escapeHtml(anom.recommendedAction)}</div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

    } catch (err) {
      console.warn('AI Analytics Dashboard fetch skipped or failed:', err);
    }
  }

  // ==========================================
  // 14. PHASE 5A: VIRTUAL RFID HARDWARE SIMULATION ENGINE
  // Emulates contactless smart card scans, RFID antenna sensing,
  // 5-second duplicate debounce protection, and real-time telemetry console.
  // ==========================================
  async function executeSmartCardScan(targetEmpIdOrOptions, modeOverride = 'AUTO') {
    let targetUid = null;
    let targetEmpId = null;
    let mode = modeOverride;
    let gateLocation = selectGateLocation ? selectGateLocation.value : 'Gate 01 - Main Turnstile';
    let deviceId = 'VIRTUAL-RFID-SIM-01';
    let simDistance = sliderReadDistance ? parseFloat(sliderReadDistance.value) : 1.2;
    let simRssi = sliderSignalRssi ? parseInt(sliderSignalRssi.value, 10) : -58;

    if (typeof targetEmpIdOrOptions === 'object' && targetEmpIdOrOptions !== null) {
      targetEmpId = targetEmpIdOrOptions.empId || null;
      targetUid = targetEmpIdOrOptions.uid || null;
      if (targetEmpIdOrOptions.mode) mode = targetEmpIdOrOptions.mode;
      if (targetEmpIdOrOptions.gate) gateLocation = targetEmpIdOrOptions.gate;
      if (targetEmpIdOrOptions.deviceId) deviceId = targetEmpIdOrOptions.deviceId;
      if (targetEmpIdOrOptions.simulatedDistance !== undefined) simDistance = targetEmpIdOrOptions.simulatedDistance;
      if (targetEmpIdOrOptions.simulatedRssi !== undefined) simRssi = targetEmpIdOrOptions.simulatedRssi;
    } else if (typeof targetEmpIdOrOptions === 'string') {
      const trimmed = targetEmpIdOrOptions.trim();
      const empMatch = employees.find(e => e.id.toUpperCase() === trimmed.toUpperCase());
      if (empMatch) {
        targetEmpId = empMatch.id;
        targetUid = empMatch.uid;
      } else {
        const uidMatch = employees.find(e => e.uid.toUpperCase() === trimmed.toUpperCase());
        if (uidMatch) {
          targetEmpId = uidMatch.id;
          targetUid = uidMatch.uid;
        } else {
          // Raw UID (e.g. unknown card test)
          targetUid = trimmed;
        }
      }
    }

    // Default fallback to selectEmployee or inputCustomUid
    if (!targetUid && !targetEmpId) {
      if (inputCustomUid && inputCustomUid.value.trim()) {
        targetUid = inputCustomUid.value.trim().toUpperCase();
      } else if (selectEmployee && selectEmployee.value) {
        targetEmpId = selectEmployee.value;
        const e = employees.find(emp => emp.id === targetEmpId);
        if (e) targetUid = e.uid;
      }
    }

    const resolvedEmp = employees.find(e => 
      (targetEmpId && e.id === targetEmpId) || 
      (targetUid && e.uid.toUpperCase() === targetUid.toUpperCase())
    );

    // Visual antenna & card stage animation
    if (virtualCard) virtualCard.classList.add('tapping');
    if (scannerAntenna) scannerAntenna.classList.add('active-scan');
    
    // Status indicators
    const displayIdentifier = targetUid || targetEmpId || 'CARD';
    if (scannerLcdScreen) {
      scannerLcdScreen.textContent = `[SENSING UID ${displayIdentifier}] ...`;
    }
    if (diagStatusPill) {
      diagStatusPill.textContent = 'SENSING RF...';
      diagStatusPill.className = 'diag-status-pill sensing';
    }
    if (diagSimUid) diagSimUid.textContent = displayIdentifier;
    if (diagSimEmp) diagSimEmp.textContent = resolvedEmp ? `${resolvedEmp.name} (${resolvedEmp.id})` : '[Unregistered Card]';
    if (diagSimGate) diagSimGate.textContent = gateLocation.split('-')[0].trim() + ` • ${deviceId}`;
    if (diagSimTelemetry) diagSimTelemetry.textContent = `Dist: ${simDistance.toFixed(1)}m | RSSI: ${simRssi} dBm | 13.56MHz`;
    if (diagSimResponse) diagSimResponse.textContent = 'Transmitting HTTP POST...';

    const startTime = performance.now();

    try {
      const payload = {
        mode,
        gate: gateLocation,
        deviceId,
        simulatedDistance: simDistance,
        simulatedRssi: simRssi
      };
      if (targetUid) payload.uid = targetUid;
      if (targetEmpId) payload.empId = targetEmpId;

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        
        // Handle UNKNOWN_UID 404 (Unregistered Card Safe Rejection)
        if (res.status === 404 && (errJson.code === 'UNKNOWN_UID' || errJson.code === 'EMPLOYEE_NOT_FOUND')) {
          playScannerBuzz();
          if (diagSimResponse) diagSimResponse.textContent = `HTTP 404 Not Found (${latencyMs}ms)`;
          if (diagSimAttendance) diagSimAttendance.textContent = 'Zero state changes recorded';
          if (diagStatusPill) {
            diagStatusPill.textContent = 'REJECTED';
            diagStatusPill.className = 'diag-status-pill error';
          }
          if (diagOutcomeBanner) {
            diagOutcomeBanner.className = 'diag-outcome-banner rejected';
            if (diagOutcomeIcon) diagOutcomeIcon.textContent = '✕';
            if (diagOutcomeTitle) diagOutcomeTitle.textContent = `Access Denied: Unregistered UID ${displayIdentifier}`;
            if (diagOutcomeDesc) diagOutcomeDesc.textContent = `Smart Card UID '${displayIdentifier}' is not registered to any employee in SQLite. Access blocked safely.`;
          }
          if (scannerLcdScreen) {
            scannerLcdScreen.innerHTML = `<span style="color: #DC2626; font-weight: 700;">ACCESS DENIED: Unregistered UID ${displayIdentifier} (404)</span>`;
          }
          showToast(`Unknown Card: UID '${displayIdentifier}' rejected with HTTP 404. Zero changes recorded.`, 'exit');
          return { error: true, code: 'UNKNOWN_UID', status: 404 };
        }

        throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();

      // Handle 5-Second Duplicate Read Protection (Debounce)
      if (data.ignored) {
        playScannerWarning();
        if (diagSimResponse) diagSimResponse.textContent = `HTTP 200 OK (${latencyMs}ms)`;
        if (diagSimEmp) diagSimEmp.textContent = data.employee ? `${data.employee.name} (${data.employee.id})` : displayIdentifier;
        if (diagSimAttendance) diagSimAttendance.textContent = `Status Unchanged (${data.employee ? data.employee.status : 'Active'})`;
        if (diagStatusPill) {
          diagStatusPill.textContent = 'DEBOUNCED';
          diagStatusPill.className = 'diag-status-pill sensing';
        }
        if (diagOutcomeBanner) {
          diagOutcomeBanner.className = 'diag-outcome-banner debounced';
          if (diagOutcomeIcon) diagOutcomeIcon.textContent = '⏱';
          if (diagOutcomeTitle) diagOutcomeTitle.textContent = 'Debounce Active: Duplicate Read Ignored';
          if (diagOutcomeDesc) diagOutcomeDesc.textContent = `${data.message} Anti-bounce window protected database from duplicate log.`;
        }
        if (scannerLcdScreen) {
          scannerLcdScreen.innerHTML = `
            <span style="color: #D97706; font-weight: 700;">
              DEBOUNCE GUARD &bull; Repeated tap ignored within 5s (${data.employee ? data.employee.id : 'Card'})
            </span>
          `;
        }
        showToast(data.message || 'Duplicate scan ignored within 5 seconds.', 'exit');
        return data;
      }

      // Valid attendance event logged!
      const newLog = data.event;
      const updatedEmp = data.employee;

      // Update in-memory state
      const idx = employees.findIndex(e => e.id === updatedEmp.id);
      if (idx !== -1) {
        employees[idx] = updatedEmp;
      }
      attendanceLogs.push(newLog);
      if (typeof updateSyncFingerprint === 'function') {
        updateSyncFingerprint();
      }

      const isEntry = newLog.eventType === 'ENTRY';
      playScannerBeep(isEntry);

      if (diagSimResponse) diagSimResponse.textContent = `HTTP 200 OK (${latencyMs}ms)`;
      if (diagSimEmp) diagSimEmp.textContent = `${updatedEmp.name} (${updatedEmp.id}) - ${updatedEmp.department}`;
      if (diagSimAttendance) diagSimAttendance.textContent = `Status: ${updatedEmp.status} (${newLog.eventType})`;
      if (diagStatusPill) {
        diagStatusPill.textContent = 'GRANTED';
        diagStatusPill.className = 'diag-status-pill';
      }
      if (diagOutcomeBanner) {
        diagOutcomeBanner.className = 'diag-outcome-banner granted';
        if (diagOutcomeIcon) diagOutcomeIcon.textContent = '✓';
        if (diagOutcomeTitle) diagOutcomeTitle.textContent = `Access Granted: ${newLog.eventType}`;
        if (diagOutcomeDesc) diagOutcomeDesc.textContent = `${updatedEmp.name} (${updatedEmp.id}) registered at ${gateLocation}. Status is now ${updatedEmp.status}.`;
      }

      if (scannerLcdScreen) {
        scannerLcdScreen.innerHTML = `
          <span style="color: ${isEntry ? '#047857' : '#C2410C'}; font-weight: 700;">
            ACCESS GRANTED: ${newLog.eventType} &bull; ${updatedEmp.id} (${updatedEmp.name})
          </span>
        `;
      }

      showToast(`${newLog.eventType}: ${updatedEmp.name} (${updatedEmp.id}) at ${gateLocation.split('-')[0].trim()}`, isEntry ? 'entry' : 'exit');

      // Synchronize All Views & Phase 4 Analytics
      updateKPIs();
      updateDepartmentGrid();
      updateStreamList();
      populateEmployeeSelect();
      if (selectEmployee) selectEmployee.value = updatedEmp.id;
      updateVirtualCardPreview(updatedEmp.id);
      renderAttendanceRosterTable();
      renderOverviewRosterSnapshot();
      renderEmployeeTable();
      renderAttendanceLogTable(true);
      renderAttendanceCharts();
      if (typeof renderAiAnalyticsDashboard === 'function') {
        renderAiAnalyticsDashboard();
      }

      return data;

    } catch (err) {
      console.error('Simulation Scan Error:', err);
      playScannerBuzz();
      if (diagSimResponse) diagSimResponse.textContent = 'HTTP Request Failed';
      if (diagStatusPill) {
        diagStatusPill.textContent = 'OFFLINE / ERROR';
        diagStatusPill.className = 'diag-status-pill error';
      }
      if (diagOutcomeBanner) {
        diagOutcomeBanner.className = 'diag-outcome-banner rejected';
        if (diagOutcomeIcon) diagOutcomeIcon.textContent = '✕';
        if (diagOutcomeTitle) diagOutcomeTitle.textContent = 'Simulation Error';
        if (diagOutcomeDesc) diagOutcomeDesc.textContent = `${err.message}. Check that the Node.js server is running on port 3000.`;
      }
      if (scannerLcdScreen) {
        scannerLcdScreen.innerHTML = `<span style="color: #DC2626; font-weight: 700;">SERVER ERROR: ${err.message}</span>`;
      }
      showToast(`Scan Error: ${err.message}`, 'exit');
      return { error: true, message: err.message };
    } finally {
      setTimeout(() => {
        if (virtualCard) virtualCard.classList.remove('tapping');
        if (scannerAntenna) scannerAntenna.classList.remove('active-scan');
      }, 450);
      if (typeof fetchSimulationReport === 'function') {
        fetchSimulationReport();
      }
    }
  }

  // Simulation Trigger Listeners
  // 1. Single Scan Button
  if (btnSimulateScan) {
    btnSimulateScan.addEventListener('click', () => {
      const customUid = inputCustomUid ? inputCustomUid.value.trim() : '';
      const checkedMode = document.querySelector('input[name="scanMode"]:checked');
      const selectedMode = checkedMode ? checkedMode.value : 'AUTO';
      if (customUid) {
        executeSmartCardScan({ uid: customUid, mode: selectedMode });
      } else {
        const selectedEmpId = selectEmployee ? selectEmployee.value : null;
        executeSmartCardScan({ empId: selectedEmpId, mode: selectedMode });
      }
    });
  }

  // 2. Burst Repeat Scan Button (Debounce Verification)
  if (btnBurstDebounceScan) {
    btnBurstDebounceScan.addEventListener('click', async () => {
      btnBurstDebounceScan.disabled = true;
      const customUid = inputCustomUid ? inputCustomUid.value.trim() : '';
      const currentEmp = employees.find(e => e.id === (selectEmployee ? selectEmployee.value : '')) || employees[0];
      const targetUid = customUid || (currentEmp ? currentEmp.uid : '7E:A1:39:B2');

      showToast('Burst Test: Sending initial tap...', 'entry');
      await executeSmartCardScan({ uid: targetUid, mode: 'AUTO' });

      // Immediate second tap within 150ms to demonstrate debounce
      setTimeout(async () => {
        showToast('Burst Test: Rapid 2nd tap (<200ms)... testing debounce!', 'exit');
        await executeSmartCardScan({ uid: targetUid, mode: 'AUTO' });
        btnBurstDebounceScan.disabled = false;
      }, 150);
    });
  }

  // 3. Unknown Card Test Button (404 Check)
  if (btnUnknownCardTest) {
    btnUnknownCardTest.addEventListener('click', () => {
      const unknownUid = 'FF:EE:DD:CC';
      if (inputCustomUid) inputCustomUid.value = unknownUid;
      if (cardEmpName) cardEmpName.textContent = 'Unregistered Smart Badge';
      if (cardEmpRole) cardEmpRole.textContent = 'External Test Card';
      if (cardEmpId) cardEmpId.textContent = 'UNENROLLED';
      if (cardEmpUid) cardEmpUid.textContent = unknownUid;
      if (cardAvatar) {
        cardAvatar.textContent = '??';
        cardAvatar.style.backgroundColor = '#64748B';
      }
      executeSmartCardScan({ uid: unknownUid, mode: 'AUTO' });
    });
  }

  // 4. Multi-Employee Rush Simulation (Batch 4x)
  if (btnMultiEmployeeBatch) {
    btnMultiEmployeeBatch.addEventListener('click', async () => {
      btnMultiEmployeeBatch.disabled = true;
      const batchList = employees.slice(0, 4);
      if (batchList.length === 0) {
        btnMultiEmployeeBatch.disabled = false;
        return;
      }

      showToast(`Starting Multi-Employee Rush Simulation (${batchList.length} employees)...`, 'entry');

      for (let i = 0; i < batchList.length; i++) {
        const emp = batchList[i];
        if (selectEmployee) selectEmployee.value = emp.id;
        if (inputCustomUid) inputCustomUid.value = emp.uid;
        updateVirtualCardPreview(emp.id);

        if (scannerLcdScreen) {
          scannerLcdScreen.textContent = `[RUSH ${i + 1}/${batchList.length}] Scanning ${emp.name} (${emp.id})...`;
        }

        await executeSmartCardScan({ uid: emp.uid, mode: 'AUTO' });

        if (i < batchList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 550));
        }
      }

      showToast(`Rush simulation complete: ${batchList.length} workforce cards processed!`, 'entry');
      btnMultiEmployeeBatch.disabled = false;
    });
  }

  // Quick Demo Tap Button (Preserved)
  if (btnQuickDemoTap) {
    btnQuickDemoTap.addEventListener('click', () => {
      const randomIndex = Math.floor(Math.random() * employees.length);
      const randomEmp = employees[randomIndex];
      if (selectEmployee) selectEmployee.value = randomEmp.id;
      if (inputCustomUid) inputCustomUid.value = randomEmp.uid;
      updateVirtualCardPreview(randomEmp.id);
      executeSmartCardScan({ empId: randomEmp.id, uid: randomEmp.uid, mode: 'AUTO' });
    });
  }

  // Preset Chips Listeners
  if (btnChipUseSelected) {
    btnChipUseSelected.addEventListener('click', () => {
      const currentEmp = employees.find(e => e.id === (selectEmployee ? selectEmployee.value : ''));
      if (currentEmp && inputCustomUid) {
        inputCustomUid.value = currentEmp.uid;
        updateVirtualCardPreview(currentEmp.id);
      }
    });
  }

  if (btnChipUnknown) {
    btnChipUnknown.addEventListener('click', () => {
      if (inputCustomUid) {
        inputCustomUid.value = 'FF:EE:DD:CC';
        inputCustomUid.dispatchEvent(new Event('input'));
      }
    });
  }

  if (btnChipInvalid) {
    btnChipInvalid.addEventListener('click', () => {
      if (inputCustomUid) {
        inputCustomUid.value = 'BAD_HEX';
        inputCustomUid.dispatchEvent(new Event('input'));
      }
    });
  }

  if (btnChipRandomEmp) {
    btnChipRandomEmp.addEventListener('click', () => {
      const randomIndex = Math.floor(Math.random() * employees.length);
      const randomEmp = employees[randomIndex];
      if (selectEmployee) selectEmployee.value = randomEmp.id;
      if (inputCustomUid) inputCustomUid.value = randomEmp.uid;
      updateVirtualCardPreview(randomEmp.id);
    });
  }

  // Sliders Live Listeners
  if (sliderReadDistance && valReadDistance) {
    sliderReadDistance.addEventListener('input', () => {
      valReadDistance.textContent = `${parseFloat(sliderReadDistance.value).toFixed(1)} m`;
    });
  }

  if (sliderSignalRssi && valSignalRssi) {
    sliderSignalRssi.addEventListener('input', () => {
      const rssi = parseInt(sliderSignalRssi.value, 10);
      let quality = 'Weak';
      if (rssi >= -50) quality = 'Strong';
      else if (rssi >= -65) quality = 'Optimal';
      else if (rssi >= -75) quality = 'Good';
      valSignalRssi.textContent = `${rssi} dBm • ${quality}`;
    });
  }

  // Clear Simulator Stream Button
  if (btnClearSimLogs && terminalLogPreview) {
    btnClearSimLogs.addEventListener('click', () => {
      terminalLogPreview.innerHTML = '<div style="padding: 12px; color: var(--text-dim); text-align: center; font-size: 0.8rem;">Simulation telemetry log cleared.</div>';
    });
  }

  // ==========================================
  // 14.5. PHASE 5B: VIRTUAL RFID VALIDATION & SIMULATION REPORT
  // ==========================================
  async function fetchSimulationReport() {
    try {
      const res = await fetch('/api/simulation/report');
      if (!res.ok) return null;
      const data = await res.json();
      renderSimulationReport(data);
      return data;
    } catch (err) {
      console.warn('Failed to fetch simulation report:', err);
      return null;
    }
  }

  function renderSimulationReport(report) {
    if (!report) return;

    const simRepTimestamp = document.getElementById('simRepTimestamp');
    const simRepTotalAttempts = document.getElementById('simRepTotalAttempts');
    const simRepAccepted = document.getElementById('simRepAccepted');
    const simRepEntriesExits = document.getElementById('simRepEntriesExits');
    const simRepDebounced = document.getElementById('simRepDebounced');
    const simRepUnknown = document.getElementById('simRepUnknown');
    const simRepAnomaliesCount = document.getElementById('simRepAnomaliesCount');
    const simRepAnomalyTypes = document.getElementById('simRepAnomalyTypes');
    const simRepOccupancy = document.getElementById('simRepOccupancy');
    const simRepInsideOutsideCount = document.getElementById('simRepInsideOutsideCount');
    const simRepHeadcountTag = document.getElementById('simRepHeadcountTag');
    const simRepRosterChips = document.getElementById('simRepRosterChips');

    const summary = report.sessionSummary || {};
    const seq = report.sequenceAudit || {};
    const states = report.finalEmployeeStates || {};

    if (simRepTimestamp) {
      simRepTimestamp.textContent = `Generated: ${report.reportTimestampFormatted || '--'}`;
    }
    if (simRepTotalAttempts) simRepTotalAttempts.textContent = summary.totalAttempts || 0;
    if (simRepAccepted) simRepAccepted.textContent = summary.acceptedScans || 0;
    if (simRepEntriesExits) {
      simRepEntriesExits.textContent = `${summary.entriesLogged || 0} IN • ${summary.exitsLogged || 0} OUT`;
    }
    if (simRepDebounced) simRepDebounced.textContent = summary.debouncedReads || 0;
    if (simRepUnknown) simRepUnknown.textContent = summary.rejectedUnknownUids || 0;
    if (simRepAnomaliesCount) simRepAnomaliesCount.textContent = seq.totalAnomaliesDetected || 0;
    if (simRepAnomalyTypes) {
      simRepAnomalyTypes.textContent = `${seq.unpairedEntriesCount || 0} unpaired • ${seq.rapidTransitionsCount || 0} rapid`;
    }
    if (simRepOccupancy) simRepOccupancy.textContent = `${states.occupancyRatePercent || 0}%`;
    if (simRepInsideOutsideCount) {
      simRepInsideOutsideCount.textContent = `${states.insideCount || 0} Inside • ${states.outsideCount || 0} Outside`;
    }
    if (simRepHeadcountTag) {
      simRepHeadcountTag.textContent = `${states.totalEmployees || 0} Employees Enrolled`;
    }

    if (simRepRosterChips && states.employees) {
      simRepRosterChips.innerHTML = states.employees.map(emp => {
        const isInside = emp.status === 'INSIDE';
        return `
          <div class="sim-emp-chip ${isInside ? 'inside' : 'outside'}" title="${escapeHtml(emp.name)} (${emp.id}) • Status: ${emp.status}">
            <span class="sim-emp-chip-dot"></span>
            <span style="font-weight: 600;">${emp.id}</span>
            <span style="color: var(--text-dim); font-size: 0.65rem;">${emp.status}</span>
          </div>
        `;
      }).join('');
    }
  }

  async function resetSimulationReportMetrics() {
    try {
      const res = await fetch('/api/simulation/report', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': getCsrfToken() }
      });
      if (!res.ok) throw new Error('Failed to reset simulation metrics');
      const data = await res.json();
      showToast('Simulation metrics reset to zero. Attendance logs & database remain intact.', 'entry');
      await fetchSimulationReport();
    } catch (err) {
      showToast(`Error resetting simulation metrics: ${err.message}`, 'exit');
    }
  }

  // Phase 5B Simulation Report Actions
  if (btnRefreshSimReport) {
    btnRefreshSimReport.addEventListener('click', async () => {
      showToast('Refreshing simulation report...', 'entry');
      await fetchSimulationReport();
    });
  }

  if (btnResetSimReport) {
    btnResetSimReport.addEventListener('click', async () => {
      await resetSimulationReportMetrics();
    });
  }

  // ==========================================
  // 15. CSV EXPORT & AUDIT ACTIONS
  // ==========================================
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      if (attendanceLogs.length === 0) {
        alert('No attendance events to export.');
        return;
      }

      const headers = ['Event_ID', 'Timestamp', 'Employee_ID', 'Employee_Name', 'Department', 'Event_Type', 'Gate_Location', 'Verification_Status'];
      const csvRows = [headers.join(',')];

      attendanceLogs.forEach(row => {
        const values = [
          `"${row.id}"`,
          `"${row.timestamp}"`,
          `"${row.empId}"`,
          `"${row.empName.replace(/"/g, '""')}"`,
          `"${row.department}"`,
          `"${row.eventType}"`,
          `"${row.gate.replace(/"/g, '""')}"`,
          `"${row.status}"`
        ];
        csvRows.push(values.join(','));
      });

      downloadCsvFile(csvRows.join('\r\n'), `SmartWorkforce_Gate_Audit_Log_${Date.now()}.csv`);
      showToast('Gate history exported as CSV!', 'entry');
    });
  }

  if (btnExportAttendanceCSV) {
    btnExportAttendanceCSV.addEventListener('click', () => {
      const records = getTodayAttendanceRecords();
      const headers = ['Employee_ID', 'Employee_Name', 'Department', 'Role', 'Card_UID', 'Check_In_Time', 'Check_Out_Time', 'Duration', 'Attendance_Status'];
      const csvRows = [headers.join(',')];

      records.forEach(r => {
        const values = [
          `"${r.id}"`,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.department}"`,
          `"${r.role.replace(/"/g, '""')}"`,
          `"${r.uid}"`,
          `"${r.checkInTime}"`,
          `"${r.checkOutTime}"`,
          `"${r.durationStr}"`,
          `"${r.statusLabel}"`
        ];
        csvRows.push(values.join(','));
      });

      downloadCsvFile(csvRows.join('\r\n'), `SmartWorkforce_Daily_Attendance_Roster_${Date.now()}.csv`);
      showToast('Attendance roster exported as CSV!', 'entry');
    });
  }

  function downloadCsvFile(csvString, fileName) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      if (confirm('Clear attendance history log from persistent SQLite database? Active employee inside/outside states will remain preserved.')) {
        try {
          const res = await fetch('/api/attendance/logs', {
            method: 'DELETE',
            headers: { 'X-CSRF-Token': getCsrfToken() }
          });
          if (!res.ok) throw new Error('Server failed to clear database logs');
          attendanceLogs = [];
          updateKPIs();
          updateStreamList();
          renderAttendanceLogTable(false);
          renderAttendanceRosterTable();
          renderOverviewRosterSnapshot();
          renderAttendanceCharts();
          showToast('Gate audit logs cleared from SQLite database.', 'exit');
        } catch (err) {
          alert('Error clearing logs: ' + err.message);
        }
      }
    });
  }

  // ==========================================
  // 16. EMPLOYEE MANAGEMENT MODAL (PHASE 3: ADMIN-CREATED EMPLOYEE ACCOUNTS)
  // ==========================================
  let activeCreatedCredentials = null;

  function resetAddEmployeeModalState() {
    if (formAddEmployee) {
      formAddEmployee.reset();
      formAddEmployee.style.display = 'block';
    }
    if (stageEmployeeCredentials) {
      stageEmployeeCredentials.style.display = 'none';
    }
    if (modalAddEmployeeTitle) {
      const span = modalAddEmployeeTitle.querySelector('span');
      if (span) span.textContent = 'Register New Workforce Member';
    }
    // Clear validation error displays
    if (newEmpEmailError) {
      newEmpEmailError.textContent = '';
      newEmpEmailError.style.display = 'none';
    }
    if (newEmpPhoneError) {
      newEmpPhoneError.textContent = '';
      newEmpPhoneError.style.display = 'none';
    }
    if (modalAddEmployeeError) {
      modalAddEmployeeError.textContent = '';
      modalAddEmployeeError.style.display = 'none';
    }
    if (newEmpEmail) newEmpEmail.style.borderColor = '';
    if (newEmpPhone) newEmpPhone.style.borderColor = '';

    // Clear displayed credentials from memory and DOM
    activeCreatedCredentials = null;
    if (dispCredEmpId) dispCredEmpId.textContent = 'EMP-XXX';
    if (dispCredPassword) dispCredPassword.textContent = '••••••••••••••';
    if (dispCredEmail) dispCredEmail.textContent = '--';
    if (rowCredEmail) rowCredEmail.style.display = 'none';
    if (dispCredPhone) dispCredPhone.textContent = '--';
    if (rowCredPhone) rowCredPhone.style.display = 'none';
    if (dispCredCardUid) dispCredCardUid.textContent = '--:--:--:--';
    if (rowCredCardUid) rowCredCardUid.style.display = 'none';
    if (typeof populateOrgDropdowns === 'function') {
      populateOrgDropdowns();
    }
    const newEmpOrgUnit = document.getElementById('newEmpOrgUnit');
    const newEmpJobTitle = document.getElementById('newEmpJobTitle');
    const newEmpManager = document.getElementById('newEmpManager');
    const newEmpAccessRole = document.getElementById('newEmpAccessRole');
    if (newEmpOrgUnit) newEmpOrgUnit.value = '';
    if (newEmpJobTitle) newEmpJobTitle.value = '';
    if (newEmpManager) newEmpManager.value = '';
    if (newEmpAccessRole) newEmpAccessRole.value = '';

    const btnSubmit = document.getElementById('btnSubmitAddEmployee');
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Create Employee & Account';
    }
  }

  function closeAddEmployeeModal() {
    if (modalAddEmployee) {
      modalAddEmployee.classList.remove('open');
    }
    resetAddEmployeeModalState();
  }

  if (btnOpenAddEmployeeModal) {
    btnOpenAddEmployeeModal.addEventListener('click', () => {
      resetAddEmployeeModalState();
      modalAddEmployee.classList.add('open');
      if (newEmpName) newEmpName.focus();
    });
  }

  if (btnCloseAddEmployeeModal) {
    btnCloseAddEmployeeModal.addEventListener('click', closeAddEmployeeModal);
  }
  if (btnCancelAddEmployee) {
    btnCancelAddEmployee.addEventListener('click', closeAddEmployeeModal);
  }
  if (btnDoneAddEmployee) {
    btnDoneAddEmployee.addEventListener('click', closeAddEmployeeModal);
  }

  if (btnGenUid) {
    btnGenUid.addEventListener('click', () => {
      if (newEmpUid) {
        newEmpUid.value = generateRandomCardUid();
      }
    });
  }

  if (newEmpEmail) {
    newEmpEmail.addEventListener('input', () => {
      if (newEmpEmailError) {
        newEmpEmailError.textContent = '';
        newEmpEmailError.style.display = 'none';
      }
      newEmpEmail.style.borderColor = '';
      if (modalAddEmployeeError) modalAddEmployeeError.style.display = 'none';
    });
  }

  if (newEmpPhone) {
    newEmpPhone.addEventListener('input', () => {
      if (newEmpPhoneError) {
        newEmpPhoneError.textContent = '';
        newEmpPhoneError.style.display = 'none';
      }
      newEmpPhone.style.borderColor = '';
      if (modalAddEmployeeError) modalAddEmployeeError.style.display = 'none';
    });
  }

  if (formAddEmployee) {
    formAddEmployee.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Clear previous validation errors
      if (newEmpEmailError) {
        newEmpEmailError.textContent = '';
        newEmpEmailError.style.display = 'none';
      }
      if (newEmpPhoneError) {
        newEmpPhoneError.textContent = '';
        newEmpPhoneError.style.display = 'none';
      }
      if (modalAddEmployeeError) {
        modalAddEmployeeError.textContent = '';
        modalAddEmployeeError.style.display = 'none';
      }
      if (newEmpEmail) newEmpEmail.style.borderColor = '';
      if (newEmpPhone) newEmpPhone.style.borderColor = '';

      const name = newEmpName ? newEmpName.value.trim() : '';
      const department = newEmpDept ? newEmpDept.value : '';
      const role = newEmpRole ? newEmpRole.value.trim() : '';
      const email = newEmpEmail ? newEmpEmail.value.trim() : '';
      const phone = newEmpPhone ? newEmpPhone.value.trim() : '';
      const rawUid = newEmpUid ? newEmpUid.value.trim() : '';
      const uid = rawUid ? rawUid.toUpperCase() : null;

      if (!name || !department || !role) {
        if (modalAddEmployeeError) {
          modalAddEmployeeError.textContent = 'Please fill out all required fields: Full Name, Department, and Designation.';
          modalAddEmployeeError.style.display = 'block';
        } else {
          alert('Please fill out all required fields: Full Name, Department, and Designation.');
        }
        return;
      }

      // Validate name has at least 4 alphabetic letters for temporary password generation
      const nameLetters = name.match(/[a-zA-Z]/g);
      if (!nameLetters || nameLetters.length < 4) {
        if (modalAddEmployeeError) {
          modalAddEmployeeError.textContent = 'Employee full name must contain at least 4 alphabetic letters to generate the temporary password.';
          modalAddEmployeeError.style.display = 'block';
        }
        if (newEmpName) {
          newEmpName.style.borderColor = '#EF4444';
          newEmpName.focus();
        }
        return;
      }

      // 1. Email format and duplicate validation
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        if (newEmpEmailError) {
          newEmpEmailError.textContent = 'Employee Gmail / Email ID is required.';
          newEmpEmailError.style.display = 'block';
        }
        if (newEmpEmail) {
          newEmpEmail.style.borderColor = '#EF4444';
          newEmpEmail.focus();
        }
        return;
      }
      if (!EMAIL_REGEX.test(email)) {
        if (newEmpEmailError) {
          newEmpEmailError.textContent = 'Please enter a valid email address (e.g. employee@gmail.com).';
          newEmpEmailError.style.display = 'block';
        }
        if (newEmpEmail) {
          newEmpEmail.style.borderColor = '#EF4444';
          newEmpEmail.focus();
        }
        return;
      }
      const duplicateEmp = employees.find(e => e.email && e.email.toLowerCase() === email.toLowerCase());
      if (duplicateEmp) {
        if (newEmpEmailError) {
          newEmpEmailError.textContent = `An employee with email "${email}" already exists in this company (${duplicateEmp.name} - ${duplicateEmp.id}).`;
          newEmpEmailError.style.display = 'block';
        }
        if (newEmpEmail) {
          newEmpEmail.style.borderColor = '#EF4444';
          newEmpEmail.focus();
        }
        return;
      }

      // 2. Phone format validation
      const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
      const phoneDigits = phone.replace(/\D/g, '');
      if (!phone) {
        if (newEmpPhoneError) {
          newEmpPhoneError.textContent = 'Phone number is required.';
          newEmpPhoneError.style.display = 'block';
        }
        if (newEmpPhone) {
          newEmpPhone.style.borderColor = '#EF4444';
          newEmpPhone.focus();
        }
        return;
      }
      if (!PHONE_REGEX.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        if (newEmpPhoneError) {
          newEmpPhoneError.textContent = 'Please enter a valid phone number with 7 to 15 digits (e.g. +91 98765 43210).';
          newEmpPhoneError.style.display = 'block';
        }
        if (newEmpPhone) {
          newEmpPhone.style.borderColor = '#EF4444';
          newEmpPhone.focus();
        }
        return;
      }

      const btnSubmit = document.getElementById('btnSubmitAddEmployee');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Creating Account...';
      }

      const deptColors = {
        'Production': '#0284C7',
        'Quality': '#059669',
        'IT': '#7C3AED',
        'Maintenance': '#D97706'
      };

      const newEmpOrgUnit = document.getElementById('newEmpOrgUnit');
      const newEmpJobTitle = document.getElementById('newEmpJobTitle');
      const newEmpManager = document.getElementById('newEmpManager');
      const newEmpAccessRole = document.getElementById('newEmpAccessRole');

      const orgUnitId = newEmpOrgUnit ? (newEmpOrgUnit.value || undefined) : undefined;
      const jobTitleId = newEmpJobTitle ? (newEmpJobTitle.value || undefined) : undefined;
      const managerId = newEmpManager ? (newEmpManager.value || undefined) : undefined;
      const accessRoleId = newEmpAccessRole ? (newEmpAccessRole.value || undefined) : undefined;

      const newEmployeeData = {
        name,
        department,
        role,
        email,
        phone,
        uid: uid || undefined,
        avatarBg: deptColors[department] || '#0284C7',
        orgUnitId,
        jobTitleId,
        managerId,
        accessRoleId
      };

      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken()
          },
          body: JSON.stringify(newEmployeeData)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || `Registration failed with status ${res.status}`;
          if (errMsg.toLowerCase().includes('email') && newEmpEmailError) {
            newEmpEmailError.textContent = errMsg;
            newEmpEmailError.style.display = 'block';
            if (newEmpEmail) newEmpEmail.style.borderColor = '#EF4444';
          }
          if (errMsg.toLowerCase().includes('phone') && newEmpPhoneError) {
            newEmpPhoneError.textContent = errMsg;
            newEmpPhoneError.style.display = 'block';
            if (newEmpPhone) newEmpPhone.style.borderColor = '#EF4444';
          }
          if (modalAddEmployeeError) {
            modalAddEmployeeError.textContent = errMsg;
            modalAddEmployeeError.style.display = 'block';
          }
          throw new Error(errMsg);
        }

        const createdEmployee = await res.json();
        activeCreatedCredentials = createdEmployee;

        // Push to local employee roster
        employees.push(createdEmployee);

        // Switch modal view to Phase 3 Credential Presentation
        formAddEmployee.style.display = 'none';
        stageEmployeeCredentials.style.display = 'block';

        if (modalAddEmployeeTitle) {
          const span = modalAddEmployeeTitle.querySelector('span');
          if (span) span.textContent = 'Employee Credentials Generated';
        }

        if (credEmpSummaryName) {
          credEmpSummaryName.textContent = `${createdEmployee.name} (${createdEmployee.id})`;
        }
        if (credEmpSummaryDept) {
          credEmpSummaryDept.textContent = `${createdEmployee.department} • ${createdEmployee.role}`;
        }
        if (dispCredEmpId) {
          dispCredEmpId.textContent = createdEmployee.id;
        }
        if (dispCredPassword) {
          dispCredPassword.textContent = createdEmployee.temporaryPassword || (createdEmployee.credentials && createdEmployee.credentials.temporaryPassword) || '';
        }
        if (createdEmployee.email) {
          if (rowCredEmail) rowCredEmail.style.display = 'flex';
          if (dispCredEmail) dispCredEmail.textContent = createdEmployee.email;
        } else {
          if (rowCredEmail) rowCredEmail.style.display = 'none';
        }
        if (createdEmployee.phone) {
          if (rowCredPhone) rowCredPhone.style.display = 'flex';
          if (dispCredPhone) dispCredPhone.textContent = createdEmployee.phone;
        } else {
          if (rowCredPhone) rowCredPhone.style.display = 'none';
        }
        if (createdEmployee.uid) {
          if (rowCredCardUid) rowCredCardUid.style.display = 'flex';
          if (dispCredCardUid) dispCredCardUid.textContent = createdEmployee.uid;
        } else {
          if (rowCredCardUid) rowCredCardUid.style.display = 'none';
        }

        // Synchronize all dashboard views
        populateEmployeeSelect();
        selectEmployee.value = createdEmployee.id;
        updateVirtualCardPreview(createdEmployee.id);
        updateKPIs();
        updateDepartmentGrid();
        renderAttendanceRosterTable();
        renderOverviewRosterSnapshot();
        renderEmployeeTable();
        renderAttendanceCharts();

        showToast(`Created employee ${createdEmployee.name} (${createdEmployee.id}) with secure credentials`, 'entry');
      } catch (err) {
        if (modalAddEmployeeError) {
          modalAddEmployeeError.textContent = err.message;
          modalAddEmployeeError.style.display = 'block';
        } else {
          alert(err.message);
        }
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Create Employee & Account';
        }
      }
    });
  }

  // Copy Action Helpers
  function copyTextToClipboard(text, btnElement, successMsg = '✓ Copied!') {
    if (!navigator.clipboard) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } else {
      navigator.clipboard.writeText(text);
    }

    if (btnElement) {
      const origText = btnElement.innerHTML;
      btnElement.textContent = successMsg;
      setTimeout(() => {
        btnElement.innerHTML = origText;
      }, 1800);
    }
  }

  if (btnCopyCredId) {
    btnCopyCredId.addEventListener('click', () => {
      const empId = dispCredEmpId ? dispCredEmpId.textContent : '';
      if (empId) {
        copyTextToClipboard(empId, btnCopyCredId, '✓ Copied!');
        showToast(`Copied Employee ID ${empId} to clipboard`, 'entry');
      }
    });
  }

  if (btnCopyCredPassword) {
    btnCopyCredPassword.addEventListener('click', () => {
      const pass = dispCredPassword ? dispCredPassword.textContent : '';
      if (pass) {
        copyTextToClipboard(pass, btnCopyCredPassword, '✓ Copied!');
        showToast('Temporary password copied to clipboard', 'entry');
      }
    });
  }

  if (btnCopyAllCredentials) {
    btnCopyAllCredentials.addEventListener('click', () => {
      if (!activeCreatedCredentials) return;
      const pass = activeCreatedCredentials.temporaryPassword || (activeCreatedCredentials.credentials && activeCreatedCredentials.credentials.temporaryPassword) || '';
      const text = [
        '========================================',
        'SmartWorkforce Employee Credentials',
        '========================================',
        `Employee Name:       ${activeCreatedCredentials.name}`,
        `Employee ID:         ${activeCreatedCredentials.id}`,
        `Temporary Password:  ${pass}`,
        `Department:          ${activeCreatedCredentials.department}`,
        `Designation:         ${activeCreatedCredentials.role}`,
        `Employee Email:      ${activeCreatedCredentials.email || 'None'}`,
        `Phone Number:        ${activeCreatedCredentials.phone || 'None'}`,
        `Smart Card UID:      ${activeCreatedCredentials.uid || 'None Assigned (Pending)'}`,
        '----------------------------------------',
        'Notice: You will be required to change your temporary password on your first sign-in.',
        '========================================'
      ].join('\r\n');

      copyTextToClipboard(text, btnCopyAllCredentials, '✓ All Credentials Copied to Clipboard!');
      showToast('All employee credentials copied to clipboard', 'entry');
    });
  }

  // ==========================================
  // 16B. WORKFORCE DIRECTORY ACTIONS: VIEW DETAILS, EDIT, DEACTIVATE/REACTIVATE, DELETE
  // ==========================================

  // A. View Details Modal
  async function openViewEmployeeModal(empId) {
    if (!modalViewEmployee) return;

    let emp = employees.find(e => e.id === empId);

    // Initial placeholder population while fetching full telemetry
    if (emp) {
      populateViewModalContent(emp);
    }

    modalViewEmployee.classList.add('open');

    // Fetch full profile and telemetry history
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(empId)}`);
      if (res.ok) {
        const fullEmp = await res.json();
        populateViewModalContent(fullEmp);
      }
    } catch (err) {
      console.warn('Error loading employee telemetry details:', err);
    }
  }

  function populateViewModalContent(emp) {
    if (viewEmpAvatar) {
      viewEmpAvatar.textContent = getInitials(emp.name);
      viewEmpAvatar.style.backgroundColor = emp.avatarBg || '#0284C7';
    }
    if (viewEmpName) viewEmpName.textContent = emp.name;
    if (viewEmpIdBadge) viewEmpIdBadge.textContent = emp.id;
    if (viewEmpRoleDept) viewEmpRoleDept.textContent = `${emp.role} • ${emp.department}`;

    if (viewEmpAccountBadge) {
      if (emp.isArchived) {
        viewEmpAccountBadge.innerHTML = '<span class="badge-status-archived">Archived</span>';
      } else if (emp.accountStatus === 'SUSPENDED') {
        viewEmpAccountBadge.innerHTML = '<span class="badge-status-suspended">Suspended</span>';
      } else {
        viewEmpAccountBadge.innerHTML = '<span class="badge-status-active">Active</span>';
      }
    }

    if (viewEmpEmail) viewEmpEmail.textContent = emp.email || 'None registered';
    if (viewEmpPhone) viewEmpPhone.textContent = emp.phone || 'None registered';
    if (viewEmpUid) viewEmpUid.textContent = emp.uid || 'No smart card assigned';
    if (viewEmpPresence) {
      const isInside = emp.status === 'INSIDE';
      viewEmpPresence.innerHTML = `<span class="status-badge ${isInside ? 'present' : 'checked-out'}">${isInside ? '● CURRENTLY INSIDE' : '○ CURRENTLY OUTSIDE'}</span>`;
    }

    const viewEmpOrgUnit = document.getElementById('viewEmpOrgUnit');
    const viewEmpManager = document.getElementById('viewEmpManager');
    const viewEmpJobTitle = document.getElementById('viewEmpJobTitle');
    const viewEmpAccessRole = document.getElementById('viewEmpAccessRole');

    if (viewEmpOrgUnit) {
      const u = orgUnitsList.find(unit => unit.id === (emp.orgUnitId || emp.org_unit_id));
      viewEmpOrgUnit.textContent = emp.orgUnitName || emp.org_unit_name || (u ? u.name : '--');
    }
    if (viewEmpManager) {
      const m = employees.find(mgr => mgr.id === (emp.managerId || emp.manager_id));
      viewEmpManager.textContent = emp.managerName || emp.manager_name || (m ? `${m.name} (${m.id})` : 'Direct to Top-Level');
    }
    if (viewEmpJobTitle) {
      const t = jobTitlesList.find(jt => jt.id === (emp.jobTitleId || emp.job_title_id));
      viewEmpJobTitle.textContent = emp.jobTitleName || emp.job_title_name || (t ? t.title : emp.role || '--');
    }
    if (viewEmpAccessRole) {
      const r = rolesList.find(rl => rl.id === (emp.accessRoleId || emp.access_role_id));
      viewEmpAccessRole.textContent = emp.accessRoleName || emp.access_role_name || (r ? r.name : 'Standard Employee');
    }

    if (viewEmpLastSeen) viewEmpLastSeen.textContent = emp.lastSeen || emp.last_seen || 'Not detected today';
    if (viewEmpPwStatus) {
      viewEmpPwStatus.textContent = emp.mustChangePassword ? 'Pending First-Login Password Change' : 'Established';
    }

    if (viewEmpTotalRecords) {
      viewEmpTotalRecords.textContent = emp.totalAttendanceRecords !== undefined ? emp.totalAttendanceRecords : 0;
    }

    if (viewEmpRecentLogs) {
      if (emp.recentAttendance && emp.recentAttendance.length > 0) {
        viewEmpRecentLogs.innerHTML = emp.recentAttendance.map(log => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px dashed var(--border-subtle);">
            <div>
              <strong style="color: ${log.eventType === 'ENTRY' ? '#10B981' : '#F59E0B'};">${log.eventType}</strong>
              <span style="color: var(--text-muted); margin-left: 6px;">${log.gate}</span>
            </div>
            <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim);">${log.timestamp}</span>
          </div>
        `).join('');
      } else {
        viewEmpRecentLogs.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 8px;">No gate detections recorded yet.</div>';
      }
    }

    if (btnEditFromViewModal) {
      btnEditFromViewModal.onclick = () => {
        closeViewEmployeeModal();
        openEditEmployeeModal(emp.id);
      };
    }
  }

  function closeViewEmployeeModal() {
    if (modalViewEmployee) modalViewEmployee.classList.remove('open');
  }

  if (btnCloseViewEmployeeModal) btnCloseViewEmployeeModal.addEventListener('click', closeViewEmployeeModal);
  if (btnCloseViewModalBtn) btnCloseViewModalBtn.addEventListener('click', closeViewEmployeeModal);

  // B. Edit Employee Modal
  let activeEditingEmpId = null;

  function openEditEmployeeModal(empId) {
    if (!modalEditEmployee) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    activeEditingEmpId = emp.id;
    if (editEmpId) editEmpId.value = emp.id;
    if (editEmpName) editEmpName.value = emp.name;
    if (editEmpDept) editEmpDept.value = emp.department;
    if (editEmpRole) editEmpRole.value = emp.role;
    if (editEmpEmail) editEmpEmail.value = emp.email || '';
    if (editEmpPhone) editEmpPhone.value = emp.phone || '';
    if (editEmpUid) editEmpUid.value = emp.uid || '';

    if (typeof populateOrgDropdowns === 'function') {
      populateOrgDropdowns();
    }
    const editEmpOrgUnit = document.getElementById('editEmpOrgUnit');
    const editEmpJobTitle = document.getElementById('editEmpJobTitle');
    const editEmpManager = document.getElementById('editEmpManager');
    const editEmpAccessRole = document.getElementById('editEmpAccessRole');
    if (editEmpOrgUnit) editEmpOrgUnit.value = emp.orgUnitId || emp.org_unit_id || '';
    if (editEmpJobTitle) editEmpJobTitle.value = emp.jobTitleId || emp.job_title_id || '';
    if (editEmpManager) editEmpManager.value = emp.managerId || emp.manager_id || '';
    if (editEmpAccessRole) editEmpAccessRole.value = emp.accessRoleId || emp.access_role_id || '';

    if (modalEditEmployeeError) {
      modalEditEmployeeError.textContent = '';
      modalEditEmployeeError.style.display = 'none';
    }
    if (editEmpEmailError) {
      editEmpEmailError.textContent = '';
      editEmpEmailError.style.display = 'none';
    }
    if (editEmpPhoneError) {
      editEmpPhoneError.textContent = '';
      editEmpPhoneError.style.display = 'none';
    }
    if (editEmpEmail) editEmpEmail.style.borderColor = '';
    if (editEmpPhone) editEmpPhone.style.borderColor = '';

    if (btnSubmitEditEmployee) {
      btnSubmitEditEmployee.disabled = false;
      btnSubmitEditEmployee.textContent = 'Save Changes';
    }

    modalEditEmployee.classList.add('open');
  }

  function closeEditEmployeeModal() {
    if (modalEditEmployee) modalEditEmployee.classList.remove('open');
    activeEditingEmpId = null;
  }

  if (btnCloseEditEmployeeModal) btnCloseEditEmployeeModal.addEventListener('click', closeEditEmployeeModal);
  if (btnCancelEditEmployee) btnCancelEditEmployee.addEventListener('click', closeEditEmployeeModal);

  if (btnGenEditUid) {
    btnGenEditUid.addEventListener('click', () => {
      const hex = '0123456789ABCDEF';
      let uid = '';
      for (let i = 0; i < 4; i++) {
        uid += (i > 0 ? ':' : '') + hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
      }
      if (editEmpUid) editEmpUid.value = uid;
    });
  }

  if (formEditEmployee) {
    formEditEmployee.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeEditingEmpId) return;

      const empId = activeEditingEmpId;
      const nameVal = editEmpName ? editEmpName.value.trim() : '';
      const deptVal = editEmpDept ? editEmpDept.value.trim() : '';
      const roleVal = editEmpRole ? editEmpRole.value.trim() : '';
      const emailVal = editEmpEmail ? editEmpEmail.value.trim() : '';
      const phoneVal = editEmpPhone ? editEmpPhone.value.trim() : '';
      const uidVal = editEmpUid ? editEmpUid.value.trim().toUpperCase() : '';

      // Reset errors
      if (modalEditEmployeeError) {
        modalEditEmployeeError.textContent = '';
        modalEditEmployeeError.style.display = 'none';
      }
      if (editEmpEmailError) {
        editEmpEmailError.textContent = '';
        editEmpEmailError.style.display = 'none';
      }
      if (editEmpPhoneError) {
        editEmpPhoneError.textContent = '';
        editEmpPhoneError.style.display = 'none';
      }
      if (editEmpEmail) editEmpEmail.style.borderColor = '';
      if (editEmpPhone) editEmpPhone.style.borderColor = '';

      if (!nameVal || !deptVal || !roleVal) {
        if (modalEditEmployeeError) {
          modalEditEmployeeError.textContent = 'Full name, department, and designation are required.';
          modalEditEmployeeError.style.display = 'block';
        }
        return;
      }

      // Email validation
      if (emailVal) {
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!EMAIL_REGEX.test(emailVal)) {
          if (editEmpEmailError) {
            editEmpEmailError.textContent = 'Invalid email format. Please provide a valid email address.';
            editEmpEmailError.style.display = 'block';
          }
          if (editEmpEmail) editEmpEmail.style.borderColor = '#EF4444';
          return;
        }

        // Duplicate email check
        const dupEmail = employees.find(emp => emp.id !== empId && emp.email && emp.email.toLowerCase() === emailVal.toLowerCase());
        if (dupEmail) {
          if (editEmpEmailError) {
            editEmpEmailError.textContent = `An employee with email '${emailVal}' already exists in this organization.`;
            editEmpEmailError.style.display = 'block';
          }
          if (editEmpEmail) editEmpEmail.style.borderColor = '#EF4444';
          return;
        }
      }

      // Phone validation
      if (phoneVal) {
        const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
        const digits = phoneVal.replace(/\D/g, '');
        if (!PHONE_REGEX.test(phoneVal) || digits.length < 7 || digits.length > 15) {
          if (editEmpPhoneError) {
            editEmpPhoneError.textContent = 'Invalid phone number format. Please enter 7 to 15 digits.';
            editEmpPhoneError.style.display = 'block';
          }
          if (editEmpPhone) editEmpPhone.style.borderColor = '#EF4444';
          return;
        }
      }

      // UID duplicate check
      if (uidVal) {
        if (uidVal.length < 4 || uidVal.length > 64) {
          if (modalEditEmployeeError) {
            modalEditEmployeeError.textContent = 'Smart Card UID must be between 4 and 64 characters.';
            modalEditEmployeeError.style.display = 'block';
          }
          return;
        }
        const dupUid = employees.find(emp => emp.id !== empId && emp.uid && emp.uid.toUpperCase() === uidVal.toUpperCase());
        if (dupUid) {
          if (modalEditEmployeeError) {
            modalEditEmployeeError.textContent = `Smart Card UID '${uidVal}' is already assigned to another employee (${dupUid.name}).`;
            modalEditEmployeeError.style.display = 'block';
          }
          return;
        }
      }

      if (btnSubmitEditEmployee) {
        btnSubmitEditEmployee.disabled = true;
        btnSubmitEditEmployee.textContent = 'Saving Changes...';
      }

      try {
        const editEmpOrgUnit = document.getElementById('editEmpOrgUnit');
        const editEmpJobTitle = document.getElementById('editEmpJobTitle');
        const editEmpManager = document.getElementById('editEmpManager');
        const editEmpAccessRole = document.getElementById('editEmpAccessRole');

        const orgUnitIdVal = editEmpOrgUnit ? (editEmpOrgUnit.value || null) : undefined;
        const jobTitleIdVal = editEmpJobTitle ? (editEmpJobTitle.value || null) : undefined;
        const managerIdVal = editEmpManager ? (editEmpManager.value || null) : undefined;
        const accessRoleIdVal = editEmpAccessRole ? (editEmpAccessRole.value || null) : undefined;

        const csrfToken = getCsrfToken();
        const res = await fetch(`/api/employees/${encodeURIComponent(empId)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            name: nameVal,
            department: deptVal,
            role: roleVal,
            email: emailVal || null,
            phone: phoneVal || null,
            uid: uidVal || null,
            orgUnitId: orgUnitIdVal,
            jobTitleId: jobTitleIdVal,
            managerId: managerIdVal,
            accessRoleId: accessRoleIdVal
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update employee record.');
        }

        // Update local state
        const updated = data.employee;
        const idx = employees.findIndex(e => e.id === empId);
        if (idx !== -1) {
          employees[idx] = { ...employees[idx], ...updated };
        }

        closeEditEmployeeModal();
        showToast(`Employee ${updated.name} (${updated.id}) updated successfully.`, 'entry');

        renderEmployeeTable();
        renderAttendanceRosterTable();
        updateKPIs();
        populateEmployeeSelect();
        updateSyncFingerprint();
      } catch (err) {
        if (modalEditEmployeeError) {
          modalEditEmployeeError.textContent = err.message;
          modalEditEmployeeError.style.display = 'block';
        }
      } finally {
        if (btnSubmitEditEmployee) {
          btnSubmitEditEmployee.disabled = false;
          btnSubmitEditEmployee.textContent = 'Save Changes';
        }
      }
    });
  }

  // C. Confirmation Dialog System (Deactivation & Deletion)
  let pendingConfirmAction = null;

  function openConfirmModal({ title, icon, message, warning, confirmBtnText, confirmBtnClass, onConfirm }) {
    if (!modalConfirmAction) return;

    if (confirmActionTitle) confirmActionTitle.textContent = title;
    if (confirmActionIcon) confirmActionIcon.textContent = icon || '⚠️';
    if (confirmActionMessage) confirmActionMessage.textContent = message;
    if (confirmActionWarning) {
      if (warning) {
        confirmActionWarning.textContent = warning;
        confirmActionWarning.style.display = 'block';
      } else {
        confirmActionWarning.style.display = 'none';
      }
    }

    if (btnSubmitConfirmAction) {
      btnSubmitConfirmAction.textContent = confirmBtnText || 'Confirm';
      btnSubmitConfirmAction.className = confirmBtnClass || 'btn-action-primary';
      btnSubmitConfirmAction.style.width = 'auto';
      btnSubmitConfirmAction.style.marginTop = '0';
    }

    pendingConfirmAction = onConfirm;
    modalConfirmAction.classList.add('open');
  }

  function closeConfirmModal() {
    if (modalConfirmAction) modalConfirmAction.classList.remove('open');
    pendingConfirmAction = null;
  }

  if (btnCloseConfirmModal) btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
  if (btnCancelConfirmAction) btnCancelConfirmAction.addEventListener('click', closeConfirmModal);

  if (btnSubmitConfirmAction) {
    btnSubmitConfirmAction.addEventListener('click', async () => {
      if (typeof pendingConfirmAction === 'function') {
        const action = pendingConfirmAction;
        closeConfirmModal();
        await action();
      } else {
        closeConfirmModal();
      }
    });
  }

  function promptToggleEmployeeStatus(empId, currentStatus) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const willSuspend = currentStatus !== 'SUSPENDED';

    if (willSuspend) {
      openConfirmModal({
        title: 'Deactivate Employee Account',
        icon: '⏸️',
        message: `Are you sure you want to deactivate ${emp.name} (${emp.id})?`,
        warning: 'Immediate Effect: The employee will be marked as SUSPENDED, all active login sessions terminated, and access to employee services revoked. Historical attendance records remain 100% intact.',
        confirmBtnText: 'Deactivate Employee',
        confirmBtnClass: 'btn-action-secondary',
        onConfirm: async () => {
          try {
            const csrfToken = getCsrfToken();
            const res = await fetch(`/api/employees/${encodeURIComponent(empId)}/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
              },
              body: JSON.stringify({ status: 'SUSPENDED' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to deactivate employee.');

            const idx = employees.findIndex(e => e.id === empId);
            if (idx !== -1) {
              employees[idx].accountStatus = 'SUSPENDED';
            }

            showToast(`Employee ${emp.name} deactivated. Active sessions revoked.`, 'exit');
            renderEmployeeTable();
            updateKPIs();
            updateSyncFingerprint();
          } catch (err) {
            alert(`Error deactivating employee: ${err.message}`);
          }
        }
      });
    } else {
      openConfirmModal({
        title: 'Reactivate Employee Account',
        icon: '▶️',
        message: `Are you sure you want to reactivate ${emp.name} (${emp.id})?`,
        warning: 'The employee account will be restored to ACTIVE status and they will be able to sign in to the workforce portal again.',
        confirmBtnText: 'Reactivate Employee',
        confirmBtnClass: 'btn-action-primary',
        onConfirm: async () => {
          try {
            const csrfToken = getCsrfToken();
            const res = await fetch(`/api/employees/${encodeURIComponent(empId)}/status`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
              },
              body: JSON.stringify({ status: 'ACTIVE' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to reactivate employee.');

            const idx = employees.findIndex(e => e.id === empId);
            if (idx !== -1) {
              employees[idx].accountStatus = 'ACTIVE';
            }

            showToast(`Employee ${emp.name} reactivated successfully.`, 'entry');
            renderEmployeeTable();
            updateKPIs();
            updateSyncFingerprint();
          } catch (err) {
            alert(`Error reactivating employee: ${err.message}`);
          }
        }
      });
    }
  }

  function promptDeleteEmployee(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    openConfirmModal({
      title: 'Safe Delete & Archive Employee',
      icon: '🗑️',
      message: `Are you sure you want to delete ${emp.name} (${emp.id}) from the active workforce?`,
      warning: 'Database Integrity Guarantee: To prevent cascade-deletion of historical gate logs and telemetry, this employee will be safely archived and their account suspended. All attendance history remains completely intact.',
      confirmBtnText: 'Archive & Delete Member',
      confirmBtnClass: 'btn-action-secondary',
      onConfirm: async () => {
        try {
          const csrfToken = getCsrfToken();
          const res = await fetch(`/api/employees/${encodeURIComponent(empId)}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            }
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to delete/archive employee.');

          const idx = employees.findIndex(e => e.id === empId);
          if (idx !== -1) {
            employees[idx].isArchived = true;
            employees[idx].accountStatus = 'SUSPENDED';
          }

          showToast(`Employee ${emp.name} safely archived. Attendance records preserved.`, 'exit');
          renderEmployeeTable();
          renderAttendanceRosterTable();
          updateKPIs();
          populateEmployeeSelect();
          updateSyncFingerprint();
        } catch (err) {
          alert(`Error deleting employee: ${err.message}`);
        }
      }
    });
  }

  async function restoreEmployee(empId) {
    const emp = employees.find(e => e.id === empId);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/employees/${encodeURIComponent(empId)}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore employee.');

      const idx = employees.findIndex(e => e.id === empId);
      if (idx !== -1) {
        employees[idx].isArchived = false;
        employees[idx].accountStatus = 'ACTIVE';
      }

      showToast(`Employee ${emp ? emp.name : empId} restored from archive successfully.`, 'entry');
      renderEmployeeTable();
      renderAttendanceRosterTable();
      updateKPIs();
      populateEmployeeSelect();
      updateSyncFingerprint();
    } catch (err) {
      alert(`Error restoring employee: ${err.message}`);
    }
  }

  // D. Reset Temporary Password Workflow
  let activeResetCredentials = null;

  function promptResetEmployeePassword(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    if (emp.isArchived) {
      alert(`Cannot reset password for archived employee ${emp.name}. Please restore the employee first.`);
      return;
    }

    if (emp.accountStatus === 'SUSPENDED') {
      alert(`Cannot reset password for deactivated employee ${emp.name}. Please reactivate the account first.`);
      return;
    }

    openConfirmModal({
      title: 'Reset Temporary Password',
      icon: '🔑',
      message: `Are you sure you want to generate a new temporary password for ${emp.name} (${emp.id})?`,
      warning: 'Security Notice: A new temporary password will be generated based on the employee\'s name and phone number (First 4 letters of name + last 4 digits of phone). All existing sessions for this employee will be immediately terminated, and they must set a private password on their next sign-in.',
      confirmBtnText: 'Reset & Generate Password',
      confirmBtnClass: 'btn-action-primary',
      onConfirm: async () => {
        try {
          const csrfToken = getCsrfToken();
          const res = await fetch(`/api/employees/${encodeURIComponent(empId)}/reset-temporary-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            }
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to reset temporary password.');

          activeResetCredentials = {
            id: data.employeeId || emp.id,
            name: data.employeeName || emp.name,
            temporaryPassword: data.temporaryPassword,
            department: emp.department,
            role: emp.role,
            email: emp.email,
            phone: emp.phone
          };

          if (dispResetEmpId) dispResetEmpId.textContent = activeResetCredentials.id;
          if (dispResetPassword) dispResetPassword.textContent = activeResetCredentials.temporaryPassword;
          if (resetPwdEmpSummaryName) resetPwdEmpSummaryName.textContent = `Password Reset: ${activeResetCredentials.name}`;
          if (resetPwdEmpSummaryDesc) resetPwdEmpSummaryDesc.textContent = `${activeResetCredentials.department} • ${activeResetCredentials.role} (Temporary password ready)`;

          if (modalResetPasswordResult) {
            modalResetPasswordResult.classList.add('open');
          }

          showToast(`Temporary password reset for ${emp.name}`, 'entry');
        } catch (err) {
          alert(`Error resetting password: ${err.message}`);
        }
      }
    });
  }

  function closeResetPwdModal() {
    if (modalResetPasswordResult) modalResetPasswordResult.classList.remove('open');
    activeResetCredentials = null;
  }

  if (btnCloseResetPwdModal) btnCloseResetPwdModal.addEventListener('click', closeResetPwdModal);
  if (btnDoneResetPwd) btnDoneResetPwd.addEventListener('click', closeResetPwdModal);

  if (btnCopyResetEmpId) {
    btnCopyResetEmpId.addEventListener('click', () => {
      const empId = dispResetEmpId ? dispResetEmpId.textContent : '';
      if (empId) {
        copyTextToClipboard(empId, btnCopyResetEmpId, '✓ Copied!');
        showToast(`Copied Employee ID ${empId} to clipboard`, 'entry');
      }
    });
  }

  if (btnCopyResetPassword) {
    btnCopyResetPassword.addEventListener('click', () => {
      const pass = dispResetPassword ? dispResetPassword.textContent : '';
      if (pass) {
        copyTextToClipboard(pass, btnCopyResetPassword, '✓ Copied!');
        showToast('Temporary password copied to clipboard', 'entry');
      }
    });
  }

  if (btnCopyAllResetCredentials) {
    btnCopyAllResetCredentials.addEventListener('click', () => {
      if (!activeResetCredentials) return;
      const text = [
        '========================================',
        'SmartWorkforce Employee Credentials (Password Reset)',
        '========================================',
        `Employee Name:       ${activeResetCredentials.name}`,
        `Employee ID:         ${activeResetCredentials.id}`,
        `Temporary Password:  ${activeResetCredentials.temporaryPassword}`,
        `Department:          ${activeResetCredentials.department || 'N/A'}`,
        `Designation:         ${activeResetCredentials.role || 'N/A'}`,
        `Employee Email:      ${activeResetCredentials.email || 'None'}`,
        `Phone Number:        ${activeResetCredentials.phone || 'None'}`,
        '----------------------------------------',
        'Notice: You are required to change your temporary password upon your next sign-in.',
        '========================================'
      ].join('\r\n');

      copyTextToClipboard(text, btnCopyAllResetCredentials, '✓ All Credentials Copied!');
      showToast('Login credentials copied to clipboard', 'entry');
    });
  }

  if (filterEmpAccountStatus) {
    filterEmpAccountStatus.addEventListener('change', renderEmployeeTable);
  }

  // ==========================================
  // 17. INITIALIZATION & LIVE DASHBOARD AUTO-SYNC (5-Second Polling)
  // Ensures external ESP32 or CLI scans immediately reflect in KPIs & Roster
  // ==========================================
  let syncTimer = null;
  let isSyncing = false;
  let lastSyncFingerprint = '';

  function calculateFingerprint(emps, logs) {
    const lastLog = logs && logs.length > 0 ? logs[logs.length - 1] : null;
    const logId = lastLog ? lastLog.id : 'NONE';
    const logTimestamp = lastLog ? lastLog.timestamp : 'NONE';
    const presentCount = emps ? emps.filter(e => e.status === 'INSIDE').length : 0;
    const empStatuses = emps ? emps.map(e => `${e.id}:${e.accountStatus}:${Boolean(e.isArchived)}:${e.name}`).join('|') : '';
    return `${emps ? emps.length : 0}_${presentCount}_${logs ? logs.length : 0}_${logId}_${logTimestamp}_${empStatuses}`;
  }

  function updateSyncFingerprint() {
    lastSyncFingerprint = calculateFingerprint(employees, attendanceLogs);
  }

  async function syncDashboardData() {
    if (isSyncing || document.hidden) return;
    isSyncing = true;

    try {
      const [empRes, logsRes] = await Promise.all([
        fetch('/api/employees?includeArchived=true'),
        fetch('/api/attendance/logs')
      ]);

      if (empRes.ok && logsRes.ok) {
        const freshEmployees = await empRes.json();
        const freshLogs = await logsRes.json();
        const newFingerprint = calculateFingerprint(freshEmployees, freshLogs);

        // Only re-render when actual changes occurred
        if (newFingerprint !== lastSyncFingerprint) {
          lastSyncFingerprint = newFingerprint;
          employees = freshEmployees;
          attendanceLogs = freshLogs;

          updateKPIs();
          updateDepartmentGrid();
          updateStreamList();
          renderAttendanceRosterTable();
          renderOverviewRosterSnapshot();
          renderEmployeeTable();
          renderAttendanceLogTable(false);
          renderAttendanceCharts();
          populateEmployeeSelect();
          fetchSimulationReport();
        }
      }
    } catch (err) {
      // Gracefully ignore intermittent network dropouts
    } finally {
      isSyncing = false;
    }
  }

  function startAutoSync() {
    stopAutoSync();
    syncTimer = setInterval(syncDashboardData, 5000);
  }

  function stopAutoSync() {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  // Lifecycle listeners to avoid wasted CPU / network when tab is backgrounded
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoSync();
    } else {
      syncDashboardData();
      startAutoSync();
    }
  });

  window.addEventListener('beforeunload', stopAutoSync);

  async function loadInitialData() {
    try {
      const [empRes, logsRes, unitsRes, titlesRes, rolesRes] = await Promise.all([
        fetch('/api/employees?includeArchived=true'),
        fetch('/api/attendance/logs'),
        SmartWorkforceCommon.api.getOrgUnits().catch(() => []),
        SmartWorkforceCommon.api.getJobTitles().catch(() => []),
        SmartWorkforceCommon.api.getRoles().catch(() => [])
      ]);

      if (empRes.ok && logsRes.ok) {
        employees = await empRes.json();
        attendanceLogs = await logsRes.json();
      }
      if (Array.isArray(unitsRes)) orgUnitsList = unitsRes;
      if (Array.isArray(titlesRes)) jobTitlesList = titlesRes;
      if (Array.isArray(rolesRes)) rolesList = rolesRes;
      populateOrgDropdowns();
    } catch (err) {
      console.warn('API fetch offline or unreachable, utilizing fallback dataset:', err);
    }

    lastSyncFingerprint = calculateFingerprint(employees, attendanceLogs);

    populateEmployeeSelect();
    if (employees.length > 0) {
      selectEmployee.value = employees[0].id;
      updateVirtualCardPreview(employees[0].id);
    }

    updateKPIs();
    updateDepartmentGrid();
    updateStreamList();
    renderAttendanceRosterTable();
    renderOverviewRosterSnapshot();
    renderEmployeeTable();
    renderAttendanceLogTable(false);
    renderAttendanceCharts();
    fetchSimulationReport();

    // Start 5-second live background polling
    startAutoSync();
  }

  // ========================================================
  // PHASE 4: ORGANIZATION TREE, JOB TITLES & ACCESS ROLES
  // ========================================================

  let orgTreeData = { company: null, levels: [], units: [], roles: [], jobTitles: [], totalEmployees: 0 };
  let orgUnitsList = [];
  let orgLevelsList = [];
  let jobTitlesList = [];
  let rolesList = [];
  let activeRoleId = null;
  let activeRolePermissions = [];
  let collapsedNodeIds = new Set();
  let orgTreeFilterTerm = '';
  let jobTitlesFilterTerm = '';

  const ALL_PERMISSION_SPECS = [
    { key: 'org:view', category: 'Organization', description: 'View organization units, structure, and hierarchy levels', defaultScope: 'COMPANY' },
    { key: 'org:manage', category: 'Organization', description: 'Create, modify, re-parent, and delete organization units and levels', defaultScope: 'COMPANY' },
    { key: 'roles:view', category: 'Access Roles', description: 'View access roles, definitions, and assigned permissions', defaultScope: 'COMPANY' },
    { key: 'roles:manage', category: 'Access Roles', description: 'Create, edit, delete access roles and configure permission matrices', defaultScope: 'COMPANY' },
    { key: 'employees:view', category: 'Workforce', description: 'View employee records, profiles, and roster data', defaultScope: 'COMPANY' },
    { key: 'employees:create', category: 'Workforce', description: 'Register new workforce members and generate initial accounts', defaultScope: 'COMPANY' },
    { key: 'employees:manage', category: 'Workforce', description: 'Edit, suspend, archive, restore, and reassign employee profiles', defaultScope: 'COMPANY' },
    { key: 'attendance:view', category: 'Attendance', description: 'View attendance events, logs, rosters, and gate scans', defaultScope: 'COMPANY' },
    { key: 'attendance:manage', category: 'Attendance', description: 'Modify attendance logs, clear logs, and simulate gate passes', defaultScope: 'COMPANY' },
    { key: 'analytics:view', category: 'Intelligence', description: 'Access presence analytics, risk indicators, and department metrics', defaultScope: 'COMPANY' }
  ];

  const VALID_SCOPES = ['SELF', 'DIRECT_REPORTS', 'DESCENDANTS', 'DEPARTMENT', 'COMPANY'];

  // --- Dynamic Dropdown Populator for Employee & Reporting Forms ---
  function populateOrgDropdowns() {
    const newEmpOrgUnit = document.getElementById('newEmpOrgUnit');
    const editEmpOrgUnit = document.getElementById('editEmpOrgUnit');
    const selectReassignOrgUnit = document.getElementById('selectReassignOrgUnit');

    const newEmpJobTitle = document.getElementById('newEmpJobTitle');
    const editEmpJobTitle = document.getElementById('editEmpJobTitle');
    const selectReassignJobTitle = document.getElementById('selectReassignJobTitle');

    const newEmpManager = document.getElementById('newEmpManager');
    const editEmpManager = document.getElementById('editEmpManager');
    const selectReassignManager = document.getElementById('selectReassignManager');
    const selectReassignEmp = document.getElementById('selectReassignEmp');

    const newEmpAccessRole = document.getElementById('newEmpAccessRole');
    const editEmpAccessRole = document.getElementById('editEmpAccessRole');
    const selectReassignAccessRole = document.getElementById('selectReassignAccessRole');

    // 1. Org Units Dropdowns
    const unitOptions = '<option value="">-- None / Unassigned --</option>' +
      orgUnitsList.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.unit_type || 'UNIT')})</option>`).join('');

    if (newEmpOrgUnit) {
      const cur = newEmpOrgUnit.value;
      newEmpOrgUnit.innerHTML = unitOptions;
      newEmpOrgUnit.value = cur;
    }
    if (editEmpOrgUnit) {
      const cur = editEmpOrgUnit.value;
      editEmpOrgUnit.innerHTML = unitOptions;
      editEmpOrgUnit.value = cur;
    }
    if (selectReassignOrgUnit) {
      const cur = selectReassignOrgUnit.value;
      selectReassignOrgUnit.innerHTML = '<option value="">-- Keep Current Unit --</option>' +
        orgUnitsList.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)}</option>`).join('');
      selectReassignOrgUnit.value = cur;
    }

    // 2. Job Titles Dropdowns
    const titleOptions = '<option value="">-- None / Custom Designation --</option>' +
      jobTitlesList.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.title)}</option>`).join('');

    if (newEmpJobTitle) {
      const cur = newEmpJobTitle.value;
      newEmpJobTitle.innerHTML = titleOptions;
      newEmpJobTitle.value = cur;
    }
    if (editEmpJobTitle) {
      const cur = editEmpJobTitle.value;
      editEmpJobTitle.innerHTML = titleOptions;
      editEmpJobTitle.value = cur;
    }
    if (selectReassignJobTitle) {
      const cur = selectReassignJobTitle.value;
      selectReassignJobTitle.innerHTML = '<option value="">-- Keep Current Title --</option>' +
        jobTitlesList.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.title)}</option>`).join('');
      selectReassignJobTitle.value = cur;
    }

    // 3. Manager Dropdowns
    const activeEmployees = employees.filter(e => !e.isArchived);
    const mgrOptions = '<option value="">-- None / Top-Level --</option>' +
      activeEmployees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${escapeHtml(e.id)})</option>`).join('');

    if (newEmpManager) {
      const cur = newEmpManager.value;
      newEmpManager.innerHTML = mgrOptions;
      newEmpManager.value = cur;
    }
    if (editEmpManager) {
      const cur = editEmpManager.value;
      editEmpManager.innerHTML = '<option value="">-- None / Top-Level --</option>' +
        activeEmployees.filter(e => e.id !== activeEditingEmpId).map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${escapeHtml(e.id)})</option>`).join('');
      editEmpManager.value = cur;
    }
    if (selectReassignManager) {
      const cur = selectReassignManager.value;
      selectReassignManager.innerHTML = mgrOptions;
      selectReassignManager.value = cur;
    }
    if (selectReassignEmp) {
      const cur = selectReassignEmp.value;
      selectReassignEmp.innerHTML = '<option value="">-- Choose Employee --</option>' +
        activeEmployees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${escapeHtml(e.id)})</option>`).join('');
      selectReassignEmp.value = cur;
    }

    // 4. Access Role Dropdowns
    const roleOptions = '<option value="">-- Standard Employee (Default) --</option>' +
      rolesList.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}${r.is_system_role ? ' [System]' : ''}</option>`).join('');

    if (newEmpAccessRole) {
      const cur = newEmpAccessRole.value;
      newEmpAccessRole.innerHTML = roleOptions;
      newEmpAccessRole.value = cur;
    }
    if (editEmpAccessRole) {
      const cur = editEmpAccessRole.value;
      editEmpAccessRole.innerHTML = roleOptions;
      editEmpAccessRole.value = cur;
    }
    if (selectReassignAccessRole) {
      const cur = selectReassignAccessRole.value;
      selectReassignAccessRole.innerHTML = '<option value="">-- Keep Current Access Role --</option>' +
        rolesList.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)}</option>`).join('');
      selectReassignAccessRole.value = cur;
    }
  }

  // ==========================================
  // 1. ORGANIZATION TREE & HIERARCHY
  // ==========================================

  async function loadOrgTreeData() {
    const orgTreeLoading = document.getElementById('orgTreeLoading');
    const orgTreeEmpty = document.getElementById('orgTreeEmpty');
    const orgTreeRoot = document.getElementById('orgTreeRoot');

    if (orgTreeLoading) orgTreeLoading.style.display = 'block';
    if (orgTreeEmpty) orgTreeEmpty.style.display = 'none';

    try {
      const [treeRes, unitsRes, levelsRes] = await Promise.all([
        SmartWorkforceCommon.api.getOrgTree().catch(() => null),
        SmartWorkforceCommon.api.getOrgUnits(false).catch(() => []),
        SmartWorkforceCommon.api.getOrgLevels().catch(() => [])
      ]);

      if (treeRes) {
        orgTreeData = treeRes;
      }
      if (Array.isArray(unitsRes)) {
        orgUnitsList = unitsRes;
      }
      if (Array.isArray(levelsRes)) {
        orgLevelsList = levelsRes;
      }

      // Update KPI toolbar stats
      const statOrgUnitCount = document.getElementById('statOrgUnitCount');
      const statOrgLevelCount = document.getElementById('statOrgLevelCount');
      const statOrgEmpCoverage = document.getElementById('statOrgEmpCoverage');

      if (statOrgUnitCount) statOrgUnitCount.textContent = orgUnitsList.length;
      if (statOrgLevelCount) statOrgLevelCount.textContent = orgLevelsList.length;
      if (statOrgEmpCoverage) {
        const covered = employees.filter(e => Boolean(e.orgUnitId || e.org_unit_id)).length;
        statOrgEmpCoverage.textContent = `${covered} / ${employees.length}`;
      }

      renderOrgTree();
      populateOrgDropdowns();
    } catch (err) {
      console.warn('Failed to load organization tree:', err);
      showToast('Error loading organization hierarchy: ' + err.message, 'warning');
    } finally {
      if (orgTreeLoading) orgTreeLoading.style.display = 'none';
    }
  }

  function renderOrgTree() {
    const orgTreeRoot = document.getElementById('orgTreeRoot');
    const orgTreeEmpty = document.getElementById('orgTreeEmpty');
    if (!orgTreeRoot) return;

    const unitsTree = orgTreeData.units || [];
    if (!unitsTree || unitsTree.length === 0) {
      if (orgTreeEmpty) orgTreeEmpty.style.display = 'flex';
      orgTreeRoot.innerHTML = '';
      return;
    }

    if (orgTreeEmpty) orgTreeEmpty.style.display = 'none';

    // Helper recursive node generator
    function buildNodeHtml(node) {
      const hasChildren = node.children && node.children.length > 0;
      const isCollapsed = collapsedNodeIds.has(node.id);

      // Filtering match
      const term = orgTreeFilterTerm.toLowerCase();
      let isVisible = true;
      if (term) {
        const nameMatch = (node.name || '').toLowerCase().includes(term);
        const mgrMatch = (node.manager_name || '').toLowerCase().includes(term);
        const lvlMatch = (node.level_name || '').toLowerCase().includes(term);
        const childMatch = hasChildren && node.children.some(c => (c.name || '').toLowerCase().includes(term));
        isVisible = nameMatch || mgrMatch || lvlMatch || childMatch;
      }
      if (!isVisible) return '';

      const levelBadge = node.level_name
        ? `<span class="org-level-badge">${escapeHtml(node.level_name)}</span>`
        : (node.level_rank ? `<span class="org-level-badge">Tier ${node.level_rank}</span>` : '');

      const typeBadge = node.unit_type
        ? `<span class="badge-tag">${escapeHtml(node.unit_type)}</span>`
        : '';

      const managerPill = node.manager_name
        ? `<span class="org-manager-badge" title="Unit Head">👤 ${escapeHtml(node.manager_name)}</span>`
        : '<span style="color: var(--text-dim); font-size: 0.72rem;">👤 No Head Assigned</span>';

      const empCount = node.employee_count !== undefined ? node.employee_count : 0;

      let childrenHtml = '';
      if (hasChildren) {
        childrenHtml = `
          <ul class="org-tree-children ${isCollapsed ? 'collapsed' : ''}" id="children_${escapeHtml(node.id)}">
            ${node.children.map(buildNodeHtml).join('')}
          </ul>
        `;
      }

      return `
        <li class="org-tree-node" data-node-id="${escapeHtml(node.id)}">
          <div class="org-tree-card">
            <div class="org-tree-card-left">
              <button type="button" class="org-tree-toggle ${hasChildren ? '' : 'empty'}" data-toggle-id="${escapeHtml(node.id)}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                ${hasChildren ? (isCollapsed ? '▶' : '▼') : '•'}
              </button>
              <div class="org-unit-icon">🏢</div>
              <div class="org-unit-meta">
                <div class="org-unit-name" title="${escapeHtml(node.name)}">${escapeHtml(node.name)}</div>
                <div class="org-unit-subline">
                  ${typeBadge}
                  ${levelBadge}
                  ${managerPill}
                </div>
              </div>
            </div>

            <div class="org-tree-card-right">
              <span class="org-emp-count" title="Assigned Employees">
                👥 <strong>${empCount}</strong> Staff
              </span>

              <div class="org-actions-group">
                <button type="button" class="btn-icon-xs btn-add-subunit" data-parent-id="${escapeHtml(node.id)}" title="Add Sub-Unit under ${escapeHtml(node.name)}">
                  ➕
                </button>
                <button type="button" class="btn-icon-xs btn-edit-unit" data-unit-id="${escapeHtml(node.id)}" title="Edit Unit Properties">
                  ✏️
                </button>
                <button type="button" class="btn-icon-xs delete btn-delete-unit" data-unit-id="${escapeHtml(node.id)}" data-unit-name="${escapeHtml(node.name)}" title="Delete Unit">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          ${childrenHtml}
        </li>
      `;
    }

    orgTreeRoot.innerHTML = unitsTree.map(buildNodeHtml).join('');

    // Attach Toggle Listeners
    orgTreeRoot.querySelectorAll('.org-tree-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-toggle-id');
        if (!id) return;
        if (collapsedNodeIds.has(id)) {
          collapsedNodeIds.delete(id);
        } else {
          collapsedNodeIds.add(id);
        }
        renderOrgTree();
      });
    });

    // Attach Sub-unit Add button
    orgTreeRoot.querySelectorAll('.btn-add-subunit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentId = btn.getAttribute('data-parent-id');
        openAddOrgUnitModal(parentId);
      });
    });

    // Attach Edit button
    orgTreeRoot.querySelectorAll('.btn-edit-unit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-unit-id');
        const unit = orgUnitsList.find(u => u.id === id);
        if (unit) openEditOrgUnitModal(unit);
      });
    });

    // Attach Delete button
    orgTreeRoot.querySelectorAll('.btn-delete-unit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-unit-id');
        const name = btn.getAttribute('data-unit-name');
        handleDeleteOrgUnit(id, name);
      });
    });
  }

  // Expand / Collapse All
  const btnToggleAllTreeNodes = document.getElementById('btnToggleAllTreeNodes');
  if (btnToggleAllTreeNodes) {
    btnToggleAllTreeNodes.addEventListener('click', () => {
      if (collapsedNodeIds.size > 0) {
        collapsedNodeIds.clear();
        btnToggleAllTreeNodes.textContent = 'Collapse All';
      } else {
        orgUnitsList.forEach(u => collapsedNodeIds.add(u.id));
        btnToggleAllTreeNodes.textContent = 'Expand All';
      }
      renderOrgTree();
    });
  }

  // Search Filter
  const inputSearchOrgTree = document.getElementById('inputSearchOrgTree');
  if (inputSearchOrgTree) {
    inputSearchOrgTree.addEventListener('input', (e) => {
      orgTreeFilterTerm = (e.target.value || '').trim();
      renderOrgTree();
    });
  }

  // --- Org Unit Modal (Create / Edit) ---
  const modalOrgUnit = document.getElementById('modalOrgUnit');
  const formOrgUnit = document.getElementById('formOrgUnit');
  const btnCloseOrgUnitModal = document.getElementById('btnCloseOrgUnitModal');
  const btnCancelOrgUnit = document.getElementById('btnCancelOrgUnit');
  const btnOpenAddOrgUnitModal = document.getElementById('btnOpenAddOrgUnitModal');
  const btnEmptyCreateUnit = document.getElementById('btnEmptyCreateUnit');

  function getDescendantUnitIds(unitId) {
    const descendants = new Set();
    function scan(parentId) {
      orgUnitsList.filter(u => u.parent_unit_id === parentId).forEach(child => {
        descendants.add(child.id);
        scan(child.id);
      });
    }
    scan(unitId);
    return descendants;
  }

  function openAddOrgUnitModal(presetParentId = null) {
    if (!modalOrgUnit) return;
    const txtHeading = document.getElementById('txtOrgUnitModalHeading');
    const orgUnitIdHidden = document.getElementById('orgUnitIdHidden');
    const inputOrgUnitName = document.getElementById('inputOrgUnitName');
    const selectOrgUnitType = document.getElementById('selectOrgUnitType');
    const selectOrgUnitLevel = document.getElementById('selectOrgUnitLevel');
    const selectOrgUnitParent = document.getElementById('selectOrgUnitParent');
    const selectOrgUnitManager = document.getElementById('selectOrgUnitManager');
    const modalOrgUnitError = document.getElementById('modalOrgUnitError');

    if (modalOrgUnitError) modalOrgUnitError.style.display = 'none';
    if (txtHeading) txtHeading.textContent = 'Create Organizational Unit';
    if (orgUnitIdHidden) orgUnitIdHidden.value = '';
    if (inputOrgUnitName) inputOrgUnitName.value = '';
    if (selectOrgUnitType) selectOrgUnitType.value = 'DEPARTMENT';

    // Levels
    if (selectOrgUnitLevel) {
      selectOrgUnitLevel.innerHTML = '<option value="">-- Auto (No Specific Level) --</option>' +
        orgLevelsList.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)} (Rank ${l.rank})</option>`).join('');
    }

    // Parents (All units are valid)
    if (selectOrgUnitParent) {
      selectOrgUnitParent.innerHTML = '<option value="">-- None (Top-Level Unit / Root) --</option>' +
        orgUnitsList.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.unit_type || 'UNIT')})</option>`).join('');
      selectOrgUnitParent.value = presetParentId || '';
    }

    // Managers
    if (selectOrgUnitManager) {
      selectOrgUnitManager.innerHTML = '<option value="">-- None / Unassigned --</option>' +
        employees.filter(e => !e.isArchived).map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${e.id})</option>`).join('');
      selectOrgUnitManager.value = '';
    }

    modalOrgUnit.classList.add('open');
    if (inputOrgUnitName) inputOrgUnitName.focus();
  }

  function openEditOrgUnitModal(unit) {
    if (!modalOrgUnit || !unit) return;
    const txtHeading = document.getElementById('txtOrgUnitModalHeading');
    const orgUnitIdHidden = document.getElementById('orgUnitIdHidden');
    const inputOrgUnitName = document.getElementById('inputOrgUnitName');
    const selectOrgUnitType = document.getElementById('selectOrgUnitType');
    const selectOrgUnitLevel = document.getElementById('selectOrgUnitLevel');
    const selectOrgUnitParent = document.getElementById('selectOrgUnitParent');
    const selectOrgUnitManager = document.getElementById('selectOrgUnitManager');
    const modalOrgUnitError = document.getElementById('modalOrgUnitError');

    if (modalOrgUnitError) modalOrgUnitError.style.display = 'none';
    if (txtHeading) txtHeading.textContent = `Edit Unit: ${unit.name}`;
    if (orgUnitIdHidden) orgUnitIdHidden.value = unit.id;
    if (inputOrgUnitName) inputOrgUnitName.value = unit.name;
    if (selectOrgUnitType) selectOrgUnitType.value = unit.unit_type || 'DEPARTMENT';

    if (selectOrgUnitLevel) {
      selectOrgUnitLevel.innerHTML = '<option value="">-- Auto (No Specific Level) --</option>' +
        orgLevelsList.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)} (Rank ${l.rank})</option>`).join('');
      selectOrgUnitLevel.value = unit.level_id || '';
    }

    // Anti-cycle parent selection: exclude self and all descendants
    const illegalParentIds = getDescendantUnitIds(unit.id);
    illegalParentIds.add(unit.id);

    if (selectOrgUnitParent) {
      const parentOptions = orgUnitsList
        .filter(u => !illegalParentIds.has(u.id))
        .map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.unit_type || 'UNIT')})</option>`)
        .join('');

      selectOrgUnitParent.innerHTML = '<option value="">-- None (Top-Level Unit / Root) --</option>' + parentOptions;
      selectOrgUnitParent.value = unit.parent_unit_id || '';
    }

    if (selectOrgUnitManager) {
      selectOrgUnitManager.innerHTML = '<option value="">-- None / Unassigned --</option>' +
        employees.filter(e => !e.isArchived).map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${e.id})</option>`).join('');
      selectOrgUnitManager.value = unit.manager_id || '';
    }

    modalOrgUnit.classList.add('open');
    if (inputOrgUnitName) inputOrgUnitName.focus();
  }

  function closeOrgUnitModal() {
    if (modalOrgUnit) modalOrgUnit.classList.remove('open');
  }

  if (btnOpenAddOrgUnitModal) btnOpenAddOrgUnitModal.addEventListener('click', () => openAddOrgUnitModal());
  if (btnEmptyCreateUnit) btnEmptyCreateUnit.addEventListener('click', () => openAddOrgUnitModal());
  if (btnCloseOrgUnitModal) btnCloseOrgUnitModal.addEventListener('click', closeOrgUnitModal);
  if (btnCancelOrgUnit) btnCancelOrgUnit.addEventListener('click', closeOrgUnitModal);

  if (formOrgUnit) {
    formOrgUnit.addEventListener('submit', async (e) => {
      e.preventDefault();
      const orgUnitIdHidden = document.getElementById('orgUnitIdHidden');
      const inputOrgUnitName = document.getElementById('inputOrgUnitName');
      const selectOrgUnitType = document.getElementById('selectOrgUnitType');
      const selectOrgUnitLevel = document.getElementById('selectOrgUnitLevel');
      const selectOrgUnitParent = document.getElementById('selectOrgUnitParent');
      const selectOrgUnitManager = document.getElementById('selectOrgUnitManager');
      const modalOrgUnitError = document.getElementById('modalOrgUnitError');
      const btnSubmit = document.getElementById('btnSubmitOrgUnit');

      const isEdit = Boolean(orgUnitIdHidden && orgUnitIdHidden.value);
      const name = inputOrgUnitName ? inputOrgUnitName.value.trim() : '';
      const unitType = selectOrgUnitType ? selectOrgUnitType.value : 'DEPARTMENT';
      const levelId = selectOrgUnitLevel ? (selectOrgUnitLevel.value || null) : null;
      const parentUnitId = selectOrgUnitParent ? (selectOrgUnitParent.value || null) : null;
      const managerId = selectOrgUnitManager ? (selectOrgUnitManager.value || null) : null;

      if (!name) {
        if (modalOrgUnitError) {
          modalOrgUnitError.textContent = 'Organizational unit name is required.';
          modalOrgUnitError.style.display = 'block';
        }
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Saving Unit...';
      }

      try {
        if (isEdit) {
          await SmartWorkforceCommon.api.updateOrgUnit(orgUnitIdHidden.value, {
            name,
            unitType,
            levelId,
            parentUnitId,
            managerId
          });
          showToast(`Unit '${name}' updated successfully.`, 'entry');
        } else {
          await SmartWorkforceCommon.api.createOrgUnit({
            name,
            unitType,
            levelId,
            parentUnitId,
            managerId
          });
          showToast(`Unit '${name}' created successfully.`, 'entry');
        }

        closeOrgUnitModal();
        await loadOrgTreeData();
      } catch (err) {
        if (modalOrgUnitError) {
          modalOrgUnitError.textContent = err.message;
          modalOrgUnitError.style.display = 'block';
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Save Unit';
        }
      }
    });
  }

  async function handleDeleteOrgUnit(id, name) {
    if (!confirm(`Are you sure you want to delete organizational unit '${name}'?\n\nAny sub-units will be safely re-parented to this unit's parent, and assigned employees will be unlinked.`)) {
      return;
    }
    try {
      await SmartWorkforceCommon.api.deleteOrgUnit(id);
      showToast(`Unit '${name}' deleted successfully.`, 'exit');
      await loadOrgTreeData();
    } catch (err) {
      alert('Failed to delete organizational unit: ' + err.message);
    }
  }

  // --- Manage Hierarchy Levels Modal ---
  const modalOrgLevels = document.getElementById('modalOrgLevels');
  const btnOpenManageLevelsModal = document.getElementById('btnOpenManageLevelsModal');
  const btnCloseOrgLevelsModal = document.getElementById('btnCloseOrgLevelsModal');
  const btnCloseOrgLevelsBtn = document.getElementById('btnCloseOrgLevelsBtn');
  const formAddLevel = document.getElementById('formAddLevel');

  function openManageLevelsModal() {
    if (!modalOrgLevels) return;
    renderLevelsList();
    modalOrgLevels.classList.add('open');
  }

  function closeManageLevelsModal() {
    if (modalOrgLevels) modalOrgLevels.classList.remove('open');
  }

  if (btnOpenManageLevelsModal) btnOpenManageLevelsModal.addEventListener('click', openManageLevelsModal);
  if (btnCloseOrgLevelsModal) btnCloseOrgLevelsModal.addEventListener('click', closeManageLevelsModal);
  if (btnCloseOrgLevelsBtn) btnCloseOrgLevelsBtn.addEventListener('click', closeManageLevelsModal);

  function renderLevelsList() {
    const tableLevelsBody = document.getElementById('tableLevelsBody');
    if (!tableLevelsBody) return;

    if (!orgLevelsList || orgLevelsList.length === 0) {
      tableLevelsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-dim); padding: 14px;">No hierarchy tiers created yet.</td></tr>';
      return;
    }

    const sorted = [...orgLevelsList].sort((a, b) => a.rank - b.rank);
    tableLevelsBody.innerHTML = sorted.map(lvl => `
      <tr>
        <td style="text-align: center; font-family: var(--font-mono); font-weight: 700;">#${lvl.rank}</td>
        <td><strong>${escapeHtml(lvl.name)}</strong></td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-xs delete btn-del-level" data-level-id="${escapeHtml(lvl.id)}" data-level-name="${escapeHtml(lvl.name)}" title="Delete Level">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');

    tableLevelsBody.querySelectorAll('.btn-del-level').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-level-id');
        const name = btn.getAttribute('data-level-name');
        if (!confirm(`Delete hierarchy level '${name}'? Units assigned to this level must be updated first.`)) return;
        try {
          await SmartWorkforceCommon.api.deleteOrgLevel(id);
          showToast(`Hierarchy level '${name}' removed.`, 'exit');
          orgLevelsList = await SmartWorkforceCommon.api.getOrgLevels().catch(() => []);
          renderLevelsList();
          await loadOrgTreeData();
        } catch (err) {
          alert('Failed to delete level: ' + err.message);
        }
      });
    });
  }

  if (formAddLevel) {
    formAddLevel.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputNewLevelName = document.getElementById('inputNewLevelName');
      const inputNewLevelRank = document.getElementById('inputNewLevelRank');
      const modalOrgLevelsError = document.getElementById('modalOrgLevelsError');

      const name = inputNewLevelName ? inputNewLevelName.value.trim() : '';
      const rank = inputNewLevelRank ? parseInt(inputNewLevelRank.value, 10) : 1;

      if (!name || isNaN(rank)) return;
      if (modalOrgLevelsError) modalOrgLevelsError.style.display = 'none';

      try {
        await SmartWorkforceCommon.api.createOrgLevel({ name, rank });
        if (inputNewLevelName) inputNewLevelName.value = '';
        if (inputNewLevelRank) inputNewLevelRank.value = rank + 1;
        orgLevelsList = await SmartWorkforceCommon.api.getOrgLevels().catch(() => []);
        renderLevelsList();
        await loadOrgTreeData();
        showToast(`Hierarchy level '${name}' added successfully.`, 'entry');
      } catch (err) {
        if (modalOrgLevelsError) {
          modalOrgLevelsError.textContent = err.message;
          modalOrgLevelsError.style.display = 'block';
        }
      }
    });
  }

  // --- Reassign Reporting Relationship Modal ---
  const modalReassignReporting = document.getElementById('modalReassignReporting');
  const btnOpenReassignReportingModal = document.getElementById('btnOpenReassignReportingModal');
  const btnCloseReassignModal = document.getElementById('btnCloseReassignModal');
  const btnCancelReassign = document.getElementById('btnCancelReassign');
  const formReassignReporting = document.getElementById('formReassignReporting');
  const selectReassignEmp = document.getElementById('selectReassignEmp');

  function openReassignReportingModal(empId = null) {
    if (!modalReassignReporting) return;
    populateOrgDropdowns();
    const modalReassignReportingError = document.getElementById('modalReassignReportingError');
    if (modalReassignReportingError) modalReassignReportingError.style.display = 'none';

    if (selectReassignEmp && empId) {
      selectReassignEmp.value = empId;
      triggerReassignEmpChange(empId);
    }
    modalReassignReporting.classList.add('open');
  }

  function closeReassignReportingModal() {
    if (modalReassignReporting) modalReassignReporting.classList.remove('open');
  }

  if (btnOpenReassignReportingModal) btnOpenReassignReportingModal.addEventListener('click', () => openReassignReportingModal());
  if (btnCloseReassignModal) btnCloseReassignModal.addEventListener('click', closeReassignReportingModal);
  if (btnCancelReassign) btnCancelReassign.addEventListener('click', closeReassignReportingModal);

  async function triggerReassignEmpChange(empId) {
    const txtChain = document.getElementById('txtCurrentReportingChain');
    const selectReassignManager = document.getElementById('selectReassignManager');
    const selectReassignOrgUnit = document.getElementById('selectReassignOrgUnit');
    const selectReassignJobTitle = document.getElementById('selectReassignJobTitle');
    const selectReassignAccessRole = document.getElementById('selectReassignAccessRole');

    if (!empId) {
      if (txtChain) txtChain.textContent = 'Select an employee above to preview active reporting line';
      return;
    }

    try {
      const [reportingData, subsData] = await Promise.all([
        SmartWorkforceCommon.api.getEmployeeReporting(empId).catch(() => null),
        SmartWorkforceCommon.api.getEmployeeSubordinates(empId, 'recursive').catch(() => null)
      ]);

      const chainList = Array.isArray(reportingData) ? reportingData : ((reportingData && reportingData.reportingChain) || []);
      const ancestorsOnly = chainList.filter(c => (c.depth !== undefined ? c.depth > 0 : c.id !== empId));

      if (txtChain) {
        if (ancestorsOnly.length > 0) {
          const chainNames = ancestorsOnly.map(m => `${m.name} (${m.id})`).join('  ➔  ');
          txtChain.innerHTML = `<strong>Active Upward Line:</strong> ${escapeHtml(chainNames)}`;
        } else {
          txtChain.textContent = 'Top-level employee (reports directly to Company Head)';
        }
      }

      // Collect descendant IDs to prevent circular loops in UI
      const descendantIds = new Set([empId]);
      const subsList = Array.isArray(subsData) ? subsData : ((subsData && subsData.subordinates) || []);
      subsList.forEach(s => descendantIds.add(s.id));

      const emp = employees.find(e => e.id === empId);
      const curMgr = emp ? (emp.managerId || emp.manager_id || '') : '';

      if (selectReassignManager) {
        const validManagers = employees.filter(e => !e.isArchived && !descendantIds.has(e.id));
        selectReassignManager.innerHTML = '<option value="">-- None (Top Level / Direct to Head) --</option>' +
          validManagers.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} (${m.id})</option>`).join('');
        selectReassignManager.value = curMgr || '';
      }

      if (emp) {
        if (selectReassignOrgUnit) selectReassignOrgUnit.value = emp.orgUnitId || emp.org_unit_id || '';
        if (selectReassignJobTitle) selectReassignJobTitle.value = emp.jobTitleId || emp.job_title_id || '';
        if (selectReassignAccessRole) selectReassignAccessRole.value = emp.accessRoleId || emp.access_role_id || '';
      }
    } catch (err) {
      console.warn('Error fetching employee reporting line:', err);
    }
  }

  if (selectReassignEmp) {
    selectReassignEmp.addEventListener('change', (e) => {
      triggerReassignEmpChange(e.target.value);
    });
  }

  if (formReassignReporting) {
    formReassignReporting.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectReassignEmp = document.getElementById('selectReassignEmp');
      const selectReassignManager = document.getElementById('selectReassignManager');
      const selectReassignOrgUnit = document.getElementById('selectReassignOrgUnit');
      const selectReassignJobTitle = document.getElementById('selectReassignJobTitle');
      const selectReassignAccessRole = document.getElementById('selectReassignAccessRole');
      const modalReassignReportingError = document.getElementById('modalReassignReportingError');
      const btnSubmit = document.getElementById('btnSubmitReassign');

      const empId = selectReassignEmp ? selectReassignEmp.value : '';
      if (!empId) return;

      const managerId = selectReassignManager ? (selectReassignManager.value || null) : null;
      const orgUnitId = selectReassignOrgUnit ? (selectReassignOrgUnit.value || null) : null;
      const jobTitleId = selectReassignJobTitle ? (selectReassignJobTitle.value || null) : null;
      const accessRoleId = selectReassignAccessRole ? (selectReassignAccessRole.value || null) : null;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Updating...';
      }

      try {
        await SmartWorkforceCommon.api.updateEmployeeReporting(empId, {
          managerId,
          orgUnitId,
          jobTitleId,
          accessRoleId
        });
        showToast('Reporting hierarchy updated successfully.', 'entry');
        closeReassignReportingModal();
        await Promise.all([
          syncDashboardData(),
          loadOrgTreeData()
        ]);
      } catch (err) {
        if (modalReassignReportingError) {
          modalReassignReportingError.textContent = err.message;
          modalReassignReportingError.style.display = 'block';
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Update Reporting';
        }
      }
    });
  }

  // ==========================================
  // 2. JOB TITLES MANAGEMENT
  // ==========================================

  async function loadJobTitles() {
    try {
      const titles = await SmartWorkforceCommon.api.getJobTitles();
      if (Array.isArray(titles)) {
        jobTitlesList = titles;
      }
      const statJobTitlesCount = document.getElementById('statJobTitlesCount');
      if (statJobTitlesCount) statJobTitlesCount.textContent = jobTitlesList.length;

      renderJobTitlesTable();
      populateOrgDropdowns();
    } catch (err) {
      console.warn('Failed to load job titles:', err);
    }
  }

  function renderJobTitlesTable() {
    const tableBody = document.getElementById('tableJobTitlesBody');
    const emptyState = document.getElementById('jobTitlesEmptyState');
    if (!tableBody) return;

    const term = jobTitlesFilterTerm.toLowerCase();
    const filtered = jobTitlesList.filter(t => {
      if (!term) return true;
      return (t.title || '').toLowerCase().includes(term) || (t.description || '').toLowerCase().includes(term);
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tableBody.innerHTML = filtered.map(t => {
      const assignedCount = t.employee_count !== undefined
        ? t.employee_count
        : employees.filter(e => (e.jobTitleId || e.job_title_id) === t.id).length;

      const isActive = t.is_active !== 0;

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${escapeHtml(t.title)}</div>
            ${t.code ? `<div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">CODE: ${escapeHtml(t.code)}</div>` : ''}
          </td>
          <td style="color: var(--text-secondary); font-size: 0.82rem;">
            ${escapeHtml(t.description || 'Standard corporate role')}
          </td>
          <td style="text-align: center;">
            <span class="tree-stat-pill" style="padding: 3px 9px;"><strong>${assignedCount}</strong> Staff</span>
          </td>
          <td style="text-align: center;">
            <span class="${isActive ? 'badge-status-active' : 'badge-status-suspended'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button type="button" class="btn-icon-xs btn-edit-job" data-job-id="${escapeHtml(t.id)}" title="Edit Job Title">
                ✏️
              </button>
              <button type="button" class="btn-icon-xs delete btn-delete-job" data-job-id="${escapeHtml(t.id)}" data-job-title="${escapeHtml(t.title)}" data-assigned-count="${assignedCount}" title="Delete Job Title">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('.btn-edit-job').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-job-id');
        const title = jobTitlesList.find(t => t.id === id);
        if (title) openEditJobTitleModal(title);
      });
    });

    tableBody.querySelectorAll('.btn-delete-job').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-job-id');
        const titleName = btn.getAttribute('data-job-title');
        const assignedCount = parseInt(btn.getAttribute('data-assigned-count') || '0', 10);
        handleDeleteJobTitle(id, titleName, assignedCount);
      });
    });
  }

  const inputSearchJobTitles = document.getElementById('inputSearchJobTitles');
  if (inputSearchJobTitles) {
    inputSearchJobTitles.addEventListener('input', (e) => {
      jobTitlesFilterTerm = (e.target.value || '').trim();
      renderJobTitlesTable();
    });
  }

  // --- Job Title Modal (Create / Edit) ---
  const modalJobTitle = document.getElementById('modalJobTitle');
  const formJobTitle = document.getElementById('formJobTitle');
  const btnOpenAddJobTitleModal = document.getElementById('btnOpenAddJobTitleModal');
  const btnEmptyCreateJobTitle = document.getElementById('btnEmptyCreateJobTitle');
  const btnCloseJobTitleModal = document.getElementById('btnCloseJobTitleModal');
  const btnCancelJobTitle = document.getElementById('btnCancelJobTitle');

  function openAddJobTitleModal() {
    if (!modalJobTitle) return;
    const txtHeading = document.getElementById('txtJobTitleModalHeading');
    const jobTitleIdHidden = document.getElementById('jobTitleIdHidden');
    const inputJobTitleName = document.getElementById('inputJobTitleName');
    const inputJobTitleDesc = document.getElementById('inputJobTitleDesc');
    const checkJobTitleActive = document.getElementById('checkJobTitleActive');
    const modalJobTitleError = document.getElementById('modalJobTitleError');

    if (modalJobTitleError) modalJobTitleError.style.display = 'none';
    if (txtHeading) txtHeading.textContent = 'Create Job Title';
    if (jobTitleIdHidden) jobTitleIdHidden.value = '';
    if (inputJobTitleName) inputJobTitleName.value = '';
    if (inputJobTitleDesc) inputJobTitleDesc.value = '';
    if (checkJobTitleActive) checkJobTitleActive.checked = true;

    modalJobTitle.classList.add('open');
    if (inputJobTitleName) inputJobTitleName.focus();
  }

  function openEditJobTitleModal(title) {
    if (!modalJobTitle || !title) return;
    const txtHeading = document.getElementById('txtJobTitleModalHeading');
    const jobTitleIdHidden = document.getElementById('jobTitleIdHidden');
    const inputJobTitleName = document.getElementById('inputJobTitleName');
    const inputJobTitleDesc = document.getElementById('inputJobTitleDesc');
    const checkJobTitleActive = document.getElementById('checkJobTitleActive');
    const modalJobTitleError = document.getElementById('modalJobTitleError');

    if (modalJobTitleError) modalJobTitleError.style.display = 'none';
    if (txtHeading) txtHeading.textContent = `Edit Job Title: ${title.title}`;
    if (jobTitleIdHidden) jobTitleIdHidden.value = title.id;
    if (inputJobTitleName) inputJobTitleName.value = title.title;
    if (inputJobTitleDesc) inputJobTitleDesc.value = title.description || '';
    if (checkJobTitleActive) checkJobTitleActive.checked = title.is_active !== 0;

    modalJobTitle.classList.add('open');
    if (inputJobTitleName) inputJobTitleName.focus();
  }

  function closeJobTitleModal() {
    if (modalJobTitle) modalJobTitle.classList.remove('open');
  }

  if (btnOpenAddJobTitleModal) btnOpenAddJobTitleModal.addEventListener('click', openAddJobTitleModal);
  if (btnEmptyCreateJobTitle) btnEmptyCreateJobTitle.addEventListener('click', openAddJobTitleModal);
  if (btnCloseJobTitleModal) btnCloseJobTitleModal.addEventListener('click', closeJobTitleModal);
  if (btnCancelJobTitle) btnCancelJobTitle.addEventListener('click', closeJobTitleModal);

  if (formJobTitle) {
    formJobTitle.addEventListener('submit', async (e) => {
      e.preventDefault();
      const jobTitleIdHidden = document.getElementById('jobTitleIdHidden');
      const inputJobTitleName = document.getElementById('inputJobTitleName');
      const inputJobTitleDesc = document.getElementById('inputJobTitleDesc');
      const checkJobTitleActive = document.getElementById('checkJobTitleActive');
      const modalJobTitleError = document.getElementById('modalJobTitleError');
      const btnSubmit = document.getElementById('btnSubmitJobTitle');

      const isEdit = Boolean(jobTitleIdHidden && jobTitleIdHidden.value);
      const title = inputJobTitleName ? inputJobTitleName.value.trim() : '';
      const description = inputJobTitleDesc ? inputJobTitleDesc.value.trim() : '';
      const isActive = checkJobTitleActive ? (checkJobTitleActive.checked ? 1 : 0) : 1;

      if (!title) return;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Saving...';
      }

      try {
        if (isEdit) {
          await SmartWorkforceCommon.api.updateJobTitle(jobTitleIdHidden.value, { title, description, isActive });
          showToast(`Job title '${title}' updated.`, 'entry');
        } else {
          await SmartWorkforceCommon.api.createJobTitle({ title, description, isActive });
          showToast(`Job title '${title}' created.`, 'entry');
        }
        closeJobTitleModal();
        await loadJobTitles();
      } catch (err) {
        if (modalJobTitleError) {
          modalJobTitleError.textContent = err.message;
          modalJobTitleError.style.display = 'block';
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Save Title';
        }
      }
    });
  }

  async function handleDeleteJobTitle(id, titleName, assignedCount) {
    let warning = `Delete job title '${titleName}'?`;
    if (assignedCount > 0) {
      warning += `\n\nWarning: ${assignedCount} employee(s) are currently assigned this title. They will be unlinked automatically.`;
    }
    if (!confirm(warning)) return;

    try {
      await SmartWorkforceCommon.api.deleteJobTitle(id);
      showToast(`Job title '${titleName}' removed.`, 'exit');
      await loadJobTitles();
    } catch (err) {
      alert('Failed to delete job title: ' + err.message);
    }
  }

  // ==========================================
  // 3. ROLES & PERMISSIONS MATRIX
  // ==========================================

  async function loadRoles() {
    try {
      const roles = await SmartWorkforceCommon.api.getRoles();
      if (Array.isArray(roles)) {
        rolesList = roles;
      }

      renderRolesList();
      populateOrgDropdowns();

      // Default select active role or first role
      if (!activeRoleId || !rolesList.find(r => r.id === activeRoleId)) {
        if (rolesList.length > 0) {
          selectRole(rolesList[0].id);
        }
      } else {
        selectRole(activeRoleId);
      }
    } catch (err) {
      console.warn('Failed to load access roles:', err);
    }
  }

  function renderRolesList() {
    const listContainer = document.getElementById('rolesListContainer');
    if (!listContainer) return;

    if (!rolesList || rolesList.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--text-dim); text-align: center; padding: 20px;">No roles configured.</div>';
      return;
    }

    listContainer.innerHTML = rolesList.map(r => {
      const isActive = r.id === activeRoleId;
      const count = r.employee_count !== undefined ? r.employee_count : 0;
      const isSystem = Boolean(r.is_system_role);

      return `
        <div class="role-item-card ${isActive ? 'active' : ''}" data-role-id="${escapeHtml(r.id)}">
          <div class="role-item-top">
            <span class="role-item-name">${escapeHtml(r.name)}</span>
            ${isSystem ? '<span class="system-role-badge">🔒 System</span>' : '<span class="custom-role-badge">Custom</span>'}
          </div>
          <div class="role-item-desc">${escapeHtml(r.description || 'Custom corporate role')}</div>
          <div class="role-item-footer">
            <span>👥 <strong>${count}</strong> Staff Assigned</span>
            <span style="font-size: 0.68rem; color: var(--text-dim); font-family: var(--font-mono);">${r.permissions ? r.permissions.length : 0} Perms</span>
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.role-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-role-id');
        selectRole(id);
      });
    });
  }

  async function selectRole(roleId) {
    activeRoleId = roleId;
    renderRolesList();

    const role = rolesList.find(r => r.id === roleId);
    if (!role) return;

    const activeRoleTitle = document.getElementById('activeRoleTitle');
    const activeRoleDesc = document.getElementById('activeRoleDesc');
    const activeRoleBadge = document.getElementById('activeRoleBadge');
    const systemRoleNotice = document.getElementById('systemRoleNotice');
    const btnDeleteActiveRole = document.getElementById('btnDeleteActiveRole');

    if (activeRoleTitle) activeRoleTitle.textContent = role.name;
    if (activeRoleDesc) activeRoleDesc.textContent = role.description || 'Configured access role';
    if (activeRoleBadge) {
      activeRoleBadge.innerHTML = role.is_system_role
        ? '<span class="system-role-badge">🔒 System Protected</span>'
        : '<span class="custom-role-badge">Custom Role</span>';
    }

    if (systemRoleNotice) systemRoleNotice.style.display = role.is_system_role ? 'block' : 'none';
    if (btnDeleteActiveRole) btnDeleteActiveRole.style.display = role.is_system_role ? 'none' : 'inline-block';

    try {
      const perms = await SmartWorkforceCommon.api.getRolePermissions(roleId);
      activeRolePermissions = Array.isArray(perms) ? perms : [];
    } catch (_) {
      activeRolePermissions = role.permissions || [];
    }

    renderPermsMatrix();
  }

  function renderPermsMatrix() {
    const tableBody = document.getElementById('tablePermsMatrixBody');
    if (!tableBody) return;

    // Group specs by category
    const categories = ['Organization', 'Access Roles', 'Workforce', 'Attendance', 'Intelligence'];

    let html = '';
    categories.forEach(cat => {
      const specs = ALL_PERMISSION_SPECS.filter(s => s.category === cat);
      if (specs.length === 0) return;

      html += `
        <tr class="perm-category-header">
          <td colspan="4">${cat} Operations</td>
        </tr>
      `;

      specs.forEach(spec => {
        const assigned = activeRolePermissions.find(p => p.key === spec.key || p.permission_key === spec.key);
        const isChecked = Boolean(assigned);
        const curScope = assigned ? (assigned.scope || 'COMPANY') : spec.defaultScope;

        html += `
          <tr data-perm-key="${escapeHtml(spec.key)}">
            <td style="text-align: center;">
              <input type="checkbox" class="perm-checkbox chk-perm" data-key="${escapeHtml(spec.key)}" ${isChecked ? 'checked' : ''}>
            </td>
            <td class="perm-key-cell">
              <code>${escapeHtml(spec.key)}</code>
            </td>
            <td>
              <div style="font-size: 0.82rem; color: var(--text-main); font-weight: 500;">${escapeHtml(spec.description)}</div>
            </td>
            <td>
              <select class="scope-select sel-scope" data-key="${escapeHtml(spec.key)}" ${isChecked ? '' : 'disabled'}>
                ${VALID_SCOPES.map(s => `<option value="${s}" ${s === curScope ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </td>
          </tr>
        `;
      });
    });

    tableBody.innerHTML = html;

    // Checkbox toggling enables/disables scope selector
    tableBody.querySelectorAll('.chk-perm').forEach(chk => {
      chk.addEventListener('change', () => {
        const key = chk.getAttribute('data-key');
        const sel = tableBody.querySelector(`.sel-scope[data-key="${key}"]`);
        if (sel) sel.disabled = !chk.checked;
      });
    });
  }

  // Save Permissions Button
  const btnSaveRolePermissions = document.getElementById('btnSaveRolePermissions');
  if (btnSaveRolePermissions) {
    btnSaveRolePermissions.addEventListener('click', async () => {
      if (!activeRoleId) return;
      const role = rolesList.find(r => r.id === activeRoleId);
      if (!role) return;

      const tableBody = document.getElementById('tablePermsMatrixBody');
      if (!tableBody) return;

      const updatedPerms = [];
      tableBody.querySelectorAll('tr[data-perm-key]').forEach(tr => {
        const key = tr.getAttribute('data-perm-key');
        const chk = tr.querySelector('.chk-perm');
        const sel = tr.querySelector('.sel-scope');
        if (chk && chk.checked) {
          updatedPerms.push({
            key,
            scope: sel ? sel.value : 'COMPANY'
          });
        }
      });

      // Warning check if permissions were removed
      const currentCount = activeRolePermissions.length;
      if (updatedPerms.length < currentCount) {
        if (!confirm(`Warning: You are reducing permission privileges for role '${role.name}'. All employees assigned to this role will immediately have their access updated. Proceed?`)) {
          return;
        }
      }

      btnSaveRolePermissions.disabled = true;
      btnSaveRolePermissions.textContent = 'Saving...';

      try {
        await SmartWorkforceCommon.api.updateRolePermissions(activeRoleId, updatedPerms);
        showToast(`Permissions updated for role '${role.name}'.`, 'entry');
        await loadRoles();
      } catch (err) {
        alert('Failed to update role permissions: ' + err.message);
      } finally {
        btnSaveRolePermissions.disabled = false;
        btnSaveRolePermissions.textContent = 'Save Permissions';
      }
    });
  }

  // Custom Role Modal (Create)
  const modalRole = document.getElementById('modalRole');
  const formRole = document.getElementById('formRole');
  const btnOpenAddRoleModal = document.getElementById('btnOpenAddRoleModal');
  const btnCloseRoleModal = document.getElementById('btnCloseRoleModal');
  const btnCancelRole = document.getElementById('btnCancelRole');

  function openAddRoleModal() {
    if (!modalRole) return;
    const inputRoleName = document.getElementById('inputRoleName');
    const inputRoleDesc = document.getElementById('inputRoleDesc');
    const modalRoleError = document.getElementById('modalRoleError');

    if (modalRoleError) modalRoleError.style.display = 'none';
    if (inputRoleName) inputRoleName.value = '';
    if (inputRoleDesc) inputRoleDesc.value = '';

    modalRole.classList.add('open');
    if (inputRoleName) inputRoleName.focus();
  }

  function closeRoleModal() {
    if (modalRole) modalRole.classList.remove('open');
  }

  if (btnOpenAddRoleModal) btnOpenAddRoleModal.addEventListener('click', openAddRoleModal);
  if (btnCloseRoleModal) btnCloseRoleModal.addEventListener('click', closeRoleModal);
  if (btnCancelRole) btnCancelRole.addEventListener('click', closeRoleModal);

  if (formRole) {
    formRole.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputRoleName = document.getElementById('inputRoleName');
      const inputRoleDesc = document.getElementById('inputRoleDesc');
      const modalRoleError = document.getElementById('modalRoleError');
      const btnSubmit = document.getElementById('btnSubmitRole');

      const name = inputRoleName ? inputRoleName.value.trim() : '';
      const description = inputRoleDesc ? inputRoleDesc.value.trim() : '';

      if (!name) return;

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Creating Role...';
      }

      try {
        const res = await SmartWorkforceCommon.api.createRole({ name, description });
        showToast(`Custom role '${name}' created. Configure permissions below.`, 'entry');
        closeRoleModal();
        await loadRoles();
        if (res && res.role) {
          selectRole(res.role.id);
        }
      } catch (err) {
        if (modalRoleError) {
          modalRoleError.textContent = err.message;
          modalRoleError.style.display = 'block';
        }
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Create Role';
        }
      }
    });
  }

  // Delete Custom Role Button
  const btnDeleteActiveRole = document.getElementById('btnDeleteActiveRole');
  if (btnDeleteActiveRole) {
    btnDeleteActiveRole.addEventListener('click', async () => {
      if (!activeRoleId) return;
      const role = rolesList.find(r => r.id === activeRoleId);
      if (!role) return;
      if (role.is_system_role) {
        alert('System roles are protected and cannot be deleted.');
        return;
      }

      const assigned = role.employee_count || 0;
      let warning = `Are you sure you want to delete role '${role.name}'?`;
      if (assigned > 0) {
        warning += `\n\nWarning: ${assigned} employee(s) have this role. Their access role will be set to Unassigned (Standard Employee fallback).`;
      }
      if (!confirm(warning)) return;

      try {
        await SmartWorkforceCommon.api.deleteRole(activeRoleId);
        showToast(`Role '${role.name}' deleted successfully.`, 'exit');
        activeRoleId = null;
        await loadRoles();
      } catch (err) {
        alert('Failed to delete role: ' + err.message);
      }
    });
  }


  // ========================================================
  // ADMIN DASHBOARD AUTHENTICATION, CSRF & PORTAL ROUTING
  // ========================================================
  function getCsrfToken() {
    return window.__swCsrfToken || (function() {
      const match = document.cookie.match(/(?:^|;\s*)sw_csrf=([^;]+)/);
      return match ? decodeURIComponent(match[1]) : '';
    })();
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });
    } catch (_) {}
    window.location.href = '/login';
  }

  async function initAdminPortal() {
    const btnHeaderSignOut = document.getElementById('btnHeaderSignOut');
    const btnSidebarSignOut = document.getElementById('btnSidebarSignOut');

    if (btnHeaderSignOut) {
      btnHeaderSignOut.addEventListener('click', handleSignOut);
    }
    if (btnSidebarSignOut) {
      btnSidebarSignOut.addEventListener('click', handleSignOut);
    }

    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        window.location.href = '/login?redirect=/admin';
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        window.location.href = '/login?redirect=/admin';
        return;
      }
      window.__swAuth = data;
      if (data.csrfToken) {
        window.__swCsrfToken = data.csrfToken;
      }

      // Update sidebar & header user info dynamically
      const userNameEl = document.querySelector('.user-name');
      if (userNameEl && data.user) {
        userNameEl.textContent = data.user.fullName || data.user.name;
      }
      const userRoleEl = document.querySelector('.user-role');
      if (userRoleEl && data.user) {
        userRoleEl.textContent = data.user.role === 'COMPANY_HEAD' ? 'Company Head' : (data.user.role || 'Administrator');
      }
      const userAvatarEl = document.querySelector('.user-avatar');
      if (userAvatarEl && data.user && (data.user.fullName || data.user.name)) {
        const fullName = (data.user.fullName || data.user.name).trim();
        const parts = fullName.split(/\s+/);
        userAvatarEl.textContent = parts.length > 1
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : fullName.slice(0, 2).toUpperCase();
      }
      const brandSubEl = document.querySelector('.brand-subtitle');
      if (brandSubEl && data.company) {
        brandSubEl.textContent = data.company.name;
      }
    } catch (_) {
      window.location.href = '/login?redirect=/admin';
      return;
    }

    loadInitialData();
  }

  initAdminPortal();

})();

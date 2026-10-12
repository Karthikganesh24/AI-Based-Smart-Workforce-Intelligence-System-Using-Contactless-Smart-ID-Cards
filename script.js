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

  // Modal: Add Employee
  const modalAddEmployee = document.getElementById('modalAddEmployee');
  const btnOpenAddEmployeeModal = document.getElementById('btnOpenAddEmployeeModal');
  const btnCloseAddEmployeeModal = document.getElementById('btnCloseAddEmployeeModal');
  const btnCancelAddEmployee = document.getElementById('btnCancelAddEmployee');
  const formAddEmployee = document.getElementById('formAddEmployee');
  const btnGenUid = document.getElementById('btnGenUid');
  const newEmpId = document.getElementById('newEmpId');
  const newEmpName = document.getElementById('newEmpName');
  const newEmpDept = document.getElementById('newEmpDept');
  const newEmpRole = document.getElementById('newEmpRole');
  const newEmpUid = document.getElementById('newEmpUid');

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
  function renderEmployeeTable() {
    if (!employeeTableBody) return;

    const query = inputSearchEmployees ? inputSearchEmployees.value.trim().toLowerCase() : '';
    const deptFilter = filterEmpDept ? filterEmpDept.value : 'ALL';
    const statusFilter = filterEmpStatus ? filterEmpStatus.value : 'ALL';

    const filtered = employees.filter(emp => {
      const matchQuery =
        !query ||
        emp.id.toLowerCase().includes(query) ||
        emp.name.toLowerCase().includes(query) ||
        emp.role.toLowerCase().includes(query) ||
        emp.uid.toLowerCase().includes(query);

      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;
      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter;

      return matchQuery && matchDept && matchStatus;
    });

    if (filtered.length === 0) {
      employeeTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <div>No employee records matched your filter criteria.</div>
          </td>
        </tr>
      `;
      return;
    }

    employeeTableBody.innerHTML = '';
    filtered.forEach(emp => {
      const tr = document.createElement('tr');
      const isInside = emp.status === 'INSIDE';

      tr.innerHTML = `
        <td><span class="emp-id-badge">${emp.id}</span></td>
        <td>
          <div class="emp-name-cell">
            <div class="emp-avatar-sm" style="background-color: ${emp.avatarBg};">${getInitials(emp.name)}</div>
            <span style="font-weight: 600;">${emp.name}</span>
          </div>
        </td>
        <td>${emp.department}</td>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${emp.role}</td>
        <td><span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim);">${emp.uid}</span></td>
        <td>
          <span class="status-badge ${isInside ? 'present' : 'checked-out'}">
            ${isInside ? '● INSIDE' : '○ OUTSIDE'}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim);">${emp.lastSeen}</td>
        <td style="text-align: right;">
          <button class="btn-quick-tap" data-emp-id="${emp.id}" title="Tap Smart ID at Gate">
            <svg style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;" viewBox="0 0 24 24">
              <path d="M4.9 19.1C2.5 16.7 2.5 12.8 4.9 10.4M7.8 16.2C6.2 14.6 6.2 12 7.8 10.4M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            </svg>
            Tap ${isInside ? 'Exit' : 'Entry'}
          </button>
        </td>
      `;
      employeeTableBody.appendChild(tr);
    });

    employeeTableBody.querySelectorAll('.btn-quick-tap').forEach(btn => {
      btn.addEventListener('click', () => {
        const empId = btn.getAttribute('data-emp-id');
        executeSmartCardScan(empId, 'AUTO');
      });
    });
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
      const res = await fetch('/api/simulation/report', { method: 'DELETE' });
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
          const res = await fetch('/api/attendance/logs', { method: 'DELETE' });
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
  // 16. EMPLOYEE MANAGEMENT MODAL (ADD EMPLOYEE BACKED BY SQLITE)
  // ==========================================
  if (btnOpenAddEmployeeModal) {
    btnOpenAddEmployeeModal.addEventListener('click', () => {
      newEmpId.value = `EMP-${100 + employees.length + 1}`;
      newEmpUid.value = generateRandomCardUid();
      newEmpName.value = '';
      newEmpRole.value = '';
      modalAddEmployee.classList.add('open');
    });
  }

  if (btnCloseAddEmployeeModal) {
    btnCloseAddEmployeeModal.addEventListener('click', () => modalAddEmployee.classList.remove('open'));
  }
  if (btnCancelAddEmployee) {
    btnCancelAddEmployee.addEventListener('click', () => modalAddEmployee.classList.remove('open'));
  }

  if (btnGenUid) {
    btnGenUid.addEventListener('click', () => {
      newEmpUid.value = generateRandomCardUid();
    });
  }

  if (formAddEmployee) {
    formAddEmployee.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = newEmpId.value.trim();
      const name = newEmpName.value.trim();
      const department = newEmpDept.value;
      const role = newEmpRole.value.trim();
      const uid = newEmpUid.value.trim();

      if (!id || !name || !role || !uid) {
        alert('Please fill out all required fields.');
        return;
      }

      const deptColors = {
        'Production': '#0284C7',
        'Quality': '#059669',
        'IT': '#7C3AED',
        'Maintenance': '#D97706'
      };

      const newEmployeeData = {
        id,
        name,
        department,
        role,
        uid,
        avatarBg: deptColors[department] || '#3B82F6'
      };

      try {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEmployeeData)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Registration failed with status ${res.status}`);
        }

        const createdEmployee = await res.json();
        employees.push(createdEmployee);

        modalAddEmployee.classList.remove('open');
        formAddEmployee.reset();

        populateEmployeeSelect();
        selectEmployee.value = createdEmployee.id;
        updateVirtualCardPreview(createdEmployee.id);
        updateKPIs();
        updateDepartmentGrid();
        renderAttendanceRosterTable();
        renderOverviewRosterSnapshot();
        renderEmployeeTable();
        renderAttendanceCharts();

        showToast(`Enrolled ${createdEmployee.name} (${createdEmployee.id}) into SQLite database`, 'entry');
      } catch (err) {
        alert(err.message);
      }
    });
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
    return `${emps ? emps.length : 0}_${presentCount}_${logs ? logs.length : 0}_${logId}_${logTimestamp}`;
  }

  function updateSyncFingerprint() {
    lastSyncFingerprint = calculateFingerprint(employees, attendanceLogs);
  }

  async function syncDashboardData() {
    if (isSyncing || document.hidden) return;
    isSyncing = true;

    try {
      const [empRes, logsRes] = await Promise.all([
        fetch('/api/employees'),
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
      const [empRes, logsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/attendance/logs')
      ]);

      if (empRes.ok && logsRes.ok) {
        employees = await empRes.json();
        attendanceLogs = await logsRes.json();
      }
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

  loadInitialData();

})();

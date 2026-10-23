/**
 * analytics.js - AI & Statistical Workforce Intelligence Analytics Engine
 * Powered by SQLite persistence and transparent, explainable heuristic models.
 * Zero external ML dependencies; 100% auditable and rule-based.
 */

const db = require('../database/database.js');

// Configurable Enterprise Work Schedule & Shift Targets
const WORK_SCHEDULE = {
  shiftStart: process.env.SHIFT_START || '09:00:00', // 09:00 AM
  shiftEnd: process.env.SHIFT_END || '17:00:00',     // 05:00 PM
  graceMinutes: parseInt(process.env.GRACE_MINUTES, 10) || 15, // 15-min grace (late after 09:15)
  standardShiftHours: parseFloat(process.env.SHIFT_HOURS) || 8.0, // 8-hour standard workday
  offHoursStart: '22:00:00', // 10:00 PM
  offHoursEnd: '05:00:00'    // 05:00 AM
};

/**
 * Helper: Parse HH:mm:ss string to total minutes from midnight
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes + (seconds / 60);
}

/**
 * Helper: Extract time portion (HH:mm:ss) from timestamp "YYYY-MM-DD HH:mm:ss"
 */
function extractTimePart(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const parts = timestamp.trim().split(' ');
  return parts.length > 1 ? parts[1] : parts[0];
}

/**
 * Helper: Extract date portion (YYYY-MM-DD) from timestamp
 */
function extractDatePart(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const parts = timestamp.trim().split(' ');
  return parts[0];
}

/**
 * Helper: Get current local date string (YYYY-MM-DD)
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 1. Punctuality & Overtime Calculation
 * Computes late arrivals, early departures, and confirmed overtime from actual gate logs.
 */
function getPunctualityAndOvertime(companyIdOrDate = null, targetDate = null) {
  let companyId = null;
  let dateStr = null;
  if (typeof companyIdOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(companyIdOrDate)) {
    dateStr = companyIdOrDate;
    companyId = targetDate;
  } else {
    companyId = companyIdOrDate;
    dateStr = targetDate || getTodayDateString();
  }
  const employees = db.getAllEmployees(companyId);
  const allEvents = db.getAllAttendanceEvents(companyId);

  // Filter events by date
  const dateEvents = allEvents.filter(e => extractDatePart(e.timestamp) === dateStr);

  const shiftStartMins = timeStringToMinutes(WORK_SCHEDULE.shiftStart);
  const shiftEndMins = timeStringToMinutes(WORK_SCHEDULE.shiftEnd);
  const graceMins = WORK_SCHEDULE.graceMinutes;

  const records = [];
  let totalOnTime = 0;
  let totalLate = 0;
  let totalEarlyDepartures = 0;
  let totalOvertimeHours = 0;
  let totalWorkHours = 0;

  for (const emp of employees) {
    const empEvents = dateEvents.filter(e => e.empId === emp.id);

    // Sort chronologically
    empEvents.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

    const firstEntry = empEvents.find(e => e.eventType === 'ENTRY');
    const lastExit = [...empEvents].reverse().find(e => e.eventType === 'EXIT');

    if (!firstEntry) {
      // Employee has not checked in today
      records.push({
        empId: emp.id,
        empName: emp.name,
        department: emp.department,
        role: emp.role,
        hasCheckedIn: false,
        entryTime: null,
        exitTime: null,
        isLate: null,
        lateMinutes: 0,
        isEarlyDeparture: null,
        earlyMinutes: 0,
        workDurationHours: null,
        overtimeHours: null,
        statusLabel: 'NOT_LOGGED_TODAY',
        statusDescription: 'No entry scan logged today'
      });
      continue;
    }

    // Check In Time Analysis
    const entryTimeStr = extractTimePart(firstEntry.timestamp);
    const entryMins = timeStringToMinutes(entryTimeStr);
    let isLate = false;
    let lateMinutes = 0;

    if (entryMins !== null && shiftStartMins !== null) {
      if (entryMins > (shiftStartMins + graceMins)) {
        isLate = true;
        lateMinutes = Math.round(entryMins - shiftStartMins);
        totalLate++;
      } else {
        totalOnTime++;
      }
    }

    // Exit Time & Early Departure Analysis
    let exitTimeStr = null;
    let isEarlyDeparture = null;
    let earlyMinutes = 0;
    let workDurationHours = null;
    let overtimeHours = null;

    if (lastExit && lastExit.timestamp > firstEntry.timestamp) {
      exitTimeStr = extractTimePart(lastExit.timestamp);
      const exitMins = timeStringToMinutes(exitTimeStr);

      if (exitMins !== null && shiftEndMins !== null) {
        if (exitMins < shiftEndMins) {
          isEarlyDeparture = true;
          earlyMinutes = Math.round(shiftEndMins - exitMins);
          totalEarlyDepartures++;
        } else {
          isEarlyDeparture = false;
        }
      }

      // Calculate Duration & Overtime strictly when both valid entry & exit exist
      const entryDateObj = new Date(firstEntry.timestamp.replace(' ', 'T'));
      const exitDateObj = new Date(lastExit.timestamp.replace(' ', 'T'));
      const diffMs = exitDateObj.getTime() - entryDateObj.getTime();

      if (!isNaN(diffMs) && diffMs > 0) {
        const hoursWorked = diffMs / (1000 * 60 * 60);
        workDurationHours = parseFloat(hoursWorked.toFixed(2));
        totalWorkHours += workDurationHours;

        if (workDurationHours > WORK_SCHEDULE.standardShiftHours) {
          overtimeHours = parseFloat((workDurationHours - WORK_SCHEDULE.standardShiftHours).toFixed(2));
          totalOvertimeHours += overtimeHours;
        } else {
          overtimeHours = 0;
        }
      }
    } else {
      // Exit scan has not yet occurred
      isEarlyDeparture = null;
      statusDescription = 'Checked in — shift in progress';
    }

    records.push({
      empId: emp.id,
      empName: emp.name,
      department: emp.department,
      role: emp.role,
      hasCheckedIn: true,
      entryTime: entryTimeStr,
      exitTime: exitTimeStr,
      isLate,
      lateMinutes,
      isEarlyDeparture,
      earlyMinutes,
      workDurationHours,
      overtimeHours,
      statusLabel: isLate ? 'LATE_ARRIVAL' : 'ON_TIME',
      statusDescription: isLate ? `Late by ${lateMinutes}m` : 'On-time arrival'
    });
  }

  const checkedInCount = records.filter(r => r.hasCheckedIn).length;
  const onTimeRate = checkedInCount > 0 ? Math.round((totalOnTime / checkedInCount) * 100) : 0;

  return {
    date: dateStr,
    schedule: WORK_SCHEDULE,
    summary: {
      totalEmployees: employees.length,
      checkedInCount,
      absentCount: employees.length - checkedInCount,
      onTimeCount: totalOnTime,
      lateCount: totalLate,
      onTimeRatePercent: onTimeRate,
      earlyDeparturesCount: totalEarlyDepartures,
      totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
      totalWorkHours: parseFloat(totalWorkHours.toFixed(2))
    },
    records
  };
}

/**
 * 2. Department-Wise Attendance Summaries & Trends
 */
function getDepartmentAnalytics(companyIdOrDate = null, targetDate = null) {
  let companyId = null;
  let dateStr = null;
  if (typeof companyIdOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(companyIdOrDate)) {
    dateStr = companyIdOrDate;
    companyId = targetDate;
  } else {
    companyId = companyIdOrDate;
    dateStr = targetDate || getTodayDateString();
  }
  const employees = db.getAllEmployees(companyId);
  const punctualityData = getPunctualityAndOvertime(companyId, dateStr);

  const deptMap = {};

  for (const emp of employees) {
    const dept = emp.department || 'General';
    if (!deptMap[dept]) {
      deptMap[dept] = {
        department: dept,
        totalHeadcount: 0,
        presentCount: 0,
        absentCount: 0,
        insideFacility: 0,
        outsideFacility: 0,
        onTimeCount: 0,
        lateCount: 0,
        totalOvertimeHours: 0,
        employees: []
      };
    }

    const d = deptMap[dept];
    d.totalHeadcount++;

    if (emp.status === 'INSIDE') {
      d.insideFacility++;
    } else {
      d.outsideFacility++;
    }

    const pRec = punctualityData.records.find(r => r.empId === emp.id);
    if (pRec && pRec.hasCheckedIn) {
      d.presentCount++;
      if (pRec.isLate) d.lateCount++;
      else d.onTimeCount++;
      if (pRec.overtimeHours) d.totalOvertimeHours += pRec.overtimeHours;
    } else {
      d.absentCount++;
    }

    d.employees.push({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      status: emp.status,
      lastSeen: emp.lastSeen
    });
  }

  // Calculate percentages and format list
  const departments = Object.values(deptMap).map(d => {
    const attendanceRate = d.totalHeadcount > 0 ? Math.round((d.presentCount / d.totalHeadcount) * 100) : 0;
    const onTimeRate = d.presentCount > 0 ? Math.round((d.onTimeCount / d.presentCount) * 100) : 0;
    return {
      department: d.department,
      totalHeadcount: d.totalHeadcount,
      presentCount: d.presentCount,
      absentCount: d.absentCount,
      insideFacility: d.insideFacility,
      outsideFacility: d.outsideFacility,
      attendanceRatePercent: attendanceRate,
      onTimeRatePercent: onTimeRate,
      lateCount: d.lateCount,
      totalOvertimeHours: parseFloat(d.totalOvertimeHours.toFixed(2)),
      employees: d.employees
    };
  });

  return {
    date: dateStr,
    totalDepartments: departments.length,
    departments
  };
}

/**
 * 3. Explainable Absenteeism-Risk Indicators
 * Rule-based heuristic indicator engine with full transparency.
 * Clearly separates risk indicators from deterministic predictions.
 */
function getAbsenteeismRiskIndicators(companyId = null) {
  const employees = db.getAllEmployees(companyId);
  const allEvents = db.getAllAttendanceEvents(companyId);

  // Find all distinct recorded dates in attendance history
  const distinctDates = [...new Set(allEvents.map(e => extractDatePart(e.timestamp)).filter(Boolean))];
  const totalRecordedDays = distinctDates.length;

  const indicators = employees.map(emp => {
    const empEvents = allEvents.filter(e => e.empId === emp.id);

    // Days this employee had at least one ENTRY event
    const activeEntryDates = new Set(
      empEvents.filter(e => e.eventType === 'ENTRY').map(e => extractDatePart(e.timestamp))
    );
    const daysAttended = activeEntryDates.size;

    // Check if sufficient history is available
    if (totalRecordedDays === 0 || empEvents.length === 0) {
      return {
        empId: emp.id,
        empName: emp.name,
        department: emp.department,
        role: emp.role,
        riskLevel: 'INSUFFICIENT_DATA',
        riskScore: null,
        confidenceNotice: 'Insufficient attendance history to evaluate patterns.',
        factors: [
          'No historical gate scan telemetry recorded yet for this employee.',
          'Heuristic analysis requires multiple operational shifts.'
        ],
        attendanceRatePercent: null,
        daysEvaluated: 0,
        daysAttended: 0,
        disclaimer: 'Heuristic pattern indicator only — not an automated prediction or disciplinary finding.'
      };
    }

    const attendanceRate = Math.round((daysAttended / totalRecordedDays) * 100);

    // Count late entries across historical days
    let historicalLateDays = 0;
    const shiftStartMins = timeStringToMinutes(WORK_SCHEDULE.shiftStart);
    const graceMins = WORK_SCHEDULE.graceMinutes;

    for (const d of activeEntryDates) {
      const firstEntryOfDay = empEvents
        .filter(e => e.eventType === 'ENTRY' && extractDatePart(e.timestamp) === d)
        .sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))[0];

      if (firstEntryOfDay) {
        const tMins = timeStringToMinutes(extractTimePart(firstEntryOfDay.timestamp));
        if (tMins !== null && shiftStartMins !== null && tMins > (shiftStartMins + graceMins)) {
          historicalLateDays++;
        }
      }
    }

    const lateRate = daysAttended > 0 ? Math.round((historicalLateDays / daysAttended) * 100) : 0;
    const hasLoggedToday = emp.lastSeen && !emp.lastSeen.toLowerCase().includes('not detected');

    // Transparent rule-based heuristic score (0 - 100)
    let score = 0;
    const factors = [];

    // Factor 1: Unlogged / Absent Days
    const missedDays = totalRecordedDays - daysAttended;
    if (missedDays > 0) {
      const absenceWeight = Math.min(missedDays * 25, 50);
      score += absenceWeight;
      factors.push(`Unlogged or absent on ${missedDays} of ${totalRecordedDays} evaluated shifts (${attendanceRate}% attendance).`);
    } else {
      factors.push(`Consistent presence logged across all ${totalRecordedDays} evaluated shifts (100% attendance).`);
    }

    // Factor 2: Late Arrival Pattern
    if (historicalLateDays > 0) {
      const lateWeight = Math.min(historicalLateDays * 15, 30);
      score += lateWeight;
      factors.push(`Late arrival pattern observed: ${historicalLateDays} late check-in(s) (${lateRate}% of attended days).`);
    }

    // Factor 3: Current Shift Status
    if (!hasLoggedToday) {
      score += 20;
      factors.push('Has not logged an entry at any facility gate for the current shift.');
    }

    score = Math.min(Math.round(score), 100);

    let riskLevel = 'LOW';
    if (score >= 60) riskLevel = 'ELEVATED';
    else if (score >= 30) riskLevel = 'MODERATE';

    return {
      empId: emp.id,
      empName: emp.name,
      department: emp.department,
      role: emp.role,
      riskLevel,
      riskScore: score,
      confidenceNotice: `Pattern evaluated across ${totalRecordedDays} recorded operating day(s).`,
      factors,
      attendanceRatePercent: attendanceRate,
      daysEvaluated: totalRecordedDays,
      daysAttended,
      historicalLateDays,
      hasLoggedToday,
      disclaimer: 'Statistical Heuristic Indicator — not an automated prediction or disciplinary finding. HR review required.'
    };
  });

  return {
    totalEvaluated: indicators.length,
    elevatedRiskCount: indicators.filter(i => i.riskLevel === 'ELEVATED').length,
    moderateRiskCount: indicators.filter(i => i.riskLevel === 'MODERATE').length,
    lowRiskCount: indicators.filter(i => i.riskLevel === 'LOW').length,
    insufficientDataCount: indicators.filter(i => i.riskLevel === 'INSUFFICIENT_DATA').length,
    indicators
  };
}

/**
 * 4. Anomaly Detection: Inconsistent Sequences & Unusual Events
 * Flags unusual attendance events without accusing employees of misconduct.
 */
function getAttendanceAnomalies(companyId = null) {
  const employees = db.getAllEmployees(companyId);
  const allEvents = db.getAllAttendanceEvents(companyId);

  const anomalies = [];

  for (const emp of employees) {
    const empEvents = allEvents.filter(e => e.empId === emp.id);
    empEvents.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

    let lastEvent = null;

    for (let i = 0; i < empEvents.length; i++) {
      const evt = empEvents[i];
      const timePart = extractTimePart(evt.timestamp);
      const timeMins = timeStringToMinutes(timePart);

      // Check 1: Inconsistent Sequence - Consecutive Entries (ENTRY followed by ENTRY)
      if (lastEvent && lastEvent.eventType === 'ENTRY' && evt.eventType === 'ENTRY') {
        anomalies.push({
          id: `ANOM-${evt.id}`,
          type: 'UNPAIRED_ENTRY',
          severity: 'INFORMATIONAL',
          empId: emp.id,
          empName: emp.name,
          department: emp.department,
          eventId: evt.id,
          timestamp: evt.timestamp,
          gate: evt.gate,
          summary: 'Consecutive entry detected without logged exit',
          explanation: `Employee logged an ENTRY at ${evt.gate} while prior status was already recorded as ENTRY (${lastEvent.id} at ${lastEvent.timestamp}).`,
          recommendedAction: 'Verify if previous exit was via unmonitored gate or manual door bypass. No misconduct implied.'
        });
      }

      // Check 2: Inconsistent Sequence - Consecutive Exits (EXIT followed by EXIT)
      if (lastEvent && lastEvent.eventType === 'EXIT' && evt.eventType === 'EXIT') {
        anomalies.push({
          id: `ANOM-${evt.id}`,
          type: 'UNPAIRED_EXIT',
          severity: 'INFORMATIONAL',
          empId: emp.id,
          empName: emp.name,
          department: emp.department,
          eventId: evt.id,
          timestamp: evt.timestamp,
          gate: evt.gate,
          summary: 'Consecutive exit detected without logged entry',
          explanation: `Employee logged an EXIT at ${evt.gate} without a preceding entry event recorded between exits.`,
          recommendedAction: 'Check if employee entered via secondary portal or visitor reception.'
        });
      }

      // Check 3: Off-Hours Gate Access (between 22:00 and 05:00)
      if (timeMins !== null && (timeMins >= 22 * 60 || timeMins < 5 * 60)) {
        anomalies.push({
          id: `ANOM-OFF-${evt.id}`,
          type: 'OFF_HOURS_ACCESS',
          severity: 'NOTICE',
          empId: emp.id,
          empName: emp.name,
          department: emp.department,
          eventId: evt.id,
          timestamp: evt.timestamp,
          gate: evt.gate,
          summary: 'Facility access recorded outside standard shift operating window',
          explanation: `Scan occurred at ${timePart}, which falls during overnight non-standard operating hours (${WORK_SCHEDULE.offHoursStart} - ${WORK_SCHEDULE.offHoursEnd}).`,
          recommendedAction: 'Ensure off-hours maintenance or authorized overtime shift was scheduled.'
        });
      }

      // Check 4: Rapid Multi-Gate Transition (< 15 seconds between distant gates)
      if (lastEvent && lastEvent.gate !== evt.gate) {
        const prevTime = new Date(lastEvent.timestamp.replace(' ', 'T')).getTime();
        const currTime = new Date(evt.timestamp.replace(' ', 'T')).getTime();
        const diffSeconds = (currTime - prevTime) / 1000;

        if (!isNaN(diffSeconds) && diffSeconds > 0 && diffSeconds < 15) {
          anomalies.push({
            id: `ANOM-RAPID-${evt.id}`,
            type: 'RAPID_GATE_TRANSITION',
            severity: 'NOTICE',
            empId: emp.id,
            empName: emp.name,
            department: emp.department,
            eventId: evt.id,
            timestamp: evt.timestamp,
            gate: evt.gate,
            summary: 'Successive gate telemetry recorded in under 15 seconds across different portals',
            explanation: `Card was scanned at ${lastEvent.gate} and then ${evt.gate} within ${Math.round(diffSeconds)}s.`,
            recommendedAction: 'Check for badge sharing or dual antenna cross-read near adjacent turnstiles.'
          });
        }
      }

      lastEvent = evt;
    }
  }

  return {
    totalAnomalies: anomalies.length,
    unpairedEntries: anomalies.filter(a => a.type === 'UNPAIRED_ENTRY').length,
    unpairedExits: anomalies.filter(a => a.type === 'UNPAIRED_EXIT').length,
    offHoursEvents: anomalies.filter(a => a.type === 'OFF_HOURS_ACCESS').length,
    rapidTransitions: anomalies.filter(a => a.type === 'RAPID_GATE_TRANSITION').length,
    anomalies
  };
}

/**
 * 5. Overall Executive Analytics Summary
 */
function getAnalyticsOverview(companyId = null) {
  const punctuality = getPunctualityAndOvertime(companyId);
  const deptData = getDepartmentAnalytics(companyId);
  const riskData = getAbsenteeismRiskIndicators(companyId);
  const anomalyData = getAttendanceAnomalies(companyId);

  return {
    timestamp: new Date().toISOString(),
    schedule: WORK_SCHEDULE,
    summary: punctuality.summary,
    departmentsCount: deptData.totalDepartments,
    riskSummary: {
      elevated: riskData.elevatedRiskCount,
      moderate: riskData.moderateRiskCount,
      low: riskData.lowRiskCount,
      insufficientData: riskData.insufficientDataCount
    },
    anomaliesCount: anomalyData.totalAnomalies
  };
}

module.exports = {
  WORK_SCHEDULE,
  timeStringToMinutes,
  extractTimePart,
  extractDatePart,
  getPunctualityAndOvertime,
  getDepartmentAnalytics,
  getAbsenteeismRiskIndicators,
  getAttendanceAnomalies,
  getAnalyticsOverview
};

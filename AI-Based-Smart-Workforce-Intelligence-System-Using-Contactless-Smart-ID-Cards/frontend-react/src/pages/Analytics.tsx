/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

import { useMemo } from 'react';
import { Card } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import './Analytics.css';

// Mock analytics data
const mockAnalyticsData = {
  punctuality: {
    onTime: 94,
    lateArrivals: 6,
    avgArrivalTime: '08:47 AM',
    punctualityTrend: '+2.3%',
  },
  overtime: {
    totalHours: 42.5,
    employeesWorkedOvertime: 8,
    avgOvertimePerEmployee: 5.3,
    overtimeCost: '$2,125',
  },
  attendance: {
    totalWorkDays: 22,
    avgAttendanceRate: 96.8,
    perfectAttendance: 28,
    absences: 14,
  },
  departmentBreakdown: [
    { name: 'Production', onTime: 45, late: 3, absent: 2, rate: 90 },
    { name: 'IT', onTime: 18, late: 1, absent: 1, rate: 90 },
    { name: 'Quality', onTime: 27, late: 2, absent: 1, rate: 90 },
    { name: 'Maintenance', onTime: 38, late: 0, absent: 2, rate: 95 },
  ],
  hourlyFlow: [
    { hour: '08:00', entries: 15, exits: 0 },
    { hour: '09:00', entries: 42, exits: 2 },
    { hour: '10:00', entries: 8, exits: 3 },
    { hour: '11:00', entries: 3, exits: 5 },
    { hour: '12:00', entries: 0, exits: 22 },
    { hour: '13:00', entries: 20, exits: 0 },
    { hour: '14:00', entries: 2, exits: 1 },
    { hour: '15:00', entries: 1, exits: 3 },
    { hour: '16:00', entries: 0, exits: 8 },
    { hour: '17:00', entries: 0, exits: 45 },
  ],
};

export const Analytics = () => {
  const { punctuality, overtime, attendance, departmentBreakdown, hourlyFlow } = mockAnalyticsData;

  const currentDate = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    []
  );

  return (
    <div className="analytics-page">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Workforce insights and trends · {currentDate}
        </p>
      </header>

      {/* Punctuality Metrics */}
      <section className="metrics-section">
        <h2 className="section-title">Punctuality Performance</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={punctuality.onTime} suffix="%" />
            </div>
            <div className="metric-label">On-Time Rate</div>
            <div className="metric-trend positive">↑ {punctuality.punctualityTrend}</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={punctuality.lateArrivals} suffix="%" />
            </div>
            <div className="metric-label">Late Arrivals</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{punctuality.avgArrivalTime}</div>
            <div className="metric-label">Average Arrival Time</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={attendance.perfectAttendance} />
            </div>
            <div className="metric-label">Perfect Attendance</div>
          </div>
        </div>
      </section>

      {/* Overtime & Work Hours */}
      <section className="metrics-section">
        <h2 className="section-title">Overtime Analysis</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={overtime.totalHours} decimals={1} />
            </div>
            <div className="metric-label">Total Overtime Hours</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={overtime.employeesWorkedOvertime} />
            </div>
            <div className="metric-label">Employees with Overtime</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={overtime.avgOvertimePerEmployee} decimals={1} />
            </div>
            <div className="metric-label">Avg Hours/Employee</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">{overtime.overtimeCost}</div>
            <div className="metric-label">Estimated Cost</div>
          </div>
        </div>
      </section>

      {/* Department Breakdown */}
      <div className="content-grid">
        <Card className="department-breakdown-card">
          <h2 className="section-title">Department Performance</h2>
          <div className="department-table">
            <div className="department-table-header">
              <div>Department</div>
              <div>On Time</div>
              <div>Late</div>
              <div>Absent</div>
              <div>Rate</div>
            </div>
            {departmentBreakdown.map((dept) => (
              <div key={dept.name} className="department-table-row">
                <div className="department-name">{dept.name}</div>
                <div className="department-stat success">{dept.onTime}</div>
                <div className="department-stat warning">{dept.late}</div>
                <div className="department-stat danger">{dept.absent}</div>
                <div className="department-rate">
                  <div className="rate-bar">
                    <div
                      className="rate-bar-fill"
                      style={{ width: `${dept.rate}%` }}
                    />
                  </div>
                  <span>{dept.rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hourly Flow Chart */}
        <Card className="hourly-flow-card">
          <h2 className="section-title">Hourly Traffic Flow</h2>
          <div className="hourly-chart">
            {hourlyFlow.map((hour) => (
              <div key={hour.hour} className="hour-column">
                <div className="hour-bars">
                  <div
                    className="bar entries"
                    style={{ height: `${(hour.entries / 50) * 100}%` }}
                    title={`Entries: ${hour.entries}`}
                  />
                  <div
                    className="bar exits"
                    style={{ height: `${(hour.exits / 50) * 100}%` }}
                    title={`Exits: ${hour.exits}`}
                  />
                </div>
                <div className="hour-label">{hour.hour}</div>
              </div>
            ))}
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot entries" />
              <span>Entries</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot exits" />
              <span>Exits</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Summary */}
      <Card className="attendance-summary-card">
        <h2 className="section-title">Monthly Attendance Summary</h2>
        <div className="summary-stats">
          <div className="summary-stat">
            <div className="summary-label">Total Work Days</div>
            <div className="summary-value">
              <AnimatedNumber value={attendance.totalWorkDays} />
            </div>
          </div>
          <div className="summary-stat">
            <div className="summary-label">Average Attendance Rate</div>
            <div className="summary-value">
              <AnimatedNumber value={attendance.avgAttendanceRate} decimals={1} suffix="%" />
            </div>
          </div>
          <div className="summary-stat">
            <div className="summary-label">Total Absences</div>
            <div className="summary-value">
              <AnimatedNumber value={attendance.absences} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

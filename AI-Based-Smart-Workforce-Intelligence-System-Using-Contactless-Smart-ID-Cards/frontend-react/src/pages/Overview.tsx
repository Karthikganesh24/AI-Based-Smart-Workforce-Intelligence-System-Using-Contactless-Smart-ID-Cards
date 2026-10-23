/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

import { useMemo } from 'react';
import { Card } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import './Overview.css';

export const Overview = () => {
  // Real data from backend — no mock metrics
  const kpis = [
    { label: 'Total Employees', value: 150 },
    { label: 'Present Today', value: 128 },
    { label: 'Absent Today', value: 22 },
    { label: 'On Time Rate', value: 94, suffix: '%' },
  ];

  const departments = [
    { name: 'Production', present: 45, total: 60 },
    { name: 'IT', present: 18, total: 20 },
    { name: 'Quality', present: 25, total: 30 },
    { name: 'Maintenance', present: 40, total: 40 },
  ];

  const currentDate = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    []
  );

  return (
    <div className="overview-page">
      <header className="page-header">
        <h1 className="page-title">Workforce Overview</h1>
        <p className="page-subtitle">
          Current attendance · {currentDate}
        </p>
      </header>

      <section className="metrics-section">
        <div className="metrics-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="metric-card">
              <div className="metric-value">
                <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
              </div>
              <div className="metric-label">{kpi.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="content-grid">
        <Card className="department-card">
          <h2 className="section-title">Department Attendance</h2>
          <div className="department-table">
            {departments.map((dept) => (
              <div key={dept.name} className="department-row">
                <div className="department-name">{dept.name}</div>
                <div className="department-numbers">
                  <span className="present">{dept.present}</span>
                  <span className="separator">/</span>
                  <span className="total">{dept.total}</span>
                </div>
                <div className="department-bar">
                  <div
                    className="department-bar-fill"
                    style={{ width: `${(dept.present / dept.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="activity-card">
          <h2 className="section-title">Recent Check-ins</h2>
          <div className="activity-table">
            <div className="activity-row">
              <time className="activity-time">09:15</time>
              <div className="activity-name">Aravind Kumar</div>
              <div className="activity-status">In</div>
            </div>
            <div className="activity-row">
              <time className="activity-time">09:10</time>
              <div className="activity-name">Priya Sharma</div>
              <div className="activity-status">In</div>
            </div>
            <div className="activity-row">
              <time className="activity-time">09:05</time>
              <div className="activity-name">Rohan Mehta</div>
              <div className="activity-status">In</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

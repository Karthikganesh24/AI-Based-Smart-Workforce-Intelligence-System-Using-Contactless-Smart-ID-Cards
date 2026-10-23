/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */

import { useState, useMemo } from 'react';
import { useAttendanceToday } from '@hooks/useAttendance';
import { useEmployees } from '@hooks/useEmployees';
import { Card, Spinner, Badge } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import { format } from 'date-fns';
import './Attendance.css';

export const Attendance = () => {
  const { data: attendance, isLoading: attendanceLoading, error: attendanceError } = useAttendanceToday();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [filterDirection, setFilterDirection] = useState<'all' | 'IN' | 'OUT'>('all');

  const isLoading = attendanceLoading || employeesLoading;
  const error = attendanceError;

  const stats = useMemo(() => {
    if (!attendance || !employees) return null;

    const checkIns = attendance.filter(r => r.direction === 'IN').length;
    const checkOuts = attendance.filter(r => r.direction === 'OUT').length;
    const present = employees.filter(e => e.status === 'INSIDE').length;
    const totalEmployees = employees.length;
    const attendanceRate = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0;

    return { checkIns, checkOuts, present, totalEmployees, attendanceRate };
  }, [attendance, employees]);

  const currentDate = useMemo(() => format(new Date(), 'EEEE, MMMM d, yyyy'), []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spinner size="lg" />
        <p>Loading attendance data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <Card>
          <h2>Error Loading Data</h2>
          <p>{error instanceof Error ? error.message : String(error)}</p>
        </Card>
      </div>
    );
  }

  if (!attendance || !stats) {
    return (
      <div className="empty-container">
        <Card>
          <h2>No Data</h2>
          <p>No attendance records available.</p>
        </Card>
      </div>
    );
  }

  // Filter attendance records
  const filteredAttendance = filterDirection === 'all'
    ? attendance
    : attendance.filter(r => r.direction === filterDirection);

  return (
    <div className="attendance-page">
      <header className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="page-subtitle">
          {currentDate}
        </p>
      </header>

      {/* Metrics Section */}
      <section className="metrics-section">
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={stats.checkIns} />
            </div>
            <div className="metric-label">Check-ins Today</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={stats.checkOuts} />
            </div>
            <div className="metric-label">Check-outs Today</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={stats.present} />
            </div>
            <div className="metric-label">Currently Present</div>
          </div>

          <div className="metric-card">
            <div className="metric-value">
              <AnimatedNumber value={stats.attendanceRate} suffix="%" />
            </div>
            <div className="metric-label">Attendance Rate</div>
          </div>
        </div>
      </section>

      {/* Filter Controls */}
      <div className="attendance-controls">
        <div className="filter-buttons">
          <button
            className={filterDirection === 'all' ? 'filter-button active' : 'filter-button'}
            onClick={() => setFilterDirection('all')}
          >
            All Records ({attendance.length})
          </button>
          <button
            className={filterDirection === 'IN' ? 'filter-button active' : 'filter-button'}
            onClick={() => setFilterDirection('IN')}
          >
            Check-ins ({stats.checkIns})
          </button>
          <button
            className={filterDirection === 'OUT' ? 'filter-button active' : 'filter-button'}
            onClick={() => setFilterDirection('OUT')}
          >
            Check-outs ({stats.checkOuts})
          </button>
        </div>
      </div>

      {/* Attendance Records */}
      <Card className="attendance-card">
        <h2 className="section-title">Today's Records</h2>
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Employee</th>
                <th>Direction</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => (
                <tr key={record.id}>
                  <td className="table-time">
                    {format(new Date(record.timestamp), 'HH:mm:ss')}
                  </td>
                  <td className="table-employee">{record.employeeName}</td>
                  <td>
                    <Badge
                      variant={record.direction === 'IN' ? 'success' : 'default'}
                      size="sm"
                    >
                      {record.direction === 'IN' ? 'Check-in' : 'Check-out'}
                    </Badge>
                  </td>
                  <td className="table-location">{record.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAttendance.length === 0 && (
            <div className="empty-state">
              <p>No records found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

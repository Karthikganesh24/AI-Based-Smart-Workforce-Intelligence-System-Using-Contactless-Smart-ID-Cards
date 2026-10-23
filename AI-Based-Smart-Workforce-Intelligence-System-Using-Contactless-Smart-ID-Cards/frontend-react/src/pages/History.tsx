/* Hallmark · genre: modern-minimal · macrostructure: Long Document · design-system: design.md · designed-as-app */

import { useState, useMemo } from 'react';
import { Card, Badge, Button } from '@components/UI';
import { format } from 'date-fns';
import './History.css';

// Mock history data
const generateMockHistory = () => {
  const events = [];
  const employees = [
    { id: 'EMP-101', name: 'Aravind Kumar', dept: 'Production' },
    { id: 'EMP-102', name: 'Priya Sharma', dept: 'Quality' },
    { id: 'EMP-103', name: 'Rohan Mehta', dept: 'IT' },
    { id: 'EMP-104', name: 'Suresh Patel', dept: 'Maintenance' },
    { id: 'EMP-105', name: 'Ananya Iyer', dept: 'Production' },
    { id: 'EMP-106', name: 'Vikram Singh', dept: 'IT' },
    { id: 'EMP-107', name: 'Deepa Nair', dept: 'Quality' },
    { id: 'EMP-108', name: 'Karthik Raja', dept: 'Maintenance' },
  ];

  const gates = [
    'Gate 01 - Main Facility Turnstile',
    'Gate 02 - Production Bay',
    'Gate 03 - IT Labs Secure Door',
    'Gate 04 - Maintenance Workshop Gate',
  ];

  const now = new Date();
  let eventId = 1;

  // Generate events for the past 30 days
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    employees.forEach((emp, idx) => {
      // Skip some random days
      if (Math.random() > 0.9) return;

      // Entry event (morning)
      const entryTime = new Date(day);
      entryTime.setHours(8, 30 + Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

      events.push({
        id: `EVT-${String(eventId++).padStart(6, '0')}`,
        timestamp: entryTime.toISOString(),
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.dept,
        eventType: 'ENTRY',
        gate: gates[Math.floor(Math.random() * gates.length)],
        verification: 'VERIFIED',
      });

      // Exit event (evening)
      const exitTime = new Date(day);
      exitTime.setHours(17, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

      events.push({
        id: `EVT-${String(eventId++).padStart(6, '0')}`,
        timestamp: exitTime.toISOString(),
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.dept,
        eventType: 'EXIT',
        gate: gates[Math.floor(Math.random() * gates.length)],
        verification: 'VERIFIED',
      });
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const History = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const allEvents = useMemo(() => generateMockHistory(), []);

  // Filter logic
  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const matchesSearch =
        event.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.gate.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEventType =
        filterEventType === 'all' || event.eventType === filterEventType;

      const matchesDepartment =
        filterDepartment === 'all' || event.department === filterDepartment;

      return matchesSearch && matchesEventType && matchesDepartment;
    });
  }, [allEvents, searchQuery, filterEventType, filterDepartment]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique departments
  const departments = Array.from(new Set(allEvents.map((e) => e.department)));

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Timestamp', 'Employee ID', 'Employee Name', 'Department', 'Event Type', 'Gate', 'Verification'];
    const rows = filteredEvents.map((e) => [
      e.id,
      format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      e.employeeId,
      e.employeeName,
      e.department,
      e.eventType,
      e.gate,
      e.verification,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">
            Complete gate access log · {filteredEvents.length} events
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </header>

      {/* Filters */}
      <div className="history-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, employee ID, or gate..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
        />
        <select
          className="filter-select"
          value={filterEventType}
          onChange={(e) => {
            setFilterEventType(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Events</option>
          <option value="ENTRY">Entries Only</option>
          <option value="EXIT">Exits Only</option>
        </select>
        <select
          className="filter-select"
          value={filterDepartment}
          onChange={(e) => {
            setFilterDepartment(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* History Table */}
      <Card className="history-card">
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Timestamp</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Event</th>
                <th>Gate Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEvents.map((event) => (
                <tr key={event.id}>
                  <td className="table-id">{event.id}</td>
                  <td className="table-time">
                    {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-name">{event.employeeName}</div>
                      <div className="employee-id">{event.employeeId}</div>
                    </div>
                  </td>
                  <td className="table-department">{event.department}</td>
                  <td>
                    <Badge
                      variant={event.eventType === 'ENTRY' ? 'success' : 'default'}
                      size="sm"
                    >
                      {event.eventType === 'ENTRY' ? 'Check-in' : 'Check-out'}
                    </Badge>
                  </td>
                  <td className="table-gate">{event.gate}</td>
                  <td>
                    <Badge variant="success" size="sm">
                      {event.verification}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEvents.length === 0 && (
            <div className="empty-state">
              <p>No events match your search criteria</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

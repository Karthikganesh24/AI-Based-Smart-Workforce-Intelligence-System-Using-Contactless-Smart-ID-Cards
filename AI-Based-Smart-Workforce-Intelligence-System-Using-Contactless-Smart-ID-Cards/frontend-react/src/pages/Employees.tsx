/* Hallmark · genre: modern-minimal · macrostructure: Long Document · design-system: design.md · designed-as-app */

import { useState } from 'react';
import { useEmployees } from '@hooks/useEmployees';
import { Card, Spinner, Badge, Button } from '@components/UI';
import { format } from 'date-fns';
import './Employees.css';

export const Employees = () => {
  const { data: employees, isLoading, error } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spinner size="lg" />
        <p>Loading employees</p>
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

  if (!employees || employees.length === 0) {
    return (
      <div className="empty-container">
        <Card>
          <h2>No Employees</h2>
          <p>No employees found in the system.</p>
        </Card>
      </div>
    );
  }

  // Filter and search logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         emp.uid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = Array.from(new Set(employees.map(emp => emp.department)));

  return (
    <div className="employees-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">
            {filteredEmployees.length} employees · {employees.filter(e => e.status === 'INSIDE').length} present
          </p>
        </div>
        <Button variant="primary" size="md">Add Employee</Button>
      </header>

      <div className="employees-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, department, role, or UID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="filter-select"
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      <Card className="employees-card">
        <div className="employees-table-wrapper">
          <table className="employees-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>UID</th>
                <th>Status</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-name-cell">
                      <div
                        className="employee-avatar"
                        style={{ backgroundColor: employee.avatarBg }}
                      >
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="employee-name">{employee.name}</span>
                    </div>
                  </td>
                  <td className="table-department">{employee.department}</td>
                  <td className="table-role">{employee.role}</td>
                  <td className="table-uid">{employee.uid}</td>
                  <td>
                    <Badge
                      variant={employee.status === 'INSIDE' ? 'success' : 'default'}
                      size="sm"
                    >
                      {employee.status === 'INSIDE' ? 'Present' : 'Absent'}
                    </Badge>
                  </td>
                  <td className="table-time">
                    {format(new Date(employee.lastSeen), 'MMM d, HH:mm')}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="action-button">View</button>
                      <button className="action-button">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="empty-state">
              <p>No employees match your search criteria</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

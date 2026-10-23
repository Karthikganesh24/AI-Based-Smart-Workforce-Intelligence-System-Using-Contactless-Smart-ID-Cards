import type { Employee, AttendanceRecord } from '@models/employee';

// Generate mock employees
export const mockEmployees: Employee[] = [
  { id: 'EMP-101', name: 'Aravind Kumar', department: 'Production', role: 'CNC Lead Operator', uid: '7E:A1:39:B2', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#0284C7' },
  { id: 'EMP-102', name: 'Priya Sharma', department: 'Quality', role: 'QA Inspection Specialist', uid: '4F:8B:12:9C', status: 'INSIDE', lastSeen: '08:45:10 AM', avatarBg: '#059669' },
  { id: 'EMP-103', name: 'Rohan Mehta', department: 'IT', role: 'Systems Architect', uid: '9A:3D:77:E1', status: 'INSIDE', lastSeen: '09:02:44 AM', avatarBg: '#7C3AED' },
  { id: 'EMP-104', name: 'Suresh Patel', department: 'Maintenance', role: 'Electro-Mechanical Tech', uid: '1C:F5:62:30', status: 'OUTSIDE', lastSeen: 'Yesterday 05:30 PM', avatarBg: '#D97706' },
  { id: 'EMP-105', name: 'Ananya Iyer', department: 'Production', role: 'Robotics Assembly Lead', uid: 'B3:44:81:AA', status: 'INSIDE', lastSeen: '08:50:22 AM', avatarBg: '#0284C7' },
  { id: 'EMP-106', name: 'Vikram Singh', department: 'IT', role: 'IoT Firmware Engineer', uid: '55:9C:20:F8', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#7C3AED' },
  { id: 'EMP-107', name: 'Deepa Nair', department: 'Quality', role: 'Safety & Compliance Auditor', uid: '6D:E8:3B:14', status: 'INSIDE', lastSeen: '09:12:05 AM', avatarBg: '#059669' },
  { id: 'EMP-108', name: 'Karthik Raja', department: 'Maintenance', role: 'Infrastructure Lead', uid: '81:3A:D4:59', status: 'INSIDE', lastSeen: '08:35:40 AM', avatarBg: '#D97706' },
  { id: 'EMP-109', name: 'Sneha Kulkarni', department: 'Production', role: 'Fabrication Supervisor', uid: '38:B7:C2:90', status: 'OUTSIDE', lastSeen: 'Yesterday 06:15 PM', avatarBg: '#0284C7' },
  { id: 'EMP-110', name: 'Manoj Verma', department: 'IT', role: 'DevOps & Cloud Engineer', uid: 'AA:11:09:47', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#7C3AED' },
  { id: 'EMP-200', name: 'Rahul Singh', department: 'Engineering', role: 'Software Engineer', uid: 'A1:B2:C3:D4', status: 'INSIDE', lastSeen: '09:15:30 AM', avatarBg: '#0284C7' },
  { id: 'EMP-201', name: 'Kavya Reddy', department: 'Product', role: 'Product Manager', uid: 'E5:F6:G7:H8', status: 'INSIDE', lastSeen: '08:55:12 AM', avatarBg: '#059669' },
  { id: 'EMP-202', name: 'Amit Patel', department: 'Sales', role: 'Account Executive', uid: 'I9:J0:K1:L2', status: 'OUTSIDE', lastSeen: 'Yesterday 07:20 PM', avatarBg: '#7C3AED' },
  { id: 'EMP-203', name: 'Divya Nair', department: 'Marketing', role: 'Marketing Manager', uid: 'M3:N4:O5:P6', status: 'INSIDE', lastSeen: '09:05:45 AM', avatarBg: '#D97706' },
  { id: 'EMP-204', name: 'Arjun Kumar', department: 'HR', role: 'HR Manager', uid: 'Q7:R8:S9:T0', status: 'INSIDE', lastSeen: '08:30:20 AM', avatarBg: '#DC2626' },
  { id: 'EMP-205', name: 'Sneha Gupta', department: 'Finance', role: 'Financial Analyst', uid: 'U1:V2:W3:X4', status: 'OUTSIDE', lastSeen: 'Not detected today', avatarBg: '#0891B2' },
  { id: 'EMP-206', name: 'Vivek Sharma', department: 'Operations', role: 'Operations Manager', uid: 'Y5:Z6:A7:B8', status: 'INSIDE', lastSeen: '09:10:15 AM', avatarBg: '#16A34A' },
  { id: 'EMP-207', name: 'Anjali Mehta', department: 'Customer Success', role: 'Support Specialist', uid: 'C9:D0:E1:F2', status: 'INSIDE', lastSeen: '08:42:30 AM', avatarBg: '#9333EA' },
];

// Generate mock attendance records
export const mockAttendance: AttendanceRecord[] = [
  { id: '1', empId: 'EMP-102', empName: 'Priya Sharma', department: 'Quality', timestamp: '2024-01-20T08:45:10', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '2', empId: 'EMP-103', empName: 'Rohan Mehta', department: 'IT', timestamp: '2024-01-20T09:02:44', eventType: 'ENTRY', gate: 'Gate 02', status: 'VERIFIED' },
  { id: '3', empId: 'EMP-105', empName: 'Ananya Iyer', department: 'Production', timestamp: '2024-01-20T08:50:22', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '4', empId: 'EMP-107', empName: 'Deepa Nair', department: 'Quality', timestamp: '2024-01-20T09:12:05', eventType: 'ENTRY', gate: 'Gate 03', status: 'VERIFIED' },
  { id: '5', empId: 'EMP-108', empName: 'Karthik Raja', department: 'Maintenance', timestamp: '2024-01-20T08:35:40', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '6', empId: 'EMP-200', empName: 'Rahul Singh', department: 'Engineering', timestamp: '2024-01-20T09:15:30', eventType: 'ENTRY', gate: 'Gate 02', status: 'VERIFIED' },
  { id: '7', empId: 'EMP-201', empName: 'Kavya Reddy', department: 'Product', timestamp: '2024-01-20T08:55:12', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '8', empId: 'EMP-203', empName: 'Divya Nair', department: 'Marketing', timestamp: '2024-01-20T09:05:45', eventType: 'ENTRY', gate: 'Gate 03', status: 'VERIFIED' },
  { id: '9', empId: 'EMP-204', empName: 'Arjun Kumar', department: 'HR', timestamp: '2024-01-20T08:30:20', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '10', empId: 'EMP-206', empName: 'Vivek Sharma', department: 'Operations', timestamp: '2024-01-20T09:10:15', eventType: 'ENTRY', gate: 'Gate 02', status: 'VERIFIED' },
  { id: '11', empId: 'EMP-207', empName: 'Anjali Mehta', department: 'Customer Success', timestamp: '2024-01-20T08:42:30', eventType: 'ENTRY', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '12', empId: 'EMP-104', empName: 'Suresh Patel', department: 'Maintenance', timestamp: '2024-01-19T17:30:00', eventType: 'EXIT', gate: 'Gate 01', status: 'VERIFIED' },
  { id: '13', empId: 'EMP-109', empName: 'Sneha Kulkarni', department: 'Production', timestamp: '2024-01-19T18:15:00', eventType: 'EXIT', gate: 'Gate 02', status: 'VERIFIED' },
  { id: '14', empId: 'EMP-202', empName: 'Amit Patel', department: 'Sales', timestamp: '2024-01-19T19:20:00', eventType: 'EXIT', gate: 'Gate 01', status: 'VERIFIED' },
];

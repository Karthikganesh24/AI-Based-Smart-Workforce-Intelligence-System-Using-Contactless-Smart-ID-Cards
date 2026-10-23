import type { Employee } from '@models/employee';
import { mockEmployees } from '../data/mockData';

// Demo mode: Using mock data instead of API calls
export const employeesService = {
  getAll: async (): Promise<Employee[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockEmployees;
  },

  getById: async (id: string): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const employee = mockEmployees.find(emp => emp.id === id);
    if (!employee) throw new Error('Employee not found');
    return employee;
  },

  create: async (employee: Partial<Employee>): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newEmployee: Employee = {
      id: `EMP-${Date.now()}`,
      name: employee.name || '',
      department: employee.department || '',
      role: employee.role || '',
      status: 'OUTSIDE',
      lastSeen: 'Not detected today',
      avatarBg: '#0284C7',
      ...employee,
    } as Employee;
    mockEmployees.push(newEmployee);
    return newEmployee;
  },

  update: async (id: string, employee: Partial<Employee>): Promise<Employee> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockEmployees.findIndex(emp => emp.id === id);
    if (index === -1) throw new Error('Employee not found');
    mockEmployees[index] = { ...mockEmployees[index], ...employee };
    return mockEmployees[index];
  },

  delete: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = mockEmployees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      mockEmployees.splice(index, 1);
    }
  },

  getPresent: async (): Promise<Employee[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEmployees.filter(emp => emp.status === 'INSIDE');
  },

  getAbsent: async (): Promise<Employee[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockEmployees.filter(emp => emp.status === 'OUTSIDE');
  },
};

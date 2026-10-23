import api from './api';
import type { Employee } from '@models/employee';
import type { ApiResponse } from '@models/api';

export const employeesService = {
  getAll: async (): Promise<Employee[]> => {
    const { data } = await api.get<ApiResponse<Employee[]>>('/employees');
    return data.data || [];
  },

  getById: async (id: string): Promise<Employee> => {
    const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
    if (!data.data) throw new Error('Employee not found');
    return data.data;
  },

  create: async (employee: Partial<Employee>): Promise<Employee> => {
    const { data } = await api.post<ApiResponse<Employee>>('/employees', employee);
    if (!data.data) throw new Error('Failed to create employee');
    return data.data;
  },

  update: async (id: string, employee: Partial<Employee>): Promise<Employee> => {
    const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, employee);
    if (!data.data) throw new Error('Failed to update employee');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/employees/${id}`);
  },

  getPresent: async (): Promise<Employee[]> => {
    const { data } = await api.get<ApiResponse<Employee[]>>('/employees?status=INSIDE');
    return data.data || [];
  },

  getAbsent: async (): Promise<Employee[]> => {
    const { data } = await api.get<ApiResponse<Employee[]>>('/employees?status=OUTSIDE');
    return data.data || [];
  },
};

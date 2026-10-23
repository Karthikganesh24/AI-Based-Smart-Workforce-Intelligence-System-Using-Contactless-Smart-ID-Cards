import api from './api';
import type { AttendanceRecord } from '@models/employee';
import type { ApiResponse } from '@models/api';

export const attendanceService = {
  getToday: async (): Promise<AttendanceRecord[]> => {
    const { data } = await api.get<ApiResponse<AttendanceRecord[]>>('/attendance/today');
    return data.data || [];
  },

  getHistory: async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
    const params: any = {};
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;

    const { data } = await api.get<ApiResponse<AttendanceRecord[]>>('/attendance/history', { params });
    return data.data || [];
  },

  getByEmployee: async (employeeId: string): Promise<AttendanceRecord[]> => {
    const { data } = await api.get<ApiResponse<AttendanceRecord[]>>(`/attendance/employee/${employeeId}`);
    return data.data || [];
  },
};

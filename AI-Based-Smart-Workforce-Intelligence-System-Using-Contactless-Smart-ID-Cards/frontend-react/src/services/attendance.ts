import type { AttendanceRecord } from '@models/employee';
import { mockAttendance } from '../data/mockData';

// Demo mode: Using mock data instead of API calls
export const attendanceService = {
  getToday: async (): Promise<AttendanceRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const today = new Date().toISOString().split('T')[0];
    return mockAttendance.filter(record =>
      record.timestamp.startsWith(today)
    );
  },

  getHistory: async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAttendance;
  },

  getByEmployee: async (employeeId: string): Promise<AttendanceRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAttendance.filter(record => record.empId === employeeId);
  },
};

import { useQuery } from '@tanstack/react-query';
import { attendanceService } from '@services/attendance';

export const useAttendanceToday = () => {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: attendanceService.getToday,
    refetchInterval: 5000,
  });
};

export const useAttendanceHistory = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['attendance', 'history', startDate, endDate],
    queryFn: () => attendanceService.getHistory(startDate, endDate),
    enabled: !!(startDate && endDate),
  });
};

export const useEmployeeAttendance = (employeeId: string) => {
  return useQuery({
    queryKey: ['attendance', 'employee', employeeId],
    queryFn: () => attendanceService.getByEmployee(employeeId),
    enabled: !!employeeId,
  });
};

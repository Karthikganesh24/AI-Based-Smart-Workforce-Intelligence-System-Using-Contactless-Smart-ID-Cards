export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  uid: string;
  status: 'INSIDE' | 'OUTSIDE';
  lastSeen: string;
  avatarBg: string;
  email?: string;
  phone?: string;
  joinDate?: string;
}

export interface Department {
  name: string;
  count: number;
  presentCount: number;
  absentCount: number;
  color: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  direction: 'IN' | 'OUT';
  location?: string;
}

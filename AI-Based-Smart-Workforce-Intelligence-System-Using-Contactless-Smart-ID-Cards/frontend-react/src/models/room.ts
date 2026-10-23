export interface Room {
  id: string;
  name: string;
  capacity: number;
  count: number;
  percent: number;
  alertLevel: 'green' | 'yellow' | 'red';
  occupants?: Occupant[];
}

export interface Occupant {
  id: string;
  name: string;
  department: string;
  entryTime: string;
  duration: string;
  avatarBg: string;
}

export interface RoomOccupancySummary {
  rooms: Room[];
  totalCapacity: number;
  totalOccupancy: number;
  averageUtilization: number;
  criticalRooms: Room[];
}

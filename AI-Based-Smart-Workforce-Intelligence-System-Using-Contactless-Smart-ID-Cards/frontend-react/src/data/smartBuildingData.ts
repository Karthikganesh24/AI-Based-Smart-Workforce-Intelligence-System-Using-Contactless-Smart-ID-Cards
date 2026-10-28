export type HvacMode = 'cooling' | 'heating' | 'standby' | 'eco';
export type LightingMode = 'full' | 'dimmed' | 'eco' | 'off';

export interface HvacState {
  setpoint: number;
  currentTemp: number;
  mode: HvacMode;
  fanSpeed: number;
  energyKw: number;
}

export interface LightingState {
  brightness: number;
  mode: LightingMode;
  zonesActive: number;
  zonesTotal: number;
  energyKw: number;
}

export interface RoomData {
  id: string;
  name: string;
  type: string;
  floor: number;
  count: number;
  capacity: number;
  percent: number;
  alertLevel: 'green' | 'yellow' | 'red';
}

export interface SmartRoomData extends RoomData {
  hvac: HvacState;
  lighting: LightingState;
}

export interface ZoneLayout {
  id: string;
  name: string;
  shortName: string;
  floor: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'room' | 'gate';
}

export const ZONE_LAYOUTS: ZoneLayout[] = [
  { id: 'it-lab', name: 'IT Lab', shortName: 'IT Lab', floor: 2, x: 4, y: 6, w: 44, h: 40, type: 'room' },
  { id: 'quality-lab', name: 'Quality Lab', shortName: 'Q. Lab', floor: 2, x: 52, y: 6, w: 44, h: 40, type: 'room' },
  { id: 'conference', name: 'Conference Room A', shortName: 'Conf. A', floor: 2, x: 4, y: 52, w: 30, h: 40, type: 'room' },
  { id: 'server-room', name: 'Server Room', shortName: 'Server', floor: 2, x: 38, y: 52, w: 28, h: 40, type: 'room' },
  { id: 'prod-floor', name: 'Production Floor A', shortName: 'Prod. A', floor: 1, x: 4, y: 6, w: 58, h: 40, type: 'room' },
  { id: 'prod-bay', name: 'Production Bay', shortName: 'Prod. Bay', floor: 1, x: 4, y: 52, w: 44, h: 40, type: 'room' },
  { id: 'workshop', name: 'Maintenance Workshop', shortName: 'Workshop', floor: 1, x: 66, y: 6, w: 30, h: 86, type: 'room' },
  { id: 'lobby', name: 'Main Lobby', shortName: 'Lobby', floor: 0, x: 4, y: 6, w: 44, h: 40, type: 'gate' },
  { id: 'cafeteria', name: 'Cafeteria', shortName: 'Cafe', floor: 0, x: 52, y: 6, w: 44, h: 40, type: 'room' },
  { id: 'break-room', name: 'Break Room', shortName: 'Break Rm', floor: 0, x: 4, y: 52, w: 30, h: 40, type: 'room' },
  { id: 'reception', name: 'Reception', shortName: 'Reception', floor: 0, x: 38, y: 52, w: 28, h: 40, type: 'gate' },
  { id: 'parking', name: 'Parking Entrance', shortName: 'Parking', floor: 0, x: 70, y: 52, w: 26, h: 40, type: 'gate' },
];

export const FLOORS = [
  { level: 2, label: 'Floor 2 — Labs & Conference' },
  { level: 1, label: 'Floor 1 — Production & Maintenance' },
  { level: 0, label: 'Ground — Lobby & Common Areas' },
];

const MOCK_ROOMS: RoomData[] = [
  { id: 'it-lab', name: 'IT Lab', type: 'LAB', floor: 2, count: 6, capacity: 20, percent: 30, alertLevel: 'green' },
  { id: 'quality-lab', name: 'Quality Lab', type: 'LAB', floor: 2, count: 8, capacity: 20, percent: 40, alertLevel: 'green' },
  { id: 'conference', name: 'Conference Room A', type: 'MEETING', floor: 2, count: 10, capacity: 15, percent: 67, alertLevel: 'green' },
  { id: 'server-room', name: 'Server Room', type: 'LAB', floor: 2, count: 2, capacity: 5, percent: 40, alertLevel: 'green' },
  { id: 'prod-floor', name: 'Production Floor A', type: 'PRODUCTION', floor: 1, count: 18, capacity: 50, percent: 36, alertLevel: 'green' },
  { id: 'prod-bay', name: 'Production Bay', type: 'PRODUCTION', floor: 1, count: 12, capacity: 40, percent: 30, alertLevel: 'green' },
  { id: 'workshop', name: 'Maintenance Workshop', type: 'WORKSHOP', floor: 1, count: 5, capacity: 30, percent: 17, alertLevel: 'green' },
  { id: 'lobby', name: 'Main Lobby', type: 'GENERAL', floor: 0, count: 3, capacity: 50, percent: 6, alertLevel: 'green' },
  { id: 'cafeteria', name: 'Cafeteria', type: 'GENERAL', floor: 0, count: 14, capacity: 80, percent: 18, alertLevel: 'green' },
  { id: 'break-room', name: 'Break Room', type: 'GENERAL', floor: 0, count: 7, capacity: 20, percent: 35, alertLevel: 'green' },
  { id: 'reception', name: 'Reception', type: 'GENERAL', floor: 0, count: 2, capacity: 10, percent: 20, alertLevel: 'green' },
  { id: 'parking', name: 'Parking Entrance', type: 'GENERAL', floor: 0, count: 1, capacity: 10, percent: 10, alertLevel: 'green' },
];

function seededOffset(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 30) / 10 - 1.5;
}

export function deriveSmartData(room: RoomData): SmartRoomData {
  const offset = seededOffset(room.id);
  const pct = room.percent;
  const isServer = room.id === 'server-room';

  let hvac: HvacState;
  if (isServer) {
    hvac = { setpoint: 18, currentTemp: 18 + offset * 0.3, mode: 'cooling', fanSpeed: 90, energyKw: 3.0 };
  } else if (pct === 0) {
    hvac = { setpoint: 26, currentTemp: 26 + offset, mode: 'standby', fanSpeed: 0, energyKw: 0.1 };
  } else if (pct <= 25) {
    hvac = { setpoint: 24, currentTemp: 24 + offset * 0.5, mode: 'eco', fanSpeed: 30, energyKw: 0.8 };
  } else if (pct <= 60) {
    hvac = { setpoint: 22, currentTemp: 22 + offset * 0.4, mode: 'cooling', fanSpeed: 60, energyKw: 1.8 };
  } else {
    hvac = { setpoint: 21, currentTemp: 21 + offset * 0.3, mode: 'cooling', fanSpeed: 85, energyKw: 2.5 };
  }
  hvac.currentTemp = Math.round(hvac.currentTemp * 10) / 10;

  const lightZonesTotal = Math.max(1, Math.ceil(room.capacity / 10));
  let lighting: LightingState;
  if (pct === 0) {
    lighting = { brightness: 0, mode: 'off', zonesActive: 0, zonesTotal: lightZonesTotal, energyKw: 0 };
  } else if (pct <= 15) {
    lighting = { brightness: 30, mode: 'eco', zonesActive: 1, zonesTotal: lightZonesTotal, energyKw: 0.2 };
  } else if (pct <= 50) {
    lighting = { brightness: 60, mode: 'dimmed', zonesActive: Math.ceil(lightZonesTotal / 2), zonesTotal: lightZonesTotal, energyKw: 0.5 };
  } else {
    lighting = { brightness: 95, mode: 'full', zonesActive: lightZonesTotal, zonesTotal: lightZonesTotal, energyKw: 0.9 };
  }

  return { ...room, hvac, lighting };
}

export function getSmartRooms(): SmartRoomData[] {
  return MOCK_ROOMS.map(deriveSmartData);
}

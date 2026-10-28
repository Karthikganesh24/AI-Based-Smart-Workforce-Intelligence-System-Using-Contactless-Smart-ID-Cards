import { useState, useMemo } from 'react';
import { Card, Badge, Spinner, Modal } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import clsx from 'clsx';
import './RoomOccupancy.css';

interface RoomData {
  id: string;
  name: string;
  type: string;
  floor: number;
  count: number;
  capacity: number;
  percent: number;
  alertLevel: 'green' | 'yellow' | 'red';
  occupants: { name: string; department: string; since: string }[];
}

interface ZoneLayout {
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

const ZONE_LAYOUTS: ZoneLayout[] = [
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

const FLOORS = [
  { level: 2, label: 'Floor 2 — Labs & Conference' },
  { level: 1, label: 'Floor 1 — Production & Maintenance' },
  { level: 0, label: 'Ground — Lobby & Common Areas' },
];

const MOCK_ROOMS: RoomData[] = [
  { id: 'it-lab', name: 'IT Lab', type: 'LAB', floor: 2, count: 6, capacity: 20, percent: 30, alertLevel: 'green',
    occupants: [
      { name: 'Rohan Mehta', department: 'IT', since: '09:02 AM' },
      { name: 'Vikram Singh', department: 'IT', since: '09:15 AM' },
      { name: 'Manoj Verma', department: 'IT', since: '08:50 AM' },
      { name: 'Sneha Kulkarni', department: 'IT', since: '09:30 AM' },
      { name: 'Arjun Reddy', department: 'IT', since: '10:00 AM' },
      { name: 'Priya Nair', department: 'IT', since: '10:15 AM' },
    ]},
  { id: 'quality-lab', name: 'Quality Lab', type: 'LAB', floor: 2, count: 8, capacity: 20, percent: 40, alertLevel: 'green',
    occupants: [
      { name: 'Priya Sharma', department: 'Quality', since: '08:45 AM' },
      { name: 'Deepa Nair', department: 'Quality', since: '09:12 AM' },
      { name: 'Lakshmi Narayanan', department: 'Quality', since: '09:05 AM' },
      { name: 'Kiran Patel', department: 'Quality', since: '08:55 AM' },
      { name: 'Meera Joshi', department: 'Quality', since: '09:20 AM' },
      { name: 'Rahul Gupta', department: 'Quality', since: '09:35 AM' },
      { name: 'Nisha Kumar', department: 'Quality', since: '09:40 AM' },
      { name: 'Amit Shah', department: 'Quality', since: '10:05 AM' },
    ]},
  { id: 'conference', name: 'Conference Room A', type: 'MEETING', floor: 2, count: 10, capacity: 15, percent: 67, alertLevel: 'green',
    occupants: [
      { name: 'Suresh Patel', department: 'Management', since: '10:00 AM' },
      { name: 'Ananya Iyer', department: 'Production', since: '10:00 AM' },
      { name: 'Karthik Raja', department: 'Maintenance', since: '10:00 AM' },
      { name: 'Ganesh Das', department: 'Production', since: '10:00 AM' },
      { name: 'Ravi Shankar', department: 'Operations', since: '10:00 AM' },
      { name: 'Pooja Reddy', department: 'HR', since: '10:00 AM' },
      { name: 'Sanjay Mehta', department: 'Finance', since: '10:00 AM' },
      { name: 'Divya Pillai', department: 'Quality', since: '10:00 AM' },
      { name: 'Nikhil Das', department: 'IT', since: '10:05 AM' },
      { name: 'Rekha Menon', department: 'Admin', since: '10:05 AM' },
    ]},
  { id: 'server-room', name: 'Server Room', type: 'LAB', floor: 2, count: 2, capacity: 5, percent: 40, alertLevel: 'green',
    occupants: [
      { name: 'Arun Kumar', department: 'IT', since: '08:30 AM' },
      { name: 'Vijay Prakash', department: 'IT', since: '09:45 AM' },
    ]},
  { id: 'prod-floor', name: 'Production Floor A', type: 'PRODUCTION', floor: 1, count: 18, capacity: 50, percent: 36, alertLevel: 'green',
    occupants: [
      { name: 'Aravind Kumar', department: 'Production', since: '08:30 AM' },
      { name: 'Ananya Iyer', department: 'Production', since: '08:50 AM' },
      { name: 'Ganesh Das', department: 'Production', since: '08:58 AM' },
      { name: 'Sneha Kulkarni', department: 'Production', since: '09:10 AM' },
      { name: 'Mohan Raj', department: 'Production', since: '08:35 AM' },
      { name: 'Sunil Verma', department: 'Production', since: '08:40 AM' },
      { name: 'Ramesh Babu', department: 'Production', since: '08:32 AM' },
      { name: 'Naveen Kumar', department: 'Production', since: '08:45 AM' },
      { name: 'Prakash Rao', department: 'Production', since: '08:38 AM' },
      { name: 'Dinesh Gupta', department: 'Production', since: '09:00 AM' },
      { name: 'Ajay Mishra', department: 'Production', since: '09:05 AM' },
      { name: 'Santosh Nair', department: 'Production', since: '09:08 AM' },
      { name: 'Venkat Rao', department: 'Production', since: '08:50 AM' },
      { name: 'Kumar Singh', department: 'Production', since: '09:15 AM' },
      { name: 'Rajesh Iyer', department: 'Production', since: '09:20 AM' },
      { name: 'Harish Menon', department: 'Production', since: '08:55 AM' },
      { name: 'Gopal Krishna', department: 'Production', since: '09:25 AM' },
      { name: 'Ashok Reddy', department: 'Production', since: '09:12 AM' },
    ]},
  { id: 'prod-bay', name: 'Production Bay', type: 'PRODUCTION', floor: 1, count: 12, capacity: 40, percent: 30, alertLevel: 'green',
    occupants: [
      { name: 'Balaji Sundaram', department: 'Production', since: '08:35 AM' },
      { name: 'Chandran Pillai', department: 'Production', since: '08:42 AM' },
      { name: 'Deepak Nair', department: 'Production', since: '08:48 AM' },
      { name: 'Ezhil Kumar', department: 'Production', since: '08:55 AM' },
      { name: 'Faisal Ahmed', department: 'Production', since: '09:02 AM' },
      { name: 'Girish Rao', department: 'Production', since: '09:10 AM' },
      { name: 'Hari Prasad', department: 'Production', since: '09:15 AM' },
      { name: 'Jai Prakash', department: 'Production', since: '09:22 AM' },
      { name: 'Karthi Vel', department: 'Production', since: '09:28 AM' },
      { name: 'Lakshman Das', department: 'Production', since: '09:35 AM' },
      { name: 'Mani Ratnam', department: 'Production', since: '09:40 AM' },
      { name: 'Nandha Kumar', department: 'Production', since: '09:48 AM' },
    ]},
  { id: 'workshop', name: 'Maintenance Workshop', type: 'WORKSHOP', floor: 1, count: 5, capacity: 30, percent: 17, alertLevel: 'green',
    occupants: [
      { name: 'Karthik Raja', department: 'Maintenance', since: '08:35 AM' },
      { name: 'Suresh Patel', department: 'Maintenance', since: '09:00 AM' },
      { name: 'Rajan Pillai', department: 'Maintenance', since: '08:50 AM' },
      { name: 'Senthil Kumar', department: 'Maintenance', since: '09:10 AM' },
      { name: 'Bala Murugan', department: 'Maintenance', since: '09:25 AM' },
    ]},
  { id: 'lobby', name: 'Main Lobby', type: 'GENERAL', floor: 0, count: 3, capacity: 50, percent: 6, alertLevel: 'green',
    occupants: [
      { name: 'Security Guard A', department: 'Security', since: '07:00 AM' },
      { name: 'Receptionist', department: 'Admin', since: '08:00 AM' },
      { name: 'Visitor', department: 'External', since: '10:30 AM' },
    ]},
  { id: 'cafeteria', name: 'Cafeteria', type: 'GENERAL', floor: 0, count: 14, capacity: 80, percent: 18, alertLevel: 'green',
    occupants: [
      { name: 'Amit Nair', department: 'IT', since: '10:15 AM' },
      { name: 'Bhavani Devi', department: 'HR', since: '10:20 AM' },
      { name: 'Chitra Lakshmi', department: 'Finance', since: '10:18 AM' },
      { name: 'Dhanush Ram', department: 'Production', since: '10:22 AM' },
      { name: 'Elango Vel', department: 'Quality', since: '10:25 AM' },
      { name: 'Fatima Bee', department: 'Admin', since: '10:10 AM' },
      { name: 'Ganeshwari', department: 'HR', since: '10:12 AM' },
      { name: 'Hari Haran', department: 'IT', since: '10:28 AM' },
      { name: 'Indira Devi', department: 'Quality', since: '10:30 AM' },
      { name: 'Jayashree', department: 'Finance', since: '10:32 AM' },
      { name: 'Kalai Selvi', department: 'Admin', since: '10:08 AM' },
      { name: 'Lalitha Devi', department: 'Production', since: '10:35 AM' },
      { name: 'Murugan Raj', department: 'Maintenance', since: '10:38 AM' },
      { name: 'Nithya Sri', department: 'HR', since: '10:40 AM' },
    ]},
  { id: 'break-room', name: 'Break Room', type: 'GENERAL', floor: 0, count: 7, capacity: 20, percent: 35, alertLevel: 'green',
    occupants: [
      { name: 'Oviya Nair', department: 'Quality', since: '10:25 AM' },
      { name: 'Prabhu Dev', department: 'Production', since: '10:20 AM' },
      { name: 'Radha Krishna', department: 'IT', since: '10:30 AM' },
      { name: 'Saravanan', department: 'Maintenance', since: '10:15 AM' },
      { name: 'Tamilselvi', department: 'Admin', since: '10:35 AM' },
      { name: 'Uma Maheswari', department: 'Finance', since: '10:28 AM' },
      { name: 'Velu Nachiyar', department: 'Production', since: '10:22 AM' },
    ]},
  { id: 'reception', name: 'Reception', type: 'GENERAL', floor: 0, count: 2, capacity: 10, percent: 20, alertLevel: 'green',
    occupants: [
      { name: 'Front Desk A', department: 'Admin', since: '08:00 AM' },
      { name: 'Front Desk B', department: 'Admin', since: '08:00 AM' },
    ]},
  { id: 'parking', name: 'Parking Entrance', type: 'GENERAL', floor: 0, count: 1, capacity: 10, percent: 10, alertLevel: 'green',
    occupants: [
      { name: 'Security Guard B', department: 'Security', since: '07:00 AM' },
    ]},
];

function heatColor(percent: number): string {
  if (percent >= 90) return 'rgba(239, 68, 68, 0.35)';
  if (percent >= 75) return 'rgba(245, 158, 11, 0.25)';
  if (percent >= 50) return 'rgba(245, 158, 11, 0.12)';
  return 'rgba(34, 197, 94, 0.08)';
}

function alertVariant(level: string): 'success' | 'warning' | 'error' {
  if (level === 'red') return 'error';
  if (level === 'yellow') return 'warning';
  return 'success';
}

export const RoomOccupancy = () => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

  const rooms = MOCK_ROOMS;

  const totalOccupancy = useMemo(() => rooms.reduce((s, r) => s + r.count, 0), [rooms]);
  const totalCapacity = useMemo(() => rooms.reduce((s, r) => s + r.capacity, 0), [rooms]);
  const avgUtil = useMemo(() => Math.round((totalOccupancy / totalCapacity) * 100), [totalOccupancy, totalCapacity]);

  const roomMap = useMemo(() => {
    const m = new Map<string, RoomData>();
    rooms.forEach(r => m.set(r.id, r));
    return m;
  }, [rooms]);

  return (
    <div className="room-occupancy-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Room Occupancy</h1>
          <p className="page-subtitle">
            <AnimatedNumber value={totalOccupancy} /> occupants &middot; {totalCapacity} capacity &middot; {avgUtil}% utilization
          </p>
        </div>
      </header>

      {/* Stats row */}
      <div className="occ-stats-row">
        <Card className="occ-stat-card">
          <div className="occ-stat-label">Total Inside</div>
          <div className="occ-stat-value"><AnimatedNumber value={totalOccupancy} /></div>
        </Card>
        <Card className="occ-stat-card">
          <div className="occ-stat-label">Capacity</div>
          <div className="occ-stat-value">{totalCapacity}</div>
        </Card>
        <Card className="occ-stat-card">
          <div className="occ-stat-label">Utilization</div>
          <div className="occ-stat-value">{avgUtil}%</div>
        </Card>
        <Card className="occ-stat-card">
          <div className="occ-stat-label">Active Zones</div>
          <div className="occ-stat-value">{rooms.filter(r => r.count > 0).length}</div>
        </Card>
      </div>

      {/* 3D Building Map */}
      <div className="building-3d-scene" onClick={() => setSelectedFloor(null)}>
        <div className="building-perspective">
          {FLOORS.map((floor) => {
            const isExpanded = selectedFloor === floor.level;
            const zonesOnFloor = ZONE_LAYOUTS.filter(z => z.floor === floor.level);

            return (
              <div
                key={floor.level}
                className={clsx(
                  'floor-layer',
                  `floor-level-${floor.level}`,
                  isExpanded && 'floor-expanded',
                  selectedFloor !== null && !isExpanded && 'floor-dimmed'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFloor(isExpanded ? null : floor.level);
                }}
              >
                <div className="floor-label-bar">
                  <span className="floor-label-text">{floor.label}</span>
                </div>
                <div className="floor-plate">
                  {zonesOnFloor.map((zone) => {
                    const room = roomMap.get(zone.id);
                    const count = room?.count ?? 0;
                    const capacity = room?.capacity ?? 0;
                    const percent = room?.percent ?? 0;
                    const isHovered = hoveredZone === zone.id;

                    return (
                      <div
                        key={zone.id}
                        className={clsx(
                          'zone-block',
                          zone.type === 'gate' ? 'zone-gate' : 'zone-room',
                          isHovered && 'zone-hovered',
                          percent >= 90 && 'zone-critical',
                          percent >= 75 && percent < 90 && 'zone-warning'
                        )}
                        style={{
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.w}%`,
                          height: `${zone.h}%`,
                          '--heat-color': heatColor(percent),
                        } as React.CSSProperties}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (room) setSelectedRoom(room);
                        }}
                        role="button"
                        aria-label={`${zone.name}: ${count} of ${capacity} occupied`}
                      >
                        <div className="zone-heat-overlay" />
                        <div className="zone-content">
                          <span className="zone-label">{zone.shortName}</span>
                          {count > 0 && (
                            <span className="zone-count">
                              <span className="zc-occupancy">{count}</span>
                              <span className="zc-sep">/</span>
                              <span className="zc-capacity">{capacity}</span>
                            </span>
                          )}
                        </div>

                        {/* People dots */}
                        <div className="zone-dots">
                          {room?.occupants.slice(0, 20).map((occ, i) => {
                            const col = i % 5;
                            const row = Math.floor(i / 5);
                            return (
                              <span
                                key={i}
                                className="person-dot dot-present"
                                style={{
                                  left: `${15 + col * 18}%`,
                                  top: `${30 + row * 18}%`,
                                }}
                                title={`${occ.name} — ${occ.department} — since ${occ.since}`}
                              />
                            );
                          })}
                          {(room?.occupants.length ?? 0) > 20 && (
                            <span className="dots-overflow">+{(room?.occupants.length ?? 0) - 20}</span>
                          )}
                        </div>

                        {/* Capacity bar */}
                        {count > 0 && (
                          <div className="zone-capacity-bar">
                            <div
                              className={clsx('zone-capacity-fill', `cap-${room?.alertLevel ?? 'green'}`)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        )}

                        {/* Hover tooltip */}
                        {isHovered && room && (
                          <div className="zone-tooltip">
                            <strong>{room.name}</strong>
                            <div className="tooltip-stats">
                              <span>{room.count} / {room.capacity} occupied</span>
                              <span className={`tt-${room.alertLevel}`}>{room.percent}% utilized</span>
                            </div>
                            {room.occupants.slice(0, 5).map((occ, i) => (
                              <div key={i} className="tooltip-person">
                                <span className="tp-dot dot-present" />
                                {occ.name}
                                <span className="tp-dept">{occ.department}</span>
                              </div>
                            ))}
                            {room.occupants.length > 5 && (
                              <div className="tooltip-more">+{room.occupants.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="floor-grid" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room cards grid */}
      <div className="room-cards-section">
        <h2 className="section-title">All Zones</h2>
        <div className="room-cards-grid">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className={clsx('room-card-item', `room-alert-${room.alertLevel}`)}
              hover
              onClick={() => setSelectedRoom(room)}
            >
              <div className="rci-header">
                <span className="rci-name">{room.name}</span>
                <Badge variant={alertVariant(room.alertLevel)} size="sm">
                  {room.alertLevel === 'red' ? 'Full' : room.alertLevel === 'yellow' ? 'Busy' : 'Normal'}
                </Badge>
              </div>
              <div className="rci-numbers">
                <span className="rci-count">{room.count}</span>
                <span className="rci-sep">/</span>
                <span className="rci-capacity">{room.capacity}</span>
              </div>
              <div className="rci-bar">
                <div className={clsx('rci-bar-fill', `cap-${room.alertLevel}`)} style={{ width: `${room.percent}%` }} />
              </div>
              <div className="rci-floor">Floor {room.floor}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Room detail modal */}
      {selectedRoom && (
        <Modal
          isOpen
          onClose={() => setSelectedRoom(null)}
          title={selectedRoom.name}
          size="lg"
        >
          <div className="room-detail-modal">
            <div className="rdm-stats">
              <div className="rdm-stat">
                <span className="rdm-stat-value">{selectedRoom.count}</span>
                <span className="rdm-stat-label">Occupants</span>
              </div>
              <div className="rdm-stat">
                <span className="rdm-stat-value">{selectedRoom.capacity}</span>
                <span className="rdm-stat-label">Capacity</span>
              </div>
              <div className="rdm-stat">
                <span className="rdm-stat-value">{selectedRoom.percent}%</span>
                <span className="rdm-stat-label">Utilized</span>
              </div>
              <div className="rdm-stat">
                <span className="rdm-stat-value">{selectedRoom.capacity - selectedRoom.count}</span>
                <span className="rdm-stat-label">Available</span>
              </div>
            </div>

            <div className="rdm-bar">
              <div className="rdm-bar-label">
                <span>Capacity</span>
                <span>{selectedRoom.count} / {selectedRoom.capacity}</span>
              </div>
              <div className="rdm-bar-track">
                <div className={clsx('rdm-bar-fill', `cap-${selectedRoom.alertLevel}`)} style={{ width: `${selectedRoom.percent}%` }} />
              </div>
            </div>

            <div className="rdm-occupants">
              <h3>Current Occupants ({selectedRoom.occupants.length})</h3>
              <div className="rdm-occ-list">
                {selectedRoom.occupants.map((occ, i) => (
                  <div key={i} className="rdm-occ-row">
                    <span className="person-dot dot-present" style={{ position: 'relative' }} />
                    <div className="rdm-occ-info">
                      <span className="rdm-occ-name">{occ.name}</span>
                      <span className="rdm-occ-dept">{occ.department} &middot; since {occ.since}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

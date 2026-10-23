/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */

import { useEffect, useState } from 'react';
import { useRoomOccupancy } from '@hooks/useRooms';
import { RoomGrid, FloorPlan } from '@components/RoomOccupancy';
import { Spinner, Card, Button, Modal, Badge } from '@components/UI';
import { useUIStore } from '@store/uiStore';
import { useAlertStore } from '@store/alertStore';
import { playBuzzSound } from '@utils/audio';
import toast from 'react-hot-toast';
import type { Room } from '@models/room';
import './RoomOccupancy.css';

// Mock data for testing without authentication
const mockRooms: Room[] = [
  {
    id: 'room-1',
    name: 'Conference Room A',
    count: 8,
    capacity: 12,
    percent: 67,
    alertLevel: 'green',
  },
  {
    id: 'room-2',
    name: 'Training Hall',
    count: 28,
    capacity: 30,
    percent: 93,
    alertLevel: 'red',
  },
  {
    id: 'room-3',
    name: 'Break Room',
    count: 15,
    capacity: 20,
    percent: 75,
    alertLevel: 'yellow',
  },
  {
    id: 'room-4',
    name: 'Cafeteria',
    count: 42,
    capacity: 80,
    percent: 53,
    alertLevel: 'green',
  },
];

export const RoomOccupancy = () => {
  const { data, isLoading, error } = useRoomOccupancy();
  const { activeModal, modalData, openModal, closeModal } = useUIStore();
  const { alertedRooms, addAlertedRoom } = useAlertStore();
  const [viewMode, setViewMode] = useState<'floor-plan' | 'grid'>('floor-plan');
  const [animatedRooms, setAnimatedRooms] = useState<Room[]>(mockRooms);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Always show mock data for demo - comment this out when backend auth is ready
  const DEMO_MODE = true;

  // DISABLED: Auto-animation removed - data stays static
  // To re-enable live animation, uncomment the useEffect below
  // useEffect(() => {
  //   if (!DEMO_MODE) return;
  //   const interval = setInterval(() => {
  //     setAnimatedRooms(prev => prev.map(room => {
  //       const change = Math.floor(Math.random() * 5) - 2;
  //       const newCount = Math.max(0, Math.min(room.capacity, room.count + change));
  //       const newPercent = Math.round((newCount / room.capacity) * 100);
  //       let alertLevel: 'green' | 'yellow' | 'red' = 'green';
  //       if (newPercent >= 90) alertLevel = 'red';
  //       else if (newPercent >= 75) alertLevel = 'yellow';
  //       return { ...room, count: newCount, percent: newPercent, alertLevel };
  //     }));
  //   }, 8000);
  //   return () => clearInterval(interval);
  // }, [DEMO_MODE]);

  // Use mock data if there's any error OR if in demo mode
  const useMockData = DEMO_MODE || !!error || !data;
  const mockDataSummary = {
    rooms: animatedRooms,
    totalOccupancy: animatedRooms.reduce((sum, r) => sum + r.count, 0),
    totalCapacity: animatedRooms.reduce((sum, r) => sum + r.capacity, 0),
    averageUtilization: animatedRooms.reduce((sum, r) => sum + r.percent, 0) / animatedRooms.length,
    criticalRooms: animatedRooms.filter(r => r.alertLevel === 'red'),
  };

  const displayData = useMockData ? mockDataSummary : data;

  // Disabled alert toasts to prevent noise in demo mode
  // useEffect(() => {
  //   if (!displayData?.rooms) return;
  //   displayData.rooms.forEach((room) => {
  //     const alertKey = `${room.id}-${room.alertLevel}`;
  //     if (room.alertLevel === 'red' && !alertedRooms.has(alertKey)) {
  //       toast.error(`${room.name} at ${room.percent}% capacity`, {
  //         duration: 5000,
  //       });
  //       playBuzzSound();
  //       addAlertedRoom(alertKey);
  //     }
  //   });
  // }, [displayData, alertedRooms, addAlertedRoom]);

  const handleViewDetails = (room: Room) => {
    console.log('Opening modal for room:', room);
    setSelectedRoom(room);
    openModal('room-details', { roomId: room.id });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spinner size="lg" />
        <p>Loading room data</p>
      </div>
    );
  }

  if (!displayData || !displayData.rooms.length) {
    return (
      <div className="empty-container">
        <Card>
          <h2>No Room Data</h2>
          <p>No rooms configured in the system.</p>
        </Card>
      </div>
    );
  }

  const criticalCount = displayData.criticalRooms?.length || 0;

  return (
    <div className="room-occupancy-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Room Occupancy</h1>
          <p className="page-subtitle">
            {displayData.totalOccupancy} occupants · {displayData.totalCapacity} capacity · {displayData.averageUtilization.toFixed(0)}% utilization
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {criticalCount > 0 && (
            <div className="capacity-warning">
              <span className="warning-badge">{criticalCount}</span>
              <span className="warning-text">
                {criticalCount === 1 ? 'room' : 'rooms'} at capacity
              </span>
            </div>
          )}

          <div className="view-toggle">
            <Button
              variant={viewMode === 'floor-plan' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('floor-plan')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Floor Plan
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              Grid
            </Button>
          </div>
        </div>
      </header>

      {viewMode === 'floor-plan' ? (
        <FloorPlan rooms={displayData.rooms} onRoomClick={handleViewDetails} />
      ) : (
        <RoomGrid rooms={displayData.rooms} onViewDetails={(id) => {
          const room = displayData.rooms.find(r => r.id === id);
          if (room) handleViewDetails(room);
        }} />
      )}

      {/* Room Details Modal */}
      {selectedRoom && (
        <Modal
          isOpen={activeModal === 'room-details'}
          onClose={() => {
            closeModal();
            setSelectedRoom(null);
          }}
          title={selectedRoom.name}
          size="md"
        >
          <div className="room-details-content">
            <div className="room-stats-grid">
              <div className="room-stat-card">
                <div className="stat-label">Current Occupancy</div>
                <div className="stat-value">{selectedRoom.count}</div>
              </div>
              <div className="room-stat-card">
                <div className="stat-label">Capacity</div>
                <div className="stat-value">{selectedRoom.capacity}</div>
              </div>
              <div className="room-stat-card">
                <div className="stat-label">Utilization</div>
                <div className="stat-value">{selectedRoom.percent}%</div>
              </div>
              <div className="room-stat-card">
                <div className="stat-label">Status</div>
                <div className="stat-badge">
                  <Badge
                    variant={
                      selectedRoom.alertLevel === 'red' ? 'danger' :
                      selectedRoom.alertLevel === 'yellow' ? 'warning' :
                      'success'
                    }
                    size="md"
                  >
                    {selectedRoom.alertLevel === 'red' ? 'At Capacity' :
                     selectedRoom.alertLevel === 'yellow' ? 'Near Capacity' :
                     'Normal'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="room-occupancy-bar">
              <div className="occupancy-bar-label">
                <span>Occupancy Level</span>
                <span>{selectedRoom.count} / {selectedRoom.capacity}</span>
              </div>
              <div className="occupancy-bar-track">
                <div
                  className={`occupancy-bar-fill occupancy-${selectedRoom.alertLevel}`}
                  style={{ width: `${selectedRoom.percent}%` }}
                />
              </div>
            </div>

            <div className="room-info-section">
              <h3>Room Information</h3>
              <div className="info-row">
                <span className="info-label">Room ID:</span>
                <span className="info-value">{selectedRoom.id}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Available Seats:</span>
                <span className="info-value">{selectedRoom.capacity - selectedRoom.count}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Alert Level:</span>
                <span className={`info-value alert-${selectedRoom.alertLevel}`}>
                  {selectedRoom.alertLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

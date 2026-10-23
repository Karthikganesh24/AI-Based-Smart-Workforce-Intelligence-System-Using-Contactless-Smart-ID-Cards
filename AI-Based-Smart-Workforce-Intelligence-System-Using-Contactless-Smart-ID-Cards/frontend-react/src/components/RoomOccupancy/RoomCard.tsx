import { useState } from 'react';
import { Card, Badge } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import { OccupancyMeter } from './OccupancyMeter';
import type { Room } from '@models/room';
import clsx from 'clsx';
import './RoomCard.css';

interface RoomCardProps {
  room: Room;
  onViewDetails: (id: string) => void;
}

export const RoomCard = ({ room, onViewDetails }: RoomCardProps) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientY - rect.top - rect.height / 2) / 20;
    const y = (e.clientX - rect.left - rect.width / 2) / 20;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const alertVariant =
    room.alertLevel === 'red' ? 'error' :
    room.alertLevel === 'yellow' ? 'warning' :
    'success';

  const gradient =
    room.alertLevel === 'red' ? 'danger' :
    room.alertLevel === 'yellow' ? 'warning' :
    'success';

  return (
    <div
      className={clsx('room-card-wrapper', `alert-${room.alertLevel}`)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      <Card variant="glass" hover className="room-card">
        <div className="room-card-header">
          <h3 className="room-name">{room.name}</h3>
          <Badge variant={alertVariant} glow={room.alertLevel === 'red'}>
            {room.alertLevel === 'red' ? '🔴 CRITICAL' :
             room.alertLevel === 'yellow' ? '🟡 HIGH' :
             '🟢 NORMAL'}
          </Badge>
        </div>

        <OccupancyMeter
          value={room.count}
          max={room.capacity}
          animated
          gradient={gradient}
          pulse={room.alertLevel === 'red'}
        />

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">
              <AnimatedNumber value={room.count} />
            </div>
            <div className="stat-label">Current</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              <AnimatedNumber value={room.capacity} />
            </div>
            <div className="stat-label">Capacity</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              <AnimatedNumber value={room.percent} suffix="%" />
            </div>
            <div className="stat-label">Usage</div>
          </div>
        </div>

        <button
          type="button"
          className="view-details-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked, room:', room.id);
            onViewDetails(room.id);
          }}
        >
          View Details →
        </button>
      </Card>
    </div>
  );
};

import { RoomCard } from './RoomCard';
import type { Room } from '@models/room';
import './RoomGrid.css';

interface RoomGridProps {
  rooms: Room[];
  onViewDetails: (id: string) => void;
}

export const RoomGrid = ({ rooms, onViewDetails }: RoomGridProps) => {
  return (
    <div className="room-grid">
      {rooms.map((room, index) => (
        <div
          key={room.id}
          className="room-grid-item"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <RoomCard room={room} onViewDetails={onViewDetails} />
        </div>
      ))}
    </div>
  );
};

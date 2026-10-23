/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · design-system: design.md · designed-as-app */

import { useState, useEffect } from 'react';
import { AnimatedNumber } from '@components/Animations';
import type { Room } from '@models/room';
import clsx from 'clsx';
import './FloorPlan.css';

interface FloorPlanProps {
  rooms: Room[];
  onRoomClick?: (room: Room) => void;
}

export const FloorPlan = ({ rooms, onRoomClick }: FloorPlanProps) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Ensure we have exactly 4 rooms for the 2x2 grid
  const displayRooms = rooms.slice(0, 4);

  // Fill with placeholder data if less than 4 rooms
  while (displayRooms.length < 4) {
    displayRooms.push({
      id: `placeholder-${displayRooms.length}`,
      name: `Room ${displayRooms.length + 1}`,
      count: 0,
      capacity: 20,
      percent: 0,
      alertLevel: 'green',
    });
  }

  const handleRoomClick = (room: Room) => {
    if (room.id.startsWith('placeholder')) return;
    setSelectedRoom(room.id);
    onRoomClick?.(room);
  };

  return (
    <div className="floor-plan-container">
      <div className="floor-plan-grid">
        {displayRooms.map((room, index) => {
          const utilizationPercent = room.capacity > 0 ? (room.count / room.capacity) * 100 : 0;
          const isHovered = hoveredRoom === room.id;
          const isSelected = selectedRoom === room.id;
          const isPlaceholder = room.id.startsWith('placeholder');

          // Calculate fill height for occupancy visualization
          const fillHeight = `${Math.min(utilizationPercent, 100)}%`;

          // Determine color based on alert level
          const fillColor =
            room.alertLevel === 'red' ? 'var(--error)' :
            room.alertLevel === 'yellow' ? 'var(--warning)' :
            'var(--success)';

          const pulseAnimation = room.alertLevel === 'red';

          return (
            <div
              key={room.id}
              className={clsx(
                'floor-plan-room',
                `position-${index}`,
                `alert-${room.alertLevel}`,
                {
                  'is-hovered': isHovered,
                  'is-selected': isSelected,
                  'is-placeholder': isPlaceholder,
                  'pulse-animation': pulseAnimation,
                }
              )}
              onMouseEnter={() => !isPlaceholder && setHoveredRoom(room.id)}
              onMouseLeave={() => setHoveredRoom(null)}
              onClick={() => handleRoomClick(room)}
              style={{ cursor: isPlaceholder ? 'default' : 'pointer' }}
            >
              {/* Animated fill background */}
              <div
                className="room-fill"
                style={{
                  height: fillHeight,
                  backgroundColor: fillColor,
                  transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />

              {/* Grid lines overlay */}
              <div className="room-grid-overlay">
                <div className="grid-line horizontal" />
                <div className="grid-line horizontal" />
                <div className="grid-line vertical" />
                <div className="grid-line vertical" />
              </div>

              {/* Room content */}
              <div className="room-content">
                <div className="room-header">
                  <h3 className="room-title">{room.name}</h3>
                  {!isPlaceholder && (
                    <div className={clsx('status-indicator', `status-${room.alertLevel}`)}>
                      <div className="status-dot" />
                    </div>
                  )}
                </div>

                {!isPlaceholder && (
                  <>
                    <div className="room-occupancy-display">
                      <div className="occupancy-main">
                        <div className="occupancy-number">
                          <AnimatedNumber value={room.count} />
                        </div>
                        <div className="occupancy-separator">/</div>
                        <div className="occupancy-capacity">{room.capacity}</div>
                      </div>
                      <div className="occupancy-label">People</div>
                    </div>

                    <div className="room-percentage">
                      <AnimatedNumber value={Math.round(utilizationPercent)} suffix="%" />
                      <span className="percentage-label">Capacity</span>
                    </div>

                    {/* Occupant icons */}
                    <div className="occupant-icons">
                      {Array.from({ length: Math.min(room.count, 12) }).map((_, i) => (
                        <div
                          key={i}
                          className="occupant-icon"
                          style={{
                            animationDelay: `${i * 0.05}s`,
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      ))}
                      {room.count > 12 && (
                        <div className="occupant-icon occupant-more">
                          +{room.count - 12}
                        </div>
                      )}
                    </div>

                    {/* Alert badge */}
                    {room.alertLevel === 'red' && (
                      <div className="room-alert-badge critical">
                        🔴 AT CAPACITY
                      </div>
                    )}
                    {room.alertLevel === 'yellow' && (
                      <div className="room-alert-badge warning">
                        🟡 HIGH USAGE
                      </div>
                    )}
                  </>
                )}

                {isPlaceholder && (
                  <div className="placeholder-content">
                    <div className="placeholder-icon">📍</div>
                    <div className="placeholder-text">No Data</div>
                  </div>
                )}
              </div>

              {/* Hover overlay */}
              {isHovered && !isPlaceholder && (
                <div className="room-hover-overlay">
                  <div className="hover-action">Click to view details</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="floor-plan-legend">
        <div className="legend-item">
          <div className="legend-dot green" />
          <span>Normal (0-75%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot yellow" />
          <span>High (75-90%)</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot red" />
          <span>Critical (90%+)</span>
        </div>
      </div>
    </div>
  );
};

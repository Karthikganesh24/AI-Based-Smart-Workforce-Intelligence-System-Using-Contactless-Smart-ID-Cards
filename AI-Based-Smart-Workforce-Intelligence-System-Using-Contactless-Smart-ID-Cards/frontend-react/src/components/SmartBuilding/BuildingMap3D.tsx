import clsx from 'clsx';
import { ZONE_LAYOUTS, FLOORS } from '@data/smartBuildingData';
import type { SmartRoomData } from '@data/smartBuildingData';
import { ThermometerIcon, LightbulbIcon } from './SmartBuildingIcons';

interface BuildingMap3DProps {
  rooms: SmartRoomData[];
  viewMode: 'hvac' | 'lighting';
  selectedFloor: number | null;
  setSelectedFloor: (f: number | null) => void;
  hoveredZone: string | null;
  setHoveredZone: (id: string | null) => void;
  selectedRoom: SmartRoomData | null;
  setSelectedRoom: (r: SmartRoomData | null) => void;
}

function hvacOverlay(temp: number): string {
  const t = Math.max(0, Math.min(1, (temp - 18) / 10));
  const hue = 240 - t * 215;
  return `oklch(70% 0.12 ${hue} / 0.25)`;
}

function lightingOverlay(brightness: number): string {
  return `oklch(90% 0.08 85 / ${brightness * 0.004})`;
}

export const BuildingMap3D = ({
  rooms,
  viewMode,
  selectedFloor,
  setSelectedFloor,
  hoveredZone,
  setHoveredZone,
  selectedRoom,
  setSelectedRoom,
}: BuildingMap3DProps) => {
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  return (
    <div className="sb-building-3d-scene" onClick={() => setSelectedFloor(null)}>
      <div className="sb-building-perspective">
        {FLOORS.map((floor) => {
          const isExpanded = selectedFloor === floor.level;
          const zonesOnFloor = ZONE_LAYOUTS.filter(z => z.floor === floor.level);

          return (
            <div
              key={floor.level}
              className={clsx(
                'sb-floor-layer',
                `sb-floor-level-${floor.level}`,
                isExpanded && 'sb-floor-expanded',
                selectedFloor !== null && !isExpanded && 'sb-floor-dimmed'
              )}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFloor(isExpanded ? null : floor.level);
              }}
            >
              <div className="sb-floor-label-bar">
                <span className="sb-floor-label-text">{floor.label}</span>
              </div>
              <div className="sb-floor-plate">
                {zonesOnFloor.map((zone) => {
                  const room = roomMap.get(zone.id);
                  if (!room) return null;
                  const isHovered = hoveredZone === zone.id;
                  const isSelected = selectedRoom?.id === zone.id;

                  const overlay = viewMode === 'hvac'
                    ? hvacOverlay(room.hvac.currentTemp)
                    : lightingOverlay(room.lighting.brightness);

                  const statusText = viewMode === 'hvac'
                    ? `${room.hvac.currentTemp}°C`
                    : `${room.lighting.brightness}%`;

                  return (
                    <div
                      key={zone.id}
                      className={clsx(
                        'sb-zone-block',
                        zone.type === 'gate' ? 'sb-zone-gate' : 'sb-zone-room',
                        isHovered && 'sb-zone-hovered',
                        isSelected && 'sb-zone-selected'
                      )}
                      style={{
                        left: `${zone.x}%`,
                        top: `${zone.y}%`,
                        width: `${zone.w}%`,
                        height: `${zone.h}%`,
                        '--zone-overlay': overlay,
                      } as React.CSSProperties}
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(isSelected ? null : room);
                      }}
                      role="button"
                      aria-label={`${zone.name}: ${statusText}`}
                    >
                      <div className="sb-zone-overlay" />
                      <div className="sb-zone-content">
                        <span className="sb-zone-label">{zone.shortName}</span>
                        <span className="sb-zone-status">
                          <span className="sb-zone-status-icon">
                            {viewMode === 'hvac' ? <ThermometerIcon size={10} /> : <LightbulbIcon size={10} />}
                          </span>
                          <span className="sb-zone-status-text">{statusText}</span>
                        </span>
                      </div>

                      {isHovered && (
                        <div className="sb-zone-tooltip">
                          <strong>{room.name}</strong>
                          {viewMode === 'hvac' ? (
                            <div className="sb-tooltip-stats">
                              <span>Mode: {room.hvac.mode}</span>
                              <span>Set: {room.hvac.setpoint}°C / Now: {room.hvac.currentTemp}°C</span>
                              <span>Fan: {room.hvac.fanSpeed}%</span>
                              <span>Energy: {room.hvac.energyKw} kW</span>
                            </div>
                          ) : (
                            <div className="sb-tooltip-stats">
                              <span>Mode: {room.lighting.mode}</span>
                              <span>Brightness: {room.lighting.brightness}%</span>
                              <span>Zones: {room.lighting.zonesActive}/{room.lighting.zonesTotal}</span>
                              <span>Energy: {room.lighting.energyKw} kW</span>
                            </div>
                          )}
                          <div className="sb-tooltip-occ">
                            {room.count}/{room.capacity} occupied
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="sb-floor-grid" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

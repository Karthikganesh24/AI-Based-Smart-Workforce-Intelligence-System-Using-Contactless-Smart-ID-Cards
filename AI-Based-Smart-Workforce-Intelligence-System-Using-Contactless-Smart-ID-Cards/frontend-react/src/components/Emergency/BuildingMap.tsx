import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { EvacuationParticipant, HeadcountStatus, ZoneSummary } from '@models/emergency';
import './BuildingMap.css';

interface BuildingMapProps {
  participants: EvacuationParticipant[];
  zones: ZoneSummary[];
  isActive: boolean;
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
  // Floor 2
  { id: 'it-lab', name: 'IT Lab', shortName: 'IT Lab', floor: 2, x: 4, y: 6, w: 44, h: 40, type: 'room' },
  { id: 'quality-lab', name: 'Quality Lab', shortName: 'Q. Lab', floor: 2, x: 52, y: 6, w: 44, h: 40, type: 'room' },
  { id: 'conference', name: 'Conference Room A', shortName: 'Conf. A', floor: 2, x: 4, y: 52, w: 30, h: 40, type: 'room' },
  // Floor 1
  { id: 'prod-floor', name: 'Production Floor A', shortName: 'Prod. A', floor: 1, x: 4, y: 6, w: 58, h: 40, type: 'room' },
  { id: 'prod-bay', name: 'Production Bay', shortName: 'Prod. Bay', floor: 1, x: 4, y: 52, w: 44, h: 40, type: 'room' },
  { id: 'workshop', name: 'Maintenance Workshop', shortName: 'Workshop', floor: 1, x: 66, y: 6, w: 30, h: 86, type: 'room' },
  // Ground floor — Exit gates
  { id: 'gate-south', name: 'BLE Exit Gate — South Wing', shortName: 'South Exit', floor: 0, x: 4, y: 6, w: 28, h: 36, type: 'gate' },
  { id: 'gate-north', name: 'BLE Exit Gate — North Wing', shortName: 'North Exit', floor: 0, x: 36, y: 6, w: 28, h: 36, type: 'gate' },
  { id: 'gate-lobby', name: 'BLE Exit Gate — Main Lobby', shortName: 'Main Lobby', floor: 0, x: 68, y: 6, w: 28, h: 36, type: 'gate' },
  { id: 'gate-stairwell', name: 'BLE Exit Gate — Emergency Stairwell B', shortName: 'Stairwell B', floor: 0, x: 4, y: 48, w: 28, h: 44, type: 'gate' },
  { id: 'gate-parking', name: 'BLE Exit Gate — Parking Level', shortName: 'Parking', floor: 0, x: 36, y: 48, w: 28, h: 44, type: 'gate' },
  { id: 'gate-main', name: 'Gate 01 - Main Entrance', shortName: 'Main Gate', floor: 0, x: 68, y: 48, w: 28, h: 44, type: 'gate' },
];

const FLOORS = [
  { level: 2, label: 'Floor 2 — Labs & Conference' },
  { level: 1, label: 'Floor 1 — Production & Maintenance' },
  { level: 0, label: 'Ground — BLE iBeacon Exit Gates' },
];

const STATUS_COLORS: Record<HeadcountStatus, string> = {
  MISSING: '#ef4444',
  ACCOUNTED_FOR: '#22c55e',
  UNVERIFIED: '#f59e0b',
  NOT_EXPECTED: '#6b7280',
};

function matchZone(lastKnownZone: string | null): string | null {
  if (!lastKnownZone) return null;
  const lower = lastKnownZone.toLowerCase();
  for (const z of ZONE_LAYOUTS) {
    if (z.name.toLowerCase() === lower) return z.id;
    if (lower.includes(z.name.toLowerCase())) return z.id;
    if (z.name.toLowerCase().includes(lower)) return z.id;
  }
  // Fuzzy match on keywords
  if (lower.includes('south')) return 'gate-south';
  if (lower.includes('north')) return 'gate-north';
  if (lower.includes('lobby') || lower.includes('main entrance') || lower.includes('main facility')) return 'gate-main';
  if (lower.includes('stairwell')) return 'gate-stairwell';
  if (lower.includes('parking')) return 'gate-parking';
  if (lower.includes('it lab') || lower.includes('it ')) return 'it-lab';
  if (lower.includes('quality')) return 'quality-lab';
  if (lower.includes('conference') || lower.includes('meeting')) return 'conference';
  if (lower.includes('production floor') || lower.includes('prod floor')) return 'prod-floor';
  if (lower.includes('production bay') || lower.includes('prod bay')) return 'prod-bay';
  if (lower.includes('workshop') || lower.includes('maintenance')) return 'workshop';
  // Gate fallbacks based on number
  if (lower.includes('gate 01') || lower.includes('gate 1')) return 'gate-main';
  if (lower.includes('gate 02') || lower.includes('gate 2')) return 'gate-south';
  if (lower.includes('gate 03') || lower.includes('gate 3')) return 'gate-north';
  if (lower.includes('gate 04') || lower.includes('gate 4')) return 'gate-parking';
  return null;
}

function heatIntensity(missing: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, missing / Math.max(total, 1));
}

export const BuildingMap = ({ participants, zones, isActive }: BuildingMapProps) => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const zoneData = useMemo(() => {
    const map = new Map<string, { total: number; missing: number; accounted: number; unverified: number; people: EvacuationParticipant[] }>();

    for (const z of ZONE_LAYOUTS) {
      map.set(z.id, { total: 0, missing: 0, accounted: 0, unverified: 0, people: [] });
    }

    let unmapped = { total: 0, missing: 0, accounted: 0, unverified: 0, people: [] as EvacuationParticipant[] };

    for (const p of participants) {
      if (p.headcountStatus === 'NOT_EXPECTED') continue;
      const zoneId = matchZone(p.lastKnownZone);
      if (zoneId && map.has(zoneId)) {
        const d = map.get(zoneId)!;
        d.total++;
        d.people.push(p);
        if (p.headcountStatus === 'MISSING') d.missing++;
        else if (p.headcountStatus === 'ACCOUNTED_FOR') d.accounted++;
        else if (p.headcountStatus === 'UNVERIFIED') d.unverified++;
      } else {
        unmapped.total++;
        unmapped.people.push(p);
        if (p.headcountStatus === 'MISSING') unmapped.missing++;
      }
    }

    return { map, unmapped };
  }, [participants]);

  const totalMissing = participants.filter(p => p.headcountStatus === 'MISSING').length;
  const totalAccounted = participants.filter(p => p.headcountStatus === 'ACCOUNTED_FOR').length;

  return (
    <div className="building-map-wrapper">
      <div className="map-header">
        <h3 className="map-title">Live Building Map</h3>
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-dot legend-dot-missing" />
            Missing ({totalMissing})
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot-accounted" />
            Safe ({totalAccounted})
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-dot-unverified" />
            Unverified
          </span>
          <span className="legend-heat" aria-hidden="true">
            <span className="heat-gradient" />
            Heatmap: missing density
          </span>
        </div>
      </div>

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
                    const data = zoneData.map.get(zone.id);
                    const intensity = data ? heatIntensity(data.missing, data.total) : 0;
                    const isHovered = hoveredZone === zone.id;
                    const peopleInZone = data?.people || [];

                    return (
                      <div
                        key={zone.id}
                        className={clsx(
                          'zone-block',
                          zone.type === 'gate' ? 'zone-gate' : 'zone-room',
                          isHovered && 'zone-hovered',
                          data && data.missing > 0 && 'zone-has-missing'
                        )}
                        style={{
                          left: `${zone.x}%`,
                          top: `${zone.y}%`,
                          width: `${zone.w}%`,
                          height: `${zone.h}%`,
                          '--heat-intensity': intensity,
                          '--heat-color': `rgba(239, 68, 68, ${intensity * 0.35})`,
                        } as React.CSSProperties}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                        role="region"
                        aria-label={`${zone.name}: ${data?.missing || 0} missing, ${data?.accounted || 0} safe`}
                      >
                        <div className="zone-heat-overlay" />
                        <div className="zone-content">
                          <span className="zone-label">{zone.shortName}</span>
                          {data && data.total > 0 && (
                            <span className="zone-count">
                              {data.missing > 0 && <span className="zc-missing">{data.missing}</span>}
                              {data.accounted > 0 && <span className="zc-safe">{data.accounted}</span>}
                            </span>
                          )}
                        </div>

                        {/* People dots */}
                        <div className="zone-dots">
                          {peopleInZone.slice(0, 20).map((p, i) => {
                            const col = Math.floor(i % 5);
                            const row = Math.floor(i / 5);
                            return (
                              <span
                                key={p.empId}
                                className={clsx('person-dot', `dot-${p.headcountStatus.toLowerCase()}`)}
                                style={{
                                  left: `${15 + col * 18}%`,
                                  top: `${30 + row * 20}%`,
                                }}
                                title={`${p.empName} — ${p.headcountStatus === 'ACCOUNTED_FOR' ? 'Safe' : p.headcountStatus === 'MISSING' ? 'Missing' : p.headcountStatus}`}
                              />
                            );
                          })}
                          {peopleInZone.length > 20 && (
                            <span className="dots-overflow">+{peopleInZone.length - 20}</span>
                          )}
                        </div>

                        {/* Tooltip */}
                        {isHovered && data && (
                          <div className="zone-tooltip">
                            <strong>{zone.name}</strong>
                            <div className="tooltip-stats">
                              <span>{data.total} people</span>
                              {data.missing > 0 && <span className="tt-missing">{data.missing} missing</span>}
                              {data.accounted > 0 && <span className="tt-safe">{data.accounted} safe</span>}
                              {data.unverified > 0 && <span className="tt-unverified">{data.unverified} unverified</span>}
                            </div>
                            {data.people.slice(0, 5).map(p => (
                              <div key={p.empId} className="tooltip-person">
                                <span className={clsx('tp-dot', `dot-${p.headcountStatus.toLowerCase()}`)} />
                                {p.empName}
                              </div>
                            ))}
                            {data.people.length > 5 && (
                              <div className="tooltip-more">+{data.people.length - 5} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Floor grid lines */}
                  <div className="floor-grid" aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {zoneData.unmapped.total > 0 && (
        <div className="unmapped-bar">
          <span className="unmapped-label">No location data</span>
          <span className="unmapped-count">{zoneData.unmapped.missing} missing / {zoneData.unmapped.total} total</span>
          <div className="unmapped-dots">
            {zoneData.unmapped.people.slice(0, 12).map(p => (
              <span
                key={p.empId}
                className={clsx('person-dot', `dot-${p.headcountStatus.toLowerCase()}`)}
                title={p.empName}
              />
            ))}
            {zoneData.unmapped.total > 12 && <span className="dots-overflow">+{zoneData.unmapped.total - 12}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

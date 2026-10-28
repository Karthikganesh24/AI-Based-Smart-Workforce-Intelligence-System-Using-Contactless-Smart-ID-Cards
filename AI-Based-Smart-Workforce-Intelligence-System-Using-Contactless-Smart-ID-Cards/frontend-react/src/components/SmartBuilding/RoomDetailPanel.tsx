import { Card, Badge } from '@components/UI';
import type { SmartRoomData } from '@data/smartBuildingData';
import { EnergyGauge } from './EnergyGauge';
import { FanIcon, LightbulbIcon, SnowflakeIcon, LeafIcon } from './SmartBuildingIcons';

interface RoomDetailPanelProps {
  room: SmartRoomData;
  viewMode: 'hvac' | 'lighting';
  onClose: () => void;
}

function modeVariant(mode: string): 'success' | 'warning' | 'error' {
  if (mode === 'cooling' || mode === 'full') return 'success';
  if (mode === 'eco' || mode === 'dimmed') return 'warning';
  return 'error';
}

function modeIcon(mode: string) {
  if (mode === 'cooling') return <SnowflakeIcon size={12} />;
  if (mode === 'eco') return <LeafIcon size={12} />;
  return null;
}

export const RoomDetailPanel = ({ room, viewMode, onClose }: RoomDetailPanelProps) => {
  const { hvac, lighting } = room;
  const occText = `${room.count} of ${room.capacity} people`;

  return (
    <Card variant="elevated" className="sb-detail-panel">
      <div className="sb-detail-header">
        <div>
          <h3 className="sb-detail-title">{room.name}</h3>
          <span className="sb-detail-subtitle">Floor {room.floor} · {room.type}</span>
        </div>
        <button className="sb-detail-close" onClick={onClose} aria-label="Close panel">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4L12 12M12 4L4 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {viewMode === 'hvac' ? (
        <div className="sb-detail-body">
          <div className="sb-detail-gauge-wrap">
            <EnergyGauge
              value={hvac.currentTemp}
              max={35}
              label="Temperature"
              unit="°C"
              colorStart="#3b82f6"
              colorEnd="#ef4444"
              size={140}
            />
          </div>
          <div className="sb-detail-meta">
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Mode</span>
              <Badge variant={modeVariant(hvac.mode)} size="sm">
                {modeIcon(hvac.mode)} {hvac.mode}
              </Badge>
            </div>
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Setpoint</span>
              <span className="sb-detail-row-value">{hvac.setpoint}°C</span>
            </div>
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Fan Speed</span>
              <div className="sb-fan-bar-wrap">
                <FanIcon size={14} />
                <div className="sb-fan-bar">
                  <div className="sb-fan-bar-fill" style={{ width: `${hvac.fanSpeed}%` }} />
                </div>
                <span className="sb-fan-pct">{hvac.fanSpeed}%</span>
              </div>
            </div>
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Energy</span>
              <span className="sb-detail-row-value">{hvac.energyKw} kW</span>
            </div>
          </div>
          <div className="sb-detail-occ-context">
            {occText} — <strong>{hvac.mode}</strong> mode
          </div>
        </div>
      ) : (
        <div className="sb-detail-body">
          <div className="sb-detail-gauge-wrap">
            <EnergyGauge
              value={lighting.brightness}
              max={100}
              label="Brightness"
              unit="%"
              colorStart="#78716c"
              colorEnd="#fbbf24"
              size={140}
            />
          </div>
          <div className="sb-detail-meta">
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Mode</span>
              <Badge variant={modeVariant(lighting.mode)} size="sm">
                <LightbulbIcon size={12} /> {lighting.mode}
              </Badge>
            </div>
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Light Zones</span>
              <span className="sb-detail-row-value">{lighting.zonesActive} of {lighting.zonesTotal} lit</span>
            </div>
            <div className="sb-detail-row">
              <span className="sb-detail-row-label">Energy</span>
              <span className="sb-detail-row-value">{lighting.energyKw} kW</span>
            </div>
          </div>
          <div className="sb-detail-occ-context">
            {occText} — <strong>{lighting.mode}</strong> mode
          </div>
        </div>
      )}
    </Card>
  );
};

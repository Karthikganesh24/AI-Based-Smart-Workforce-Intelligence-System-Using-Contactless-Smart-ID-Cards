import { useState, useMemo } from 'react';
import { Card } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import { BuildingMap3D } from '@components/SmartBuilding/BuildingMap3D';
import { RoomDetailPanel } from '@components/SmartBuilding/RoomDetailPanel';
import { getSmartRooms } from '@data/smartBuildingData';
import type { SmartRoomData } from '@data/smartBuildingData';
import clsx from 'clsx';
import './SmartBuilding.css';

export const SmartBuilding = () => {
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<SmartRoomData | null>(null);
  const [viewMode, setViewMode] = useState<'hvac' | 'lighting'>('hvac');

  const rooms = useMemo(() => getSmartRooms(), []);

  const totalHvacEnergy = useMemo(() => rooms.reduce((s, r) => s + r.hvac.energyKw, 0), [rooms]);
  const totalLightEnergy = useMemo(() => rooms.reduce((s, r) => s + r.lighting.energyKw, 0), [rooms]);
  const totalEnergy = Math.round((totalHvacEnergy + totalLightEnergy) * 10) / 10;
  const activeRooms = rooms.filter(r => r.count > 0).length;
  const avgTemp = Math.round(rooms.reduce((s, r) => s + r.hvac.currentTemp, 0) / rooms.length * 10) / 10;

  const maxPossibleEnergy = rooms.length * 3.5;
  const savingsPercent = Math.round((1 - totalEnergy / maxPossibleEnergy) * 100);

  return (
    <div className="sb-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Smart Building</h1>
          <p className="page-subtitle">
            HVAC & Lighting Controls · <AnimatedNumber value={totalEnergy} decimals={1} /> kW total · {savingsPercent}% energy savings
          </p>
        </div>
      </header>

      <div className="sb-stats-row">
        <Card className="sb-stat-card">
          <div className="sb-stat-label">Total Energy</div>
          <div className="sb-stat-value"><AnimatedNumber value={totalEnergy} decimals={1} suffix=" kW" /></div>
        </Card>
        <Card className="sb-stat-card">
          <div className="sb-stat-label">Rooms Active</div>
          <div className="sb-stat-value"><AnimatedNumber value={activeRooms} /> <span className="sb-stat-dim">/ {rooms.length}</span></div>
        </Card>
        <Card className="sb-stat-card">
          <div className="sb-stat-label">Avg Temp</div>
          <div className="sb-stat-value"><AnimatedNumber value={avgTemp} decimals={1} suffix="°C" /></div>
        </Card>
        <Card className="sb-stat-card">
          <div className="sb-stat-label">Energy Savings</div>
          <div className="sb-stat-value sb-stat-savings"><AnimatedNumber value={savingsPercent} suffix="%" /></div>
        </Card>
      </div>

      <div className="sb-view-toggle">
        <button
          className={clsx('sb-toggle-btn', viewMode === 'hvac' && 'sb-toggle-active')}
          onClick={() => setViewMode('hvac')}
        >
          HVAC
        </button>
        <button
          className={clsx('sb-toggle-btn', viewMode === 'lighting' && 'sb-toggle-active')}
          onClick={() => setViewMode('lighting')}
        >
          Lighting
        </button>
      </div>

      <div className="sb-main-content">
        <BuildingMap3D
          rooms={rooms}
          viewMode={viewMode}
          selectedFloor={selectedFloor}
          setSelectedFloor={setSelectedFloor}
          hoveredZone={hoveredZone}
          setHoveredZone={setHoveredZone}
          selectedRoom={selectedRoom}
          setSelectedRoom={setSelectedRoom}
        />
        {selectedRoom && (
          <div className="sb-panel-slide">
            <RoomDetailPanel
              room={selectedRoom}
              viewMode={viewMode}
              onClose={() => setSelectedRoom(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

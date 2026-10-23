import clsx from 'clsx';
import './OccupancyMeter.css';

interface OccupancyMeterProps {
  value: number;
  max?: number;
  animated?: boolean;
  gradient?: 'success' | 'warning' | 'danger';
  pulse?: boolean;
}

export const OccupancyMeter = ({
  value,
  max = 100,
  animated = true,
  gradient = 'success',
  pulse = false,
}: OccupancyMeterProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="occupancy-meter">
      <div className="meter-track">
        <div
          className={clsx(
            'meter-fill',
            `meter-${gradient}`,
            animated && 'meter-animated',
            pulse && 'meter-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="meter-label">
        <span className="meter-value">{value}</span>
        <span className="meter-max">/ {max}</span>
        <span className="meter-percentage">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
};

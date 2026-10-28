import { AnimatedNumber } from '@components/Animations';

interface EnergyGaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  colorStart: string;
  colorEnd: string;
  size?: number;
}

export const EnergyGauge = ({
  value,
  max,
  label,
  unit,
  colorStart,
  colorEnd,
  size = 140,
}: EnergyGaugeProps) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const startAngle = 135;
  const endAngle = 405;
  const totalArc = endAngle - startAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (angleDeg: number) => {
    const rad = toRad(angleDeg);
    return `${cx + radius * Math.cos(rad)} ${cy + radius * Math.sin(rad)}`;
  };

  const circumference = (totalArc / 360) * 2 * Math.PI * radius;
  const fraction = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - fraction);

  const gradId = `gauge-grad-${label.replace(/\s/g, '-')}`;

  return (
    <div className="sb-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        <path
          d={`M ${arcPath(startAngle)} A ${radius} ${radius} 0 1 1 ${arcPath(endAngle)}`}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${arcPath(startAngle)} A ${radius} ${radius} 0 1 1 ${arcPath(endAngle)}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="sb-gauge-center">
        <span className="sb-gauge-value">
          <AnimatedNumber value={value} decimals={unit === 'C' ? 1 : 0} />
          <span className="sb-gauge-unit">{unit}</span>
        </span>
        <span className="sb-gauge-label">{label}</span>
      </div>
    </div>
  );
};

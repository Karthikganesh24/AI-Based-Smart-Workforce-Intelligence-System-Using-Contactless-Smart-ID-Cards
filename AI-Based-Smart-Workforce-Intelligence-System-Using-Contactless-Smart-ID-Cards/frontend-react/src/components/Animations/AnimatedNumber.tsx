interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
}

export const AnimatedNumber = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
}: AnimatedNumberProps) => {
  return (
    <span>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
};

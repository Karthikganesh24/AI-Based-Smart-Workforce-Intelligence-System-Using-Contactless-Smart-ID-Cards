import clsx from 'clsx';
import './Spinner.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const Spinner = ({ size = 'md', color, className }: SpinnerProps) => {
  return (
    <div
      className={clsx('spinner', `spinner-${size}`, className)}
      style={color ? { borderTopColor: color } : undefined}
    />
  );
};

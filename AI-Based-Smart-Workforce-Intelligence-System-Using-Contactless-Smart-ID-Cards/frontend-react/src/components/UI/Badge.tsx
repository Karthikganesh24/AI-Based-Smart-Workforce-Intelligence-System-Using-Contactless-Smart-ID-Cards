import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import './Badge.css';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: ReactNode;
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  glow = false,
  className,
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={clsx(
        'badge',
        `badge-${variant}`,
        `badge-${size}`,
        glow && 'badge-glow',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

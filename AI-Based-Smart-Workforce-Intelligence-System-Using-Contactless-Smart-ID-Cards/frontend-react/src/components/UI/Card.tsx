import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import './Card.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  hover?: boolean;
  glow?: boolean;
  children: ReactNode;
}

export const Card = ({
  variant = 'default',
  hover = false,
  glow = false,
  className,
  children,
  ...props
}: CardProps) => {
  return (
    <div
      className={clsx(
        'card',
        `card-${variant}`,
        hover && 'card-hover',
        glow && 'card-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

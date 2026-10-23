import type { ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

interface SlideInProps {
  children: ReactNode;
  show?: boolean;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
}

export const SlideIn = ({
  children,
  show = true,
  direction = 'up',
  delay = 0,
}: SlideInProps) => {
  return (
    <CSSTransition
      in={show}
      timeout={300}
      classNames={`slide-${direction}`}
      appear
      unmountOnExit
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </CSSTransition>
  );
};

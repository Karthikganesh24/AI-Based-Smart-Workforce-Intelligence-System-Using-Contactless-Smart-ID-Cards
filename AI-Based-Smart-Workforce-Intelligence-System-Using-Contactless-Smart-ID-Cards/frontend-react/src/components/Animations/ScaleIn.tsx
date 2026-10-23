import type { ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

interface ScaleInProps {
  children: ReactNode;
  show?: boolean;
  delay?: number;
}

export const ScaleIn = ({ children, show = true, delay = 0 }: ScaleInProps) => {
  return (
    <CSSTransition
      in={show}
      timeout={300}
      classNames="scale"
      appear
      unmountOnExit
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </CSSTransition>
  );
};

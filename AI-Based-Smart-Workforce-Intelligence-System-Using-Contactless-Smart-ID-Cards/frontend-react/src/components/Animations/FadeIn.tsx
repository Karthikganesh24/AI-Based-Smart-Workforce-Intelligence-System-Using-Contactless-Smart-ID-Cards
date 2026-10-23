import type { ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

interface FadeInProps {
  children: ReactNode;
  show?: boolean;
  delay?: number;
}

export const FadeIn = ({ children, show = true, delay = 0 }: FadeInProps) => {
  return (
    <CSSTransition
      in={show}
      timeout={300}
      classNames="fade"
      appear
      unmountOnExit
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </CSSTransition>
  );
};

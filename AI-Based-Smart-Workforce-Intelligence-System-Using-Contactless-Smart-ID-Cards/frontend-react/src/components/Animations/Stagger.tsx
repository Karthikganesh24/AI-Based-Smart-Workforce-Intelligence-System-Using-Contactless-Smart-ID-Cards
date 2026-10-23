import { Children } from 'react';
import type { ReactNode } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface StaggerProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const Stagger = ({
  children,
  staggerDelay = 50,
  className,
}: StaggerProps) => {
  const childArray = Children.toArray(children);

  return (
    <TransitionGroup className={className}>
      {childArray.map((child, index) => (
        <CSSTransition
          key={index}
          timeout={500}
          classNames="fade-scale"
          appear
        >
          <div style={{ transitionDelay: `${index * staggerDelay}ms` }}>
            {child}
          </div>
        </CSSTransition>
      ))}
    </TransitionGroup>
  );
};

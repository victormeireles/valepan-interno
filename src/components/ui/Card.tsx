'use client';

import { useState, type HTMLAttributes, type JSX } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  as?: keyof JSX.IntrinsicElements;
}

const paddingClass = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className = '',
  ...rest
}: CardProps) {
  const [hover, setHover] = useState(false);

  const Component = Tag as 'div';

  return (
    <Component
      onMouseEnter={interactive ? () => setHover(true) : undefined}
      onMouseLeave={interactive ? () => setHover(false) : undefined}
      className={[
        'rounded-xl border bg-surface transition-[box-shadow,border-color] duration-[180ms] ease-out',
        interactive && hover
          ? 'border-stone-300 shadow-md'
          : 'border-border-default shadow-control',
        paddingClass[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Component>
  );
}

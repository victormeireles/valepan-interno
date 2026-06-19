'use client';

import { useState, type ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: string;
}

export function Chip({
  children,
  active = false,
  icon,
  className = '',
  ...rest
}: ChipProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      className={[
        'inline-flex h-[2.125rem] items-center gap-1.5 rounded-full px-3.5',
        'text-[0.8125rem] font-medium tracking-[-0.004em]',
        'transition-[background,border-color,color,box-shadow,transform] duration-[130ms] ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
        active
          ? 'border-amber-300/90 bg-amber-100 text-amber-800'
          : hover
            ? 'border-stone-300 bg-stone-50 text-text-muted shadow-control'
            : 'border-border-default bg-surface text-text-muted',
        press ? 'translate-y-px' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span className="material-icons text-base" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

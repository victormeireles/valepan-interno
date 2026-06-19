'use client';

import { useState, type ButtonHTMLAttributes } from 'react';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: string;
  label: string;
  variant?: 'ghost' | 'solid' | 'surface';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'h-[1.875rem] w-[1.875rem] [&_.material-icons]:text-[17px]',
  md: 'h-9 w-9 [&_.material-icons]:text-[19px]',
  lg: 'min-h-11 min-w-11 [&_.material-icons]:text-[22px]',
};

const variantClass = {
  ghost: {
    base: 'border-transparent bg-transparent text-text-muted',
    hover: 'bg-stone-100 text-stone-700',
    shadow: '',
  },
  surface: {
    base: 'border-border-default bg-surface text-stone-700 shadow-control',
    hover: 'bg-stone-50 text-stone-700',
    shadow: 'shadow-control',
  },
  solid: {
    base: 'border-amber-700/70 bg-accent text-white shadow-accent',
    hover: 'bg-accent-hover text-white',
    shadow: 'shadow-accent',
  },
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = '',
  ...rest
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const v = variantClass[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      className={[
        'inline-flex items-center justify-center rounded-[9px] border',
        'transition-[background,color,box-shadow,transform] duration-[130ms] ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass[size],
        hover && !disabled ? v.hover : v.base,
        v.shadow,
        press && !disabled ? 'translate-y-px' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className="material-icons" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}

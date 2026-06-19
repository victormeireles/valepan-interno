'use client';

import { useState, type ButtonHTMLAttributes, type CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'vinho' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconTrailing?: string;
  fullWidth?: boolean;
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[0.8125rem] [&_.material-icons]:text-base',
  md: 'h-[2.375rem] gap-[0.4375rem] px-3.5 text-sm [&_.material-icons]:text-[17px]',
  lg: 'h-11 gap-2 px-[1.125rem] text-sm [&_.material-icons]:text-lg',
};

type VariantConfig = {
  solid: boolean;
  className: string;
  style: CSSProperties;
  hoverStyle?: CSSProperties;
  pressShadow?: string;
};

function getVariantConfig(variant: ButtonVariant, hover: boolean): VariantConfig {
  const sheen = 'inset 0 1px 0 rgb(255 255 255 / 0.16)';

  switch (variant) {
    case 'primary':
      return {
        solid: true,
        className: 'border border-amber-700/55 text-white shadow-accent',
        style: {
          backgroundImage: hover
            ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-hover) 100%)'
            : 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, white) 0%, var(--accent) 100%)',
          boxShadow: hover
            ? `var(--shadow-accent-hover), ${sheen}`
            : `var(--shadow-accent), ${sheen}`,
        },
        pressShadow: 'var(--shadow-control)',
      };
    case 'vinho':
      return {
        solid: true,
        className: 'border border-[#2c0210]/60 text-white',
        style: {
          backgroundImage: hover
            ? 'linear-gradient(180deg, #3f0313 0%, #2c0210 100%)'
            : 'linear-gradient(180deg, color-mix(in srgb, #3f0313 85%, white) 0%, #3f0313 100%)',
          boxShadow: hover
            ? '0 2px 4px rgb(63 3 19 / 0.36), 0 4px 11px -2px rgb(63 3 19 / 0.3), inset 0 1px 0 rgb(255 255 255 / 0.18)'
            : '0 1px 2px rgb(63 3 19 / 0.32), 0 2px 7px -2px rgb(63 3 19 / 0.24), inset 0 1px 0 rgb(255 255 255 / 0.18)',
        },
        pressShadow: 'var(--shadow-control)',
      };
    case 'danger':
      return {
        solid: true,
        className: 'border border-red-700/65 text-white',
        style: {
          backgroundImage: hover
            ? 'linear-gradient(180deg, var(--danger) 0%, #b91c1c 100%)'
            : 'linear-gradient(180deg, color-mix(in srgb, var(--danger) 88%, white) 0%, var(--danger) 100%)',
          boxShadow: hover
            ? '0 2px 4px rgb(153 27 27 / 0.32), 0 4px 11px -2px rgb(153 27 27 / 0.26), inset 0 1px 0 rgb(255 255 255 / 0.18)'
            : '0 1px 2px rgb(153 27 27 / 0.28), 0 2px 7px -2px rgb(153 27 27 / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.18)',
        },
        pressShadow: 'var(--shadow-control)',
      };
    case 'secondary':
      return {
        solid: false,
        className: hover
          ? 'border-stone-300 bg-stone-50 text-stone-700 shadow-control'
          : 'border-border-default bg-surface text-stone-700 shadow-control',
        style: {},
        pressShadow: 'none',
      };
    case 'ghost':
      return {
        solid: false,
        className: hover
          ? 'border-transparent bg-stone-100 text-stone-700'
          : 'border-transparent bg-transparent text-stone-700',
        style: {},
        pressShadow: 'none',
      };
    default:
      return getVariantConfig('primary', hover);
  }
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconTrailing,
  fullWidth = false,
  disabled = false,
  type = 'button',
  className = '',
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  const v = getVariantConfig(variant, hover && !disabled);
  const weight = 'font-medium';

  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      className={[
        'inline-flex items-center justify-center rounded-[9px] tracking-[-0.006em]',
        'transition-[background,box-shadow,border-color,transform] duration-[130ms] ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass[size],
        weight,
        v.className,
        fullWidth ? 'w-full' : '',
        press && !disabled ? 'translate-y-px' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...v.style,
        ...(press && !disabled && v.pressShadow ? { boxShadow: v.pressShadow } : {}),
        ...style,
      }}
      {...rest}
    >
      {icon ? (
        <span className="material-icons" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {iconTrailing ? (
        <span className="material-icons" aria-hidden="true">
          {iconTrailing}
        </span>
      ) : null}
    </button>
  );
}

import type { HTMLAttributes } from 'react';

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'outline'
  | 'vinho';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  pill?: boolean;
  icon?: string;
  numeric?: boolean;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700 border-transparent',
  accent: 'bg-amber-100 text-amber-800 border-transparent',
  success: 'bg-success-bg text-success-fg border-transparent',
  danger: 'bg-danger-bg text-danger-fg border-transparent',
  warning: 'bg-warning-bg text-warning-fg border-transparent',
  outline: 'bg-surface text-text-muted border-border-default',
  vinho: 'bg-[#3f0313] text-white border-transparent',
};

export function Badge({
  children,
  tone = 'neutral',
  pill = true,
  icon,
  numeric = false,
  className = '',
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 whitespace-nowrap border px-2 py-0.5',
        'text-xs font-medium leading-snug',
        pill ? 'rounded-full' : 'rounded-md',
        numeric ? 'font-mono tabular-nums' : '',
        toneClass[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon ? (
        <span className="material-icons text-sm" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

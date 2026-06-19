import type { CSSProperties, ReactNode } from 'react';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  meta?: ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'danger' | 'vinho';
  icon?: string;
  style?: CSSProperties;
}

const toneClass = {
  default: 'text-text-strong',
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  vinho: 'text-[#3f0313]',
} as const;

export function StatTile({
  label,
  value,
  unit,
  meta,
  tone = 'default',
  icon,
  style,
}: StatTileProps) {
  return (
    <div
      style={style}
      className="flex flex-col gap-1 rounded-xl border border-border-default bg-surface px-5 py-4 shadow-control"
    >
      <div className="flex items-center gap-1.5">
        {icon ? (
          <span className="material-icons text-lg text-text-muted" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={[
            'font-mono text-4xl font-bold leading-none tabular-nums tracking-[-0.02em]',
            toneClass[tone],
          ].join(' ')}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-sm font-medium text-text-muted">{unit}</span>
        ) : null}
      </div>
      {meta ? <span className="text-xs text-text-muted">{meta}</span> : null}
    </div>
  );
}

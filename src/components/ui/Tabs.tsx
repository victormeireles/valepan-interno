'use client';

import type { CSSProperties } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange?: (id: string) => void;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
  tabIdPrefix?: string;
  panelId?: string;
}

export function Tabs({
  tabs,
  value,
  onChange,
  style,
  className = '',
  ariaLabel,
  tabIdPrefix,
  panelId,
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={style}
      className={['inline-flex gap-1 rounded-xl bg-stone-100 p-1', className]
        .filter(Boolean)
        .join(' ')}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        const tabDomId = tabIdPrefix ? `${tabIdPrefix}-${t.id}` : undefined;

        return (
          <button
            key={t.id}
            id={tabDomId}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            onClick={() => onChange?.(t.id)}
            className={[
              'inline-flex min-h-9 min-w-11 items-center gap-1.5 rounded-[9px] px-3.5',
              'text-sm font-medium tracking-[-0.004em] transition-[background,color,box-shadow,border-color] duration-[130ms]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              active
                ? 'border border-border-default bg-surface text-text-strong shadow-control'
                : 'border border-transparent bg-transparent text-text-muted hover:text-stone-700',
            ].join(' ')}
          >
            {t.label}
            {t.count != null ? (
              <span
                className={[
                  'font-mono tabular-nums',
                  active ? 'text-text-muted' : 'text-stone-400',
                ].join(' ')}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

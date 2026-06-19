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
}

export function Tabs({ tabs, value, onChange, style }: TabsProps) {
  return (
    <div
      role="tablist"
      style={style}
      className="inline-flex gap-1 rounded-xl bg-stone-100 p-1"
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.id)}
            className={[
              'inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-3.5',
              'text-sm font-medium tracking-[-0.004em] transition-[background,color,box-shadow,border-color] duration-[130ms]',
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

'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

export interface ListRowColumn {
  value: ReactNode;
  width?: string;
  emphasize?: boolean;
}

export interface ListRowProps {
  index?: number | string;
  draggable?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  columns?: ListRowColumn[];
  menu?: ReactNode;
  onClick?: () => void;
  even?: boolean;
  dragging?: boolean;
  style?: CSSProperties;
}

export function ListRow({
  index,
  draggable = false,
  title,
  subtitle,
  columns = [],
  menu,
  onClick,
  even = false,
  dragging = false,
  style,
}: ListRowProps) {
  const [hover, setHover] = useState(false);

  const rowBg = dragging
    ? 'bg-surface shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)] rounded-xl'
    : hover
      ? 'bg-amber-50/60'
      : even
        ? 'bg-stone-50/60'
        : 'bg-surface';

  return (
    <div
      style={style}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={[
        'flex items-center gap-3 border-b border-stone-100 px-3 py-2',
        'transition-[background,box-shadow] duration-[120ms]',
        rowBg,
      ].join(' ')}
    >
      {draggable ? (
        <span
          className="material-icons shrink-0 cursor-grab text-xl text-stone-400"
          aria-hidden="true"
        >
          drag_indicator
        </span>
      ) : null}

      {index != null ? (
        <span className="w-6 shrink-0 text-center font-mono text-xs font-semibold tabular-nums text-stone-400">
          {index}
        </span>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        className={[
          'min-w-0 flex-1 border-none bg-transparent p-0 text-left',
          onClick ? 'cursor-pointer' : 'cursor-default',
        ].join(' ')}
      >
        <span className="block truncate text-sm font-semibold tracking-[-0.004em] text-text-strong">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-text-muted">{subtitle}</span>
        ) : null}
      </button>

      {columns.map((c, i) => {
        const empty = c.value == null || c.value === '';
        return (
          <span
            key={i}
            style={{ width: c.width ?? '3.5rem' }}
            className={[
              'shrink-0 text-right font-mono text-sm tabular-nums',
              empty
                ? 'text-stone-400'
                : c.emphasize
                  ? 'font-semibold text-text-strong'
                  : 'text-stone-700',
            ].join(' ')}
          >
            {empty ? '—' : c.value}
          </span>
        );
      })}

      {menu ? <div className="shrink-0">{menu}</div> : null}
    </div>
  );
}

'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

export interface ListRowColumn {
  value: ReactNode;
  width?: string;
  emphasize?: boolean;
  align?: 'left' | 'right';
  tabular?: boolean;
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
        'flex min-w-0 flex-col gap-2 border-b border-stone-100 px-3 py-2.5',
        'md:flex-row md:items-center md:gap-3 md:py-2',
        'transition-[background,box-shadow] duration-[120ms]',
        rowBg,
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-3 md:contents">
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
            'min-h-11 min-w-0 flex-1 border-none bg-transparent py-1 text-left',
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

        {menu ? <div className="shrink-0 md:hidden">{menu}</div> : null}
      </div>

      {columns.length > 0 ? (
        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 md:contents">
          {columns.map((column, i) => (
            <ListRowColumnCell key={i} column={column} />
          ))}
        </div>
      ) : null}

      {menu ? <div className="hidden shrink-0 md:block">{menu}</div> : null}
    </div>
  );
}

function ListRowColumnCell({ column }: { column: ListRowColumn }) {
  const empty = column.value == null || column.value === '';
  const align = column.align === 'left' ? 'text-left' : 'text-right';
  const typeface =
    column.tabular === false ? 'font-sans text-sm' : 'font-mono text-sm tabular-nums';

  return (
    <span
      style={{ width: column.width ?? '3.5rem' }}
      className={[
        'min-w-0 max-md:!w-auto',
        'md:shrink-0',
        align,
        typeface,
        empty
          ? 'text-stone-400'
          : column.emphasize
            ? 'font-semibold text-text-strong'
            : 'text-stone-700',
      ].join(' ')}
    >
      {empty ? '—' : column.value}
    </span>
  );
}

'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';

export interface AccordionProps {
  title: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Accordion({
  title,
  summary,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  icon,
  children,
  style,
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const toggle = () => {
    const next = !open;
    if (openProp === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div
      style={style}
      className="overflow-hidden rounded-xl border border-border-default bg-surface"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className={[
          'flex min-h-11 w-full items-center gap-2 px-4 text-left',
          'transition-colors duration-[130ms]',
          open
            ? 'border-b border-stone-100 bg-stone-50'
            : 'border-b border-transparent bg-surface',
        ].join(' ')}
      >
        <span
          className={[
            'material-icons text-xl text-text-muted transition-transform duration-[130ms]',
            open ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
          aria-hidden="true"
        >
          expand_more
        </span>
        {icon ? (
          <span className="material-icons text-lg text-accent" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="text-sm font-semibold tracking-[-0.004em] text-text-strong">
          {title}
        </span>
        {summary != null ? (
          <span className="ml-auto font-mono text-xs tabular-nums text-text-muted">
            {summary}
          </span>
        ) : null}
      </button>
      {open ? <div>{children}</div> : null}
    </div>
  );
}

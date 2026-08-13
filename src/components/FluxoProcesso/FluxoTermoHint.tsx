'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type FluxoTermoHintProps = {
  label: string;
  title: string;
  children: ReactNode;
};

/**
 * Termo com ajuda clicável (touch-friendly; não depende só de hover).
 */
export default function FluxoTermoHint({ label, title, children }: FluxoTermoHintProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex max-w-full items-center gap-0.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className={[
          'inline-flex min-h-8 max-w-full items-center gap-0.5 rounded-md px-1',
          'border-none bg-transparent text-left font-inherit text-inherit',
          'underline decoration-dotted decoration-stone-400 underline-offset-2',
          'cursor-pointer hover:bg-stone-100/80 focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1',
        ].join(' ')}
      >
        <span className="truncate">{label}</span>
        <span className="material-icons text-[14px] text-text-muted" aria-hidden>
          info
        </span>
      </button>
      {open ? (
        <span
          id={panelId}
          role="note"
          className={[
            'absolute bottom-[calc(100%+6px)] left-0 z-30 w-[min(280px,calc(100vw-2rem))]',
            'rounded-xl border border-border-default bg-surface p-3 shadow-md',
            'text-[12px] leading-snug font-normal text-text-body normal-case tracking-normal',
          ].join(' ')}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {title}
          </span>
          {children}
        </span>
      ) : null}
    </span>
  );
}

'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';

export const CONSUMO_DIA_UTIL_AJUDA =
  'Média por dia útil (semana = 5,5 dias). Domingo não conta; sábado conta meio.';

type Props = {
  align?: 'start' | 'end';
};

export default function InsumoCompraConsumoDiaHint({ align = 'start' }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open || !rootRef.current) return undefined;
    setPanelStyle(buildPanelStyle(rootRef.current.getBoundingClientRect(), align));
    return bindDismissListeners(rootRef, setOpen);
  }, [align, open]);

  return (
    <span
      ref={rootRef}
      className={`inline-flex items-center gap-0.5 ${align === 'end' ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => {
        if (deviceHasHover()) setOpen(true);
      }}
      onMouseLeave={() => {
        if (deviceHasHover()) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="O que é consumo por dia"
        onClick={(event) => {
          event.stopPropagation();
          if (!deviceHasHover()) setOpen((value) => !value);
        }}
        className="inline-flex items-center gap-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide text-stone-500 hover:text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        Consumo/dia
        <span className="material-icons text-[13px] leading-none text-stone-400" aria-hidden="true">
          info_outline
        </span>
      </button>
      {open ? (
        <span
          id={panelId}
          role="note"
          style={panelStyle}
          className="rounded-xl border border-stone-200 bg-white p-3 text-left text-xs font-normal normal-case leading-snug tracking-normal text-stone-700 shadow-md"
        >
          {CONSUMO_DIA_UTIL_AJUDA}
        </span>
      ) : null}
    </span>
  );
}

function deviceHasHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function buildPanelStyle(box: DOMRect, align: 'start' | 'end'): CSSProperties {
  const width = Math.min(280, window.innerWidth - 16);
  const left =
    align === 'end'
      ? Math.max(8, box.right - width)
      : Math.min(box.left, window.innerWidth - width - 8);
  return { position: 'fixed', top: box.bottom + 6, left, width, zIndex: 40 };
}

function bindDismissListeners(
  rootRef: RefObject<HTMLSpanElement | null>,
  setOpen: (open: boolean) => void,
): () => void {
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
}

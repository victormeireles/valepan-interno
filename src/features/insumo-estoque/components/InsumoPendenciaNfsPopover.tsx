'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import InsumoPendenciaNfDetalheLista from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheLista';

type Props = {
  grupo: InsumoPendenciaProdutoGrupo;
};

export default function InsumoPendenciaNfsPopover({ grupo }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const label =
    grupo.nfsDistintas === 1
      ? 'Ver 1 nota fiscal'
      : `Ver ${grupo.nfsDistintas} notas fiscais`;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className={[
          'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5',
          'font-mono text-sm tabular-nums transition-colors duration-150',
          open
            ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-500/30'
            : 'text-stone-700 hover:bg-amber-50 hover:text-amber-900',
        ].join(' ')}
      >
        <span className="material-icons text-base" aria-hidden="true">
          receipt_long
        </span>
        {grupo.nfsDistintas}
        <span className="material-icons text-base text-stone-400" aria-hidden="true">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Detalhes das notas fiscais"
          className="absolute right-0 top-full z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
        >
          <div className="border-b border-stone-100 bg-stone-50 px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Notas fiscais
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              {grupo.pendenciaCount} recebimento{grupo.pendenciaCount === 1 ? '' : 's'} •{' '}
              {grupo.nfsDistintas} NF{grupo.nfsDistintas === 1 ? '' : 's'}
            </p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            <InsumoPendenciaNfDetalheLista
              pendencias={grupo.pendencias}
              unidadeNf={grupo.unidadeNf}
              mostrarFornecedor={grupo.contexto.fornecedoresDistintos !== 1}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';

type Props = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  amplo?: boolean;
  largo?: boolean;
  children: ReactNode;
};

export function PainelAcao({ aberto, titulo, onFechar, amplo = false, largo = false, children }: Props) {
  useEffect(() => {
    if (!aberto) return;
    const fechar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div className={amplo ? 'fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-3 sm:p-6' : 'fixed inset-0 z-50 flex justify-end bg-stone-900/40'} onClick={onFechar}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-acao-titulo"
        className={amplo
          ? 'flex max-h-[min(92dvh,56rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg'
          : `h-full w-full ${largo ? 'max-w-xl' : 'max-w-md'} overflow-y-auto border-l border-stone-200 bg-white p-6 shadow-lg`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={amplo ? 'flex items-center justify-between gap-3 border-b border-stone-100 px-6 py-4' : 'mb-5 flex items-center justify-between gap-3'}>
          <h2 id="painel-acao-titulo" className="text-xl font-semibold tracking-tight text-stone-900">
            {titulo}
          </h2>
          <IconButton icon="close" label="Fechar" size="lg" variant="ghost" onClick={onFechar} />
        </header>
        {amplo ? <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div> : children}
      </aside>
    </div>
  );
}

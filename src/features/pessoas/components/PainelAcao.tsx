'use client';

import { useEffect, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';

type Props = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  amplo?: boolean;
  largo?: boolean;
  rodape?: ReactNode;
  children: ReactNode;
};

export function PainelAcao({
  aberto,
  titulo,
  onFechar,
  amplo = false,
  largo = false,
  rodape,
  children,
}: Props) {
  useEffect(() => {
    if (!aberto) return;
    const fechar = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFechar();
    };
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fechar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', fechar);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className={
        amplo
          ? 'fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-0 sm:items-center sm:p-6'
          : 'fixed inset-0 z-50 flex justify-end bg-stone-900/40'
      }
      onClick={onFechar}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-acao-titulo"
        className={
          amplo
            ? [
                'flex w-full max-w-6xl flex-col overflow-hidden border-stone-200 bg-white shadow-lg',
                'max-h-[100dvh] rounded-t-2xl border sm:max-h-[min(92dvh,56rem)] sm:rounded-2xl',
                'pb-[env(safe-area-inset-bottom)]',
              ].join(' ')
            : [
                'flex h-full w-full max-w-[100vw] flex-col overflow-hidden border-l border-stone-200 bg-white shadow-lg',
                largo ? 'sm:max-w-xl' : 'sm:max-w-md',
                'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
              ].join(' ')
        }
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className={
            amplo
              ? 'flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-6'
              : 'mb-0 flex shrink-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-6'
          }
        >
          <h2 id="painel-acao-titulo" className="min-w-0 truncate text-lg font-semibold tracking-tight text-stone-900 sm:text-xl">
            {titulo}
          </h2>
          <IconButton icon="close" label="Fechar" size="lg" variant="ghost" onClick={onFechar} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {children}
        </div>
        {rodape ? (
          <div className="flex shrink-0 flex-col gap-2 border-t border-stone-100 bg-white px-4 py-3 sm:px-6">
            {rodape}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

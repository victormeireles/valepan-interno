'use client';

import { useId } from 'react';
import type { InsumoReceitaAssociacao } from '@/domain/receitas/insumo-receita-associacao';
import { Button } from '@/components/ui/Button';
import InsumoReceitasLista from '@/components/Insumos/InsumoReceitasLista';

type Props = {
  isOpen: boolean;
  insumoNome: string;
  receitas: InsumoReceitaAssociacao[];
  onClose: () => void;
};

export default function InsumoReceitasModal({
  isOpen,
  insumoNome,
  receitas,
  onClose,
}: Props) {
  const titleId = useId();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg">
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
          <div className="min-w-0 pr-3">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-stone-900">
              Receitas
            </h2>
            <p className="mt-0.5 truncate text-sm text-stone-600">{insumoNome}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-stone-500">
              {receitas.length} receita{receitas.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <InsumoReceitasLista receitas={receitas} />
        </div>

        <div className="border-t border-stone-100 px-5 py-3">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

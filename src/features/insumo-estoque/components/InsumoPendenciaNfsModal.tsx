'use client';

import { useEffect, useId, useState } from 'react';
import type { InsumoPendenciaNfsTarget } from '@/domain/insumos/insumo-pendencia-nfs-target';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import InsumoPendenciaNfDetalheLista from '@/features/insumo-estoque/components/InsumoPendenciaNfDetalheLista';
import { useInsumoPendenciaNfsQuery } from '@/features/insumo-estoque/hooks/useInsumoPendenciaNfsQuery';

type Props = {
  isOpen: boolean;
  target: InsumoPendenciaNfsTarget | null;
  onClose: () => void;
};

export default function InsumoPendenciaNfsModal({ isOpen, target, onClose }: Props) {
  const titleId = useId();
  const [animating, setAnimating] = useState(false);
  const { pendencias, loading, error, load, reset } = useInsumoPendenciaNfsQuery();

  useEffect(() => {
    if (isOpen && target) {
      setAnimating(true);
      void load(target);
      return;
    }

    if (!isOpen) {
      const timer = setTimeout(() => {
        setAnimating(false);
        reset();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, target, load, reset]);

  if ((!isOpen && !animating) || !target) return null;

  const mostrarFornecedor = target.contexto.fornecedoresDistintos !== 1;
  const titulo = target.descricaoProduto || `Produto ${target.omieIdProduto}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-5 py-4">
          <div className="min-w-0 pr-3">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-stone-900">
              Notas fiscais
            </h2>
            <p className="mt-0.5 truncate text-sm text-stone-600">{titulo}</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-stone-500">
              {target.pendenciaCount} recebimento{target.pendenciaCount === 1 ? '' : 's'} •{' '}
              {target.nfsDistintas} NF{target.nfsDistintas === 1 ? '' : 's'}
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
          {loading ? (
            <p className="py-8 text-center text-sm text-stone-500">Carregando notas…</p>
          ) : error ? (
            <EmptyState icon="error_outline" title={error} />
          ) : pendencias.length === 0 ? (
            <EmptyState icon="receipt_long" title="Nenhuma nota encontrada" />
          ) : (
            <InsumoPendenciaNfDetalheLista
              pendencias={pendencias}
              unidadeNf={target.unidadeNf}
              mostrarFornecedor={mostrarFornecedor}
            />
          )}
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

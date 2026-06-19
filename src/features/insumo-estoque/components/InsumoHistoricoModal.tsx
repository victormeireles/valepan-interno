'use client';

import { useEffect, useId, useState } from 'react';
import type {
  InsumoMovimentoRecord,
  InsumoSaldoComDetalhes,
} from '@/domain/types/insumo-estoque';
import { getInsumoMovimentos } from '@/app/actions/insumo-estoque-actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  formatCurrency,
  formatDateTime,
  formatInsumoQuantidade,
  origemMovimentoLabel,
  origemMovimentoTone,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  isOpen: boolean;
  item: InsumoSaldoComDetalhes | null;
  onClose: () => void;
};

export default function InsumoHistoricoModal({ isOpen, item, onClose }: Props) {
  const titleId = useId();
  const [movimentos, setMovimentos] = useState<InsumoMovimentoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setAnimating(true);
      setLoading(true);
      setError('');
      getInsumoMovimentos(item.insumoId)
        .then(setMovimentos)
        .catch(() => setError('Erro ao carregar histórico'))
        .finally(() => setLoading(false));
    } else if (!isOpen) {
      const timer = setTimeout(() => setAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item]);

  if ((!isOpen && !animating) || !item) return null;

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
        className={`relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg transition-all duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-start justify-between border-b border-stone-100 px-6 py-5">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-stone-900">
              Histórico de movimentos
            </h2>
            <p className="mt-1 text-sm text-stone-600">{item.nome}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Fechar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-stone-500">Carregando movimentos…</p>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : movimentos.length === 0 ? (
            <EmptyState
              icon="history"
              title="Nenhum movimento"
              description="Este insumo ainda não possui entradas ou ajustes registrados."
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {movimentos.map((mov) => {
                const deltaPositivo = mov.deltaQuantidade >= 0;
                return (
                  <li key={mov.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={origemMovimentoTone(mov.origem)}>
                        {origemMovimentoLabel(mov.origem)}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {formatDateTime(mov.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          deltaPositivo ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {deltaPositivo ? '+' : ''}
                        {formatInsumoQuantidade(mov.deltaQuantidade, item.unidadeResumida)}
                      </p>
                      <p className="font-mono text-xs tabular-nums text-stone-600">
                        Saldo: {formatInsumoQuantidade(mov.saldoResultante, item.unidadeResumida)}
                      </p>
                    </div>
                    <p className="font-mono text-xs tabular-nums text-stone-600">
                      Custo: {formatCurrency(mov.custoUnitario)}
                    </p>
                    {mov.observacao ? (
                      <p className="text-sm text-stone-600">{mov.observacao}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-stone-100 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose} fullWidth>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

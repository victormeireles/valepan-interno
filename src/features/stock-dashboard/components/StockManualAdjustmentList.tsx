'use client';

import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import {
  buildManualAdjustmentDisplay,
  formatAdjustmentTime,
} from '../manual-adjustment-display';

export type StockManualAdjustmentListProps = {
  movimentos: EstoqueMovimentoRecord[];
  showDateOnTime?: boolean;
};

export function StockManualAdjustmentList({
  movimentos,
  showDateOnTime = false,
}: StockManualAdjustmentListProps) {
  if (movimentos.length === 0) {
    return null;
  }

  return (
    <ol className="space-y-2" aria-label="Lista de ajustes manuais">
      {movimentos.map((mov) => {
        const row = buildManualAdjustmentDisplay(mov);

        return (
          <li
            key={row.id}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <time
                className="shrink-0 text-sm font-semibold tabular-nums text-stone-900"
                dateTime={row.createdAt}
              >
                {formatAdjustmentTime(row.createdAt, showDateOnTime)}
              </time>
              <span className="text-xs font-medium text-stone-500">
                {row.tipoEstoqueNome}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-stone-900">
              {row.produtoNome}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-600">
              <span className="font-medium uppercase tracking-wide text-stone-500">
                Antes
              </span>
              <span className="font-semibold tabular-nums text-stone-800">
                {formatQuantidade(row.antes)}
              </span>
              <span className="text-stone-400" aria-hidden="true">
                →
              </span>
              <span className="font-medium uppercase tracking-wide text-stone-500">
                Depois
              </span>
              <span className="font-semibold tabular-nums text-stone-800">
                {formatQuantidade(row.depois)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

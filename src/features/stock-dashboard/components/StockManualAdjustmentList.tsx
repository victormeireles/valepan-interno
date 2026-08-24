'use client';

import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import {
  buildCxPctDeltaChips,
  buildManualAdjustmentDisplay,
  formatAdjustmentTime,
  tipoEstoqueBadgeClass,
  type CxPctDeltaChip,
} from '../manual-adjustment-display';

export type StockManualAdjustmentListProps = {
  movimentos: EstoqueMovimentoRecord[];
  showDateOnTime?: boolean;
};

const DELTA_TONE_CLASS: Record<CxPctDeltaChip['tone'], string> = {
  positive: 'text-emerald-700',
  negative: 'text-rose-700',
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
        const chips = buildCxPctDeltaChips(row.delta);
        const deltaSummary = chips
          .map((chip) => `${chip.signedLabel}${chip.unit}`)
          .join(' e ');

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
              <span
                className={`inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ${tipoEstoqueBadgeClass(row.tipoEstoqueId || row.tipoEstoqueNome)}`}
                title={row.tipoEstoqueNome}
              >
                {row.tipoEstoqueNome}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-stone-900">
              {row.produtoNome}
            </p>
            {row.criadoPorNome ? (
              <p className="mt-0.5 text-xs text-stone-500">por {row.criadoPorNome}</p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-stone-600">
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

              <p
                className="ml-auto inline-flex flex-wrap items-baseline gap-x-1 text-sm font-semibold tabular-nums"
                aria-label={`Delta ${deltaSummary}`}
              >
                {chips.map((chip, index) => (
                  <span key={chip.unit} className="inline-flex items-baseline gap-x-1">
                    {index > 0 ? (
                      <span className="font-medium text-stone-400" aria-hidden="true">
                        e
                      </span>
                    ) : null}
                    <span className={DELTA_TONE_CLASS[chip.tone]}>
                      {chip.signedLabel}
                      <span className="ml-0.5 text-xs font-medium">{chip.unit}</span>
                    </span>
                  </span>
                ))}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

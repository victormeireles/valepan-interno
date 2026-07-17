'use client';

import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import {
  buildCxPctDeltaChips,
  buildManualAdjustmentDisplay,
  formatAdjustmentTime,
  type CxPctDeltaChip,
} from '../manual-adjustment-display';

export type StockManualAdjustmentListProps = {
  movimentos: EstoqueMovimentoRecord[];
  showDateOnTime?: boolean;
};

const CHIP_TONE_CLASS: Record<CxPctDeltaChip['tone'], string> = {
  positive: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  negative: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200',
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
              <span className="text-xs font-medium text-stone-500">
                {row.tipoEstoqueNome}
              </span>
            </div>

            <p className="mt-1 text-sm font-semibold text-stone-900">
              {row.produtoNome}
            </p>

            <div
              className="mt-2 flex flex-wrap items-center gap-1.5"
              aria-label={`Delta ${deltaSummary}`}
            >
              {chips.map((chip, index) => (
                <span key={chip.unit} className="inline-flex items-center gap-1.5">
                  {index > 0 ? (
                    <span className="text-xs font-medium text-stone-400" aria-hidden="true">
                      e
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex min-h-8 items-center rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums ${CHIP_TONE_CLASS[chip.tone]}`}
                  >
                    {chip.signedLabel}
                    <span className="ml-0.5 text-xs font-medium opacity-80">
                      {chip.unit}
                    </span>
                  </span>
                </span>
              ))}
            </div>

            <p className="mt-1.5 text-xs text-stone-500">
              Saldo após{' '}
              <span className="font-semibold tabular-nums text-stone-700">
                {formatQuantidade(row.depois)}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}

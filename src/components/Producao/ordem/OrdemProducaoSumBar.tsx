'use client';

import type { OrdemCellSelectionApi } from '@/components/Producao/ordem/useOrdemProducaoCellSelection';

const intFmt = new Intl.NumberFormat('pt-BR');

type Props = {
  selection: OrdemCellSelectionApi;
};

export default function OrdemProducaoSumBar({ selection }: Props) {
  if (!selection.enabled || !selection.hasSelection) return null;

  const { count, latas, caixas } = selection.sums;
  const partes: string[] = [];
  if (latas > 0) partes.push(`${intFmt.format(latas)} latas`);
  if (caixas > 0) partes.push(`${intFmt.format(caixas)} caixas`);

  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t border-sky-200 bg-sky-50 px-3 py-2 text-sm shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-sky-950">Soma da seleção</span>
        <span className="tabular-nums text-sky-900">
          {partes.length > 0 ? partes.join(' · ') : '0'}
        </span>
        <span className="text-xs text-sky-700">
          ({count} célula{count === 1 ? '' : 's'})
        </span>
      </div>
      <button
        type="button"
        className="rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100"
        onClick={selection.clearSelection}
      >
        Limpar (Esc)
      </button>
    </div>
  );
}

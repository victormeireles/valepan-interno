'use client';

import React, { type CSSProperties } from 'react';
import { Quantidade } from '@/domain/types/inventario';
import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';

export type StockQuantityColumns = {
  cx: boolean;
  pct: boolean;
  un: boolean;
  kg: boolean;
};

interface ProductStockRowProps {
  produto: string;
  quantidade: Quantidade;
  label?: string;
  columns: StockQuantityColumns;
  gridStyle: CSSProperties;
  highlighted?: boolean;
  onAdjust: () => void;
  onOutflow: () => void;
  onHistory: () => void;
}

export const ProductStockRow: React.FC<ProductStockRowProps> = ({
  produto,
  quantidade,
  label,
  columns,
  gridStyle,
  highlighted = false,
  onAdjust,
  onOutflow,
  onHistory,
}) => {
  return (
    <div
      className={`grid min-h-11 items-center gap-x-2 px-3 py-1.5 sm:px-4 ${
        highlighted ? 'bg-blue-50/60' : 'hover:bg-gray-50/80'
      }`}
      style={gridStyle}
    >
      <p
        className="min-w-0 truncate text-sm font-medium text-gray-900"
        title={produto}
      >
        {label ?? produto}
      </p>

      {columns.cx && (
        <QuantityCell value={quantidade.caixas} ariaLabel="Caixas" />
      )}
      {columns.pct && (
        <QuantityCell value={quantidade.pacotes} ariaLabel="Pacotes" />
      )}
      {columns.un && (
        <QuantityCell value={quantidade.unidades} ariaLabel="Unidades" />
      )}
      {columns.kg && (
        <QuantityCell value={quantidade.kg} ariaLabel="Quilogramas" decimals={2} />
      )}

      <div className="shrink-0 justify-self-end">
        <OverflowMenu
          ariaLabel={`Ações para ${produto}`}
          menuWidth={176}
          menuClassName="overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          triggerClassName="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <OverflowMenuItem variant="gray" label="Ajustar" onClick={onAdjust} />
          <OverflowMenuItem variant="gray" label="Saída" onClick={onOutflow} />
          <OverflowMenuItem variant="gray" label="Histórico" onClick={onHistory} />
        </OverflowMenu>
      </div>
    </div>
  );
};

export function resolveStockQuantityColumns(
  produtos: { quantidade: Quantidade }[],
): StockQuantityColumns {
  const hasNonZero = (pick: (q: Quantidade) => number) =>
    produtos.some((p) => pick(p.quantidade) !== 0);

  return {
    cx: true,
    pct: true,
    un: hasNonZero((q) => q.unidades),
    kg: hasNonZero((q) => q.kg),
  };
}

export function getStockRowGridStyle(
  columns: StockQuantityColumns,
): CSSProperties {
  const parts = ['minmax(0, 1fr)'];
  if (columns.cx) parts.push('minmax(2.75rem, 3.25rem)');
  if (columns.pct) parts.push('minmax(2.75rem, 3.25rem)');
  if (columns.un) parts.push('minmax(2.75rem, 3.25rem)');
  if (columns.kg) parts.push('minmax(2.75rem, 3.25rem)');
  parts.push('2.75rem');
  return { gridTemplateColumns: parts.join(' ') };
}

function QuantityCell({
  value,
  ariaLabel,
  decimals = 0,
}: {
  value: number;
  ariaLabel: string;
  decimals?: number;
}) {
  const isZero = value === 0;
  const isNegative = value < 0;
  const display = decimals > 0 ? value.toFixed(decimals) : String(value);

  return (
    <span
      className={`text-right text-sm tabular-nums ${
        isZero
          ? 'font-normal text-gray-300'
          : isNegative
            ? 'font-semibold text-red-600'
            : 'font-semibold text-gray-900'
      }`}
      aria-label={`${ariaLabel}: ${isZero ? 'zero' : display}`}
    >
      {isZero ? '—' : display}
    </span>
  );
}

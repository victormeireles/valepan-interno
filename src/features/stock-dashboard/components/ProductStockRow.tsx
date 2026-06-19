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
      className={`grid min-h-11 items-center gap-x-2 px-3 py-1.5 transition-colors duration-[120ms] sm:px-4 ${
        highlighted
          ? 'bg-amber-50/70'
          : 'hover:bg-stone-50'
      }`}
      style={gridStyle}
    >
      <p
        className="min-w-0 truncate text-sm font-medium text-stone-900"
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
        <OverflowMenu ariaLabel={`Ações para ${produto}`} menuWidth={176}>
          <OverflowMenuItem
            icon="tune"
            label="Ajustar"
            onClick={onAdjust}
          />
          <OverflowMenuItem
            icon="logout"
            label="Saída"
            onClick={onOutflow}
          />
          <OverflowMenuItem
            icon="history"
            label="Histórico"
            onClick={onHistory}
          />
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
  if (columns.cx) parts.push('minmax(2.5rem, 3rem)');
  if (columns.pct) parts.push('minmax(2.5rem, 3rem)');
  if (columns.un) parts.push('minmax(2.5rem, 3rem)');
  if (columns.kg) parts.push('minmax(2.5rem, 3rem)');
  parts.push('2.25rem');
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
  const display =
    decimals > 0
      ? value.toLocaleString('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : value.toLocaleString('pt-BR');

  return (
    <span
      className={`text-right font-mono text-sm tabular-nums ${
        isZero
          ? 'font-normal text-stone-300'
          : isNegative
            ? 'font-semibold text-red-600'
            : 'font-semibold text-stone-900'
      }`}
      aria-label={`${ariaLabel}: ${isZero ? 'zero' : display}`}
    >
      {isZero ? '—' : display}
    </span>
  );
}

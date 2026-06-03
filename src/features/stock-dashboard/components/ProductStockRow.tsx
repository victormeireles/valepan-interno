'use client';

import React, { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Quantidade } from '@/domain/types/inventario';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

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

      <div className="relative shrink-0 justify-self-end" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={`Ações para ${produto}`}
        >
          <MoreIcon />
        </button>

        {menuOpen && (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          >
            <MenuItem
              label="Ajustar"
              onClick={() => {
                setMenuOpen(false);
                onAdjust();
              }}
            />
            <MenuItem
              label="Saída"
              onClick={() => {
                setMenuOpen(false);
                onOutflow();
              }}
            />
            <MenuItem
              label="Histórico"
              onClick={() => {
                setMenuOpen(false);
                onHistory();
              }}
            />
          </div>
        )}
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

function MenuItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full min-h-11 items-center px-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
    >
      {label}
    </button>
  );
}

function MoreIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

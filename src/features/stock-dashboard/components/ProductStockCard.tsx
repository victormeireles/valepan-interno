'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ProductStockCardProps {
  produto: string;
  quantidade: Quantidade;
  onAdjust: () => void;
  onOutflow: () => void;
  onHistory: () => void;
}

const actionBase =
  'inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 min-h-11';

export const ProductStockCard: React.FC<ProductStockCardProps> = ({
  produto,
  quantidade,
  onAdjust,
  onOutflow,
  onHistory,
}) => {
  const isNegative =
    quantidade.caixas < 0 ||
    quantidade.pacotes < 0 ||
    quantidade.unidades < 0 ||
    quantidade.kg < 0;

  return (
    <article
      className={`rounded-2xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isNegative
          ? 'border-red-200 ring-1 ring-red-100'
          : 'border-gray-100'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3
          className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-900"
          title={produto}
        >
          {produto}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
            isNegative
              ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
              : 'bg-blue-50 text-blue-800 ring-1 ring-blue-100'
          }`}
        >
          {formatQuantidade(quantidade)}
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAdjust}
            className={`${actionBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100`}
          >
            <AdjustIcon />
            Ajustar
          </button>
          <button
            type="button"
            onClick={onOutflow}
            className={`${actionBase} bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700`}
          >
            <OutflowIcon />
            Saída
          </button>
        </div>
        <button
          type="button"
          onClick={onHistory}
          className={`${actionBase} w-full border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-gray-200`}
          aria-label="Ver histórico de movimentos"
        >
          <HistoryIcon />
          Histórico
        </button>
      </div>
    </article>
  );
};

const AdjustIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const HistoryIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0 text-gray-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const OutflowIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0 text-white"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="7 17 2 12 7 7" />
    <line x1="2" y1="12" x2="22" y2="12" />
  </svg>
);

'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ProductStockCardProps {
  produto: string;
  quantidade: Quantidade;
  onAdjust: () => void;
  onOutflow: () => void;
}

export const ProductStockCard: React.FC<ProductStockCardProps> = ({
  produto,
  quantidade,
  onAdjust,
  onOutflow,
}) => {
  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3
          className="text-sm font-semibold text-gray-900 truncate flex-1"
          title={produto}
        >
          {produto}
        </h3>
        <span className="text-base font-bold text-gray-900 whitespace-nowrap">
          {formatQuantidade(quantidade)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAdjust}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <AdjustIcon />
          Ajustar
        </button>
        <button
          type="button"
          onClick={onOutflow}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors"
        >
          <OutflowIcon />
          Saída
        </button>
      </div>
    </div>
  );
};

const AdjustIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-gray-500"
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

const OutflowIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-white"
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



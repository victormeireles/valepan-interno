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
  const quantityEntries = [
    { label: 'Cx', value: quantidade.caixas },
    { label: 'Pct', value: quantidade.pacotes },
    { label: 'Un', value: quantidade.unidades },
    { label: 'Kg', value: quantidade.kg },
  ].filter((entry) => entry.value > 0);

  const hasQuantidade = quantityEntries.length > 0;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-base font-semibold text-gray-900 truncate"
            title={produto}
          >
        {produto}
      </h3>
          <p className="text-xs text-gray-500 mt-1">
            {hasQuantidade ? 'Em estoque agora' : 'Sem estoque disponível'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase tracking-wider text-gray-400">
            Total
          </span>
          <p className="text-lg font-bold text-gray-900">
        {formatQuantidade(quantidade)}
      </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-3">
        {hasQuantidade ? (
          <dl className="grid grid-cols-2 gap-3 text-sm text-gray-700">
            {quantityEntries.map((entry) => (
              <div key={entry.label} className="flex items-baseline gap-2">
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  {entry.label}
                </dt>
                <dd className="font-semibold text-gray-900">
                  {entry.value.toLocaleString('pt-BR')}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-gray-500 text-center">Tudo zerado</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onAdjust}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <AdjustIcon />
          Ajustar
        </button>
        <button
          type="button"
          onClick={onOutflow}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors"
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
    className="h-4 w-4 text-gray-500"
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
    className="h-4 w-4 text-white"
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



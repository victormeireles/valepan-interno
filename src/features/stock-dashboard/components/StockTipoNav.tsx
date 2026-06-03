'use client';

import React from 'react';
import type { StockTipoNode } from '../types';

interface StockTipoNavProps {
  tipos: StockTipoNode[];
  selectedId: string | null;
  onSelect: (tipoEstoqueId: string) => void;
  className?: string;
}

export const StockTipoNav: React.FC<StockTipoNavProps> = ({
  tipos,
  selectedId,
  onSelect,
  className = '',
}) => {
  return (
    <nav
      aria-label="Tipos de estoque"
      className={`flex flex-col gap-1 ${className}`}
    >
      {tipos.map((tipo) => {
        const isActive = tipo.tipoEstoqueId === selectedId;
        const isNegative =
          tipo.total.caixas < 0 ||
          tipo.total.pacotes < 0 ||
          tipo.total.unidades < 0 ||
          tipo.total.kg < 0;

        const totalCaixas = tipo.total.caixas;

        return (
          <button
            key={tipo.tipoEstoqueId}
            type="button"
            onClick={() => onSelect(tipo.tipoEstoqueId)}
            className={`flex min-h-11 w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-900 hover:bg-gray-50 ring-1 ring-gray-200'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            <span className="text-sm font-semibold leading-tight">
              {tipo.tipoEstoqueNome}
            </span>
            <span
              className={`mt-0.5 text-xs tabular-nums ${
                isActive
                  ? 'text-blue-100'
                  : isNegative
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              {totalCaixas} cx
            </span>
          </button>
        );
      })}
    </nav>
  );
};

interface StockTipoSelectProps {
  tipos: StockTipoNode[];
  selectedId: string | null;
  onSelect: (tipoEstoqueId: string) => void;
  className?: string;
}

export const StockTipoSelect: React.FC<StockTipoSelectProps> = ({
  tipos,
  selectedId,
  onSelect,
  className = '',
}) => {
  return (
    <div className={className}>
      <label htmlFor="stock-tipo-select" className="sr-only">
        Tipo de estoque
      </label>
      <select
        id="stock-tipo-select"
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-11"
      >
        {tipos.map((tipo) => (
          <option key={tipo.tipoEstoqueId} value={tipo.tipoEstoqueId}>
            {tipo.tipoEstoqueNome} ({tipo.total.caixas} cx)
          </option>
        ))}
      </select>
    </div>
  );
};

interface StockTipoTabsProps {
  tipos: StockTipoNode[];
  selectedId: string | null;
  onSelect: (tipoEstoqueId: string) => void;
  className?: string;
}

export const StockTipoTabs: React.FC<StockTipoTabsProps> = ({
  tipos,
  selectedId,
  onSelect,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      aria-label="Tipos de estoque"
      className={`flex flex-1 gap-2 overflow-x-auto pb-0.5 ${className}`}
    >
      {tipos.map((tipo) => {
        const isActive = tipo.tipoEstoqueId === selectedId;
        const totalCaixas = tipo.total.caixas;

        return (
          <button
            key={tipo.tipoEstoqueId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tipo.tipoEstoqueId)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-11 ${
              isActive
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {tipo.tipoEstoqueNome}
            <span
              className={`ml-1.5 tabular-nums ${
                isActive ? 'text-gray-300' : 'text-gray-400'
              }`}
            >
              ({totalCaixas} cx)
            </span>
          </button>
        );
      })}
    </div>
  );
};

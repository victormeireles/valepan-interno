'use client';

import React from 'react';
import { Chip } from '@/components/ui/Chip';
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
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        Tipo de estoque
      </span>
      {tipos.map((tipo) => {
        const isActive = tipo.tipoEstoqueId === selectedId;

        return (
          <Chip
            key={tipo.tipoEstoqueId}
            active={isActive}
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(tipo.tipoEstoqueId)}
          >
            {tipo.tipoEstoqueNome}
          </Chip>
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
        className="block min-h-11 w-full rounded-[9px] border border-stone-200 bg-white px-3 py-3 text-base font-medium text-stone-900 shadow-control focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
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

/** @deprecated Use StockTipoNav — mantido como alias para compatibilidade */
export const StockTipoTabs = StockTipoNav;

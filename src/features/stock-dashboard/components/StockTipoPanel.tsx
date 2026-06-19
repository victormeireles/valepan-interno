'use client';

import React from 'react';
import type { StockTipoNode } from '../types';
import type { StockCardSelection } from '../types';
import { StockFamilyCard } from './StockFamilyCard';

interface StockTipoPanelProps {
  tipo: StockTipoNode;
  filterTerm?: string;
  onAdjustStock: (data: StockCardSelection) => void;
  onRegisterOutflow: (data: StockCardSelection) => void;
  onViewHistory: (data: StockCardSelection) => void;
}

export const StockTipoPanel: React.FC<StockTipoPanelProps> = ({
  tipo,
  filterTerm = '',
  onAdjustStock,
  onRegisterOutflow,
  onViewHistory,
}) => {
  if (tipo.familias.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
        <p className="text-sm font-medium text-stone-800">
          Nenhum produto neste tipo de estoque
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tipo.familias.map((familia) => (
        <StockFamilyCard
          key={familia.familiaId ?? `sem-${familia.familiaNome}`}
          familia={familia}
          estoqueNome={tipo.tipoEstoqueNome}
          filterTerm={filterTerm}
          onAdjustStock={onAdjustStock}
          onRegisterOutflow={onRegisterOutflow}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
};

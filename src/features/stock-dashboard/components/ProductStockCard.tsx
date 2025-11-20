'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ProductStockCardProps {
  produto: string;
  quantidade: Quantidade;
}

export const ProductStockCard: React.FC<ProductStockCardProps> = ({
  produto,
  quantidade,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 truncate" title={produto}>
        {produto}
      </h3>
      <p className="text-lg font-bold text-gray-700">
        {formatQuantidade(quantidade)}
      </p>
    </div>
  );
};


'use client';

import React from 'react';
import { ClientStockSummary } from '../types';
import { ProductStockCard } from './ProductStockCard';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ClientStockBlockProps {
  cliente: string;
  summary: ClientStockSummary;
}

export const ClientStockBlock: React.FC<ClientStockBlockProps> = ({
  cliente,
  summary,
}) => {
  return (
    <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
        <span className="text-gray-600 font-normal">{formatQuantidade(summary.total)}</span> - {cliente}
      </h2>
      <div className="space-y-3">
        {summary.produtos.map((item) => (
          <ProductStockCard
            key={item.produto}
            produto={item.produto}
            quantidade={item.quantidade}
          />
        ))}
      </div>
    </div>
  );
};


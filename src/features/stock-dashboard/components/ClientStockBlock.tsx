'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import { ClientStockSummary } from '../types';
import { ProductStockCard } from './ProductStockCard';

interface ClientStockBlockProps {
  cliente: string;
  summary: ClientStockSummary;
  onProductClick?: (payload: {
    cliente: string;
    produto: string;
    quantidade: Quantidade;
  }) => void;
}

export const ClientStockBlock: React.FC<ClientStockBlockProps> = ({
  cliente,
  summary,
  onProductClick,
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
              onClick={
                onProductClick
                  ? () =>
                      onProductClick({
                        cliente,
                        produto: item.produto,
                        quantidade: item.quantidade,
                      })
                  : undefined
              }
            />
          ))}
        </div>
    </div>
  );
};


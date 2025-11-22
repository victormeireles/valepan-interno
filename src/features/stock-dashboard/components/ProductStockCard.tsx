'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ProductStockCardProps {
  produto: string;
  quantidade: Quantidade;
  onClick?: () => void;
}

export const ProductStockCard: React.FC<ProductStockCardProps> = ({
  produto,
  quantidade,
  onClick,
}) => {
  const className =
    'w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-shadow';
  const content = (
    <>
      <h3
        className="mb-2 truncate text-sm font-semibold text-gray-900"
        title={produto}
      >
        {produto}
      </h3>
      <p className="text-lg font-bold text-gray-700">
        {formatQuantidade(quantidade)}
      </p>
    </>
  );

  if (!onClick) {
    return <div className={`${className}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} text-left hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
    >
      {content}
    </button>
  );
};


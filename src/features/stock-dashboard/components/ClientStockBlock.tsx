'use client';

import React from 'react';
import { Quantidade } from '@/domain/types/inventario';
import { ClientStockSummary } from '../types';
import { ProductStockCard } from './ProductStockCard';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface ClientStockBlockProps {
  cliente: string;
  summary: ClientStockSummary;
  filterTerm?: string;
  onAdjustStock: (data: StockCardSelection) => void;
  onRegisterOutflow: (data: StockCardSelection) => void;
}

export type StockCardSelection = {
  estoqueNome: string;
  produto: string;
  quantidade: Quantidade;
};

export const ClientStockBlock: React.FC<ClientStockBlockProps> = ({
  cliente,
  summary,
  filterTerm = '',
  onAdjustStock,
  onRegisterOutflow,
}) => {
  const isTotalNegative =
    summary.total.caixas < 0 ||
    summary.total.pacotes < 0 ||
    summary.total.unidades < 0 ||
    summary.total.kg < 0;

  const filteredProdutos = React.useMemo(() => {
    if (!filterTerm.trim()) {
      return summary.produtos;
    }

    const searchTerm = filterTerm.toLowerCase().trim();
    const clienteMatches = cliente.toLowerCase().includes(searchTerm);

    // Se o cliente corresponde, mostra todos os produtos
    if (clienteMatches) {
      return summary.produtos;
    }

    // Caso contrário, filtra apenas os produtos que correspondem
    return summary.produtos.filter((item) =>
      item.produto.toLowerCase().includes(searchTerm)
    );
  }, [summary.produtos, filterTerm, cliente]);

  if (filteredProdutos.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-300">
        <span
          className={`${
            isTotalNegative ? 'text-red-600 font-bold' : 'text-gray-600 font-normal'
          }`}
        >
          {formatQuantidade(summary.total)}
        </span>{' '}
        - {cliente}
      </h2>
      <div className="space-y-3">
        {filteredProdutos.map((item) => (
          <ProductStockCard
            key={item.produto}
            produto={item.produto}
            quantidade={item.quantidade}
            onAdjust={() =>
              onAdjustStock({
                estoqueNome: cliente,
                produto: item.produto,
                quantidade: item.quantidade,
              })
            }
            onOutflow={() =>
              onRegisterOutflow({
                estoqueNome: cliente,
                produto: item.produto,
                quantidade: item.quantidade,
              })
            }
          />
        ))}
      </div>
    </div>
  );
};


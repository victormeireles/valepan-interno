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
  onViewHistory: (data: StockCardSelection) => void;
}

export type StockCardSelection = {
  estoqueNome: string;
  produto: string;
  quantidade: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
};

export const ClientStockBlock: React.FC<ClientStockBlockProps> = ({
  cliente,
  summary,
  filterTerm = '',
  onAdjustStock,
  onRegisterOutflow,
  onViewHistory,
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

    if (clienteMatches) {
      return summary.produtos;
    }

    return summary.produtos.filter((item) =>
      item.produto.toLowerCase().includes(searchTerm),
    );
  }, [summary.produtos, filterTerm, cliente]);

  if (filteredProdutos.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header
        className={`border-b px-4 py-3 sm:px-5 ${
          isTotalNegative ? 'border-red-100 bg-red-50/40' : 'border-gray-100 bg-gray-50/80'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">
            {cliente}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                isTotalNegative
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-900 text-white'
              }`}
            >
              {formatQuantidade(summary.total)}
            </span>
            <span className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
              {filteredProdutos.length} produto
              {filteredProdutos.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-2.5 bg-gray-50/50 p-3 sm:p-4">
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
                tipoEstoqueId: item.tipoEstoqueId,
                produtoId: item.produtoId,
              })
            }
            onOutflow={() =>
              onRegisterOutflow({
                estoqueNome: cliente,
                produto: item.produto,
                quantidade: item.quantidade,
                tipoEstoqueId: item.tipoEstoqueId,
                produtoId: item.produtoId,
              })
            }
            onHistory={() =>
              onViewHistory({
                estoqueNome: cliente,
                produto: item.produto,
                quantidade: item.quantidade,
                tipoEstoqueId: item.tipoEstoqueId,
                produtoId: item.produtoId,
              })
            }
          />
        ))}
      </div>
    </section>
  );
};

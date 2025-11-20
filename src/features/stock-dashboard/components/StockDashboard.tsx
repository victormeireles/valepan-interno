'use client';

import React from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import { ClientStockBlock } from './ClientStockBlock';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface Props {
  initialData: EstoqueRecord[];
}

export const StockDashboard: React.FC<Props> = ({ initialData }) => {
  const { 
    stockData,
    summary,
    isEmpty 
  } = useStockDashboardViewModel(initialData);

  if (isEmpty) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
        Nenhum dado de estoque encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Estoque</p>
            <p className="text-lg font-bold text-gray-900">{formatQuantidade(summary.totalEstoque)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Clientes</p>
            <p className="text-lg font-bold text-gray-900">{summary.totalClientes}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Produtos</p>
            <p className="text-lg font-bold text-gray-900">{summary.totalProdutos}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Itens</p>
            <p className="text-lg font-bold text-gray-900">
              {(summary.totalEstoque.caixas + summary.totalEstoque.pacotes + summary.totalEstoque.unidades).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Stock Blocks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {stockData.clients.map((cliente) => {
          const clientSummary = stockData.stockByClient.get(cliente);
          if (!clientSummary) return null;
          
          return (
            <ClientStockBlock
              key={cliente}
              cliente={cliente}
              summary={clientSummary}
            />
          );
        })}
      </div>
    </div>
  );
};


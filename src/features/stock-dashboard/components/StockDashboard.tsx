'use client';

import React from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import { useStockEditCoordinator } from '../hooks/useStockEditCoordinator';
import { ClientStockBlock } from './ClientStockBlock';
import { EditStockModal } from './EditStockModal';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';

interface Props {
  initialData: EstoqueRecord[];
}

export const StockDashboard: React.FC<Props> = ({ initialData }) => {
  const { records, editorState, openEditor, closeEditor, saveQuantity } =
    useStockEditCoordinator(initialData);

  const { stockData, summary, isEmpty } =
    useStockDashboardViewModel(records);

  if (isEmpty) {
    return (
      <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
        Nenhum dado de estoque encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-gray-500">
              Total Estoque
            </p>
            <p className="text-lg font-bold text-gray-900">
              {formatQuantidade(summary.totalEstoque)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-gray-500">
              Total Clientes
            </p>
            <p className="text-lg font-bold text-gray-900">
              {summary.totalClientes}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-gray-500">
              Total Produtos
            </p>
            <p className="text-lg font-bold text-gray-900">
              {summary.totalProdutos}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-gray-500">
              Itens
            </p>
            <p className="text-lg font-bold text-gray-900">
              {(
                summary.totalEstoque.caixas +
                summary.totalEstoque.pacotes +
                summary.totalEstoque.unidades
              ).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {stockData.clients.map((cliente) => {
          const clientSummary = stockData.stockByClient.get(cliente);
          if (!clientSummary) {
            return null;
          }

          return (
            <ClientStockBlock
              key={cliente}
              cliente={cliente}
              summary={clientSummary}
              onProductClick={openEditor}
            />
          );
        })}
      </div>

      <EditStockModal
        isOpen={editorState.isOpen}
        target={editorState.target}
        saving={editorState.saving}
        error={editorState.error}
        onClose={closeEditor}
        onConfirm={saveQuantity}
      />
    </div>
  );
};


'use client';

import React from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import { ClientStockChart } from './ClientStockChart';
import { ProductStockChart } from './ProductStockChart';
import { MetricType, ChartDataPoint } from '../types';

interface Props {
  initialData: EstoqueRecord[];
}

export const StockDashboard: React.FC<Props> = ({ initialData }) => {
  const { 
    data, 
    metric, 
    setMetric, 
    selectedClient,
    setSelectedClient,
    clients,
    isEmpty 
  } = useStockDashboardViewModel(initialData);

  if (isEmpty) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
        Nenhum dado de estoque encontrado.
      </div>
    );
  }

  const handleBarClick = (entry: ChartDataPoint | null) => {
    if (entry && entry.name) {
      setSelectedClient(entry.name === selectedClient ? '' : entry.name);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
        <div>
          <p className="text-sm text-gray-500">
            {selectedClient 
              ? `Visualizando dados de: ${selectedClient}` 
              : 'Visão geral consolidada de todos os clientes'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Seletor de Cliente */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrar Cliente:</span>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="block w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
            >
              <option value="">Todos os Clientes</option>
              {clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>

          {/* Seletor de Métrica */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700">Métrica:</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="block w-full sm:w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border text-gray-900 bg-white"
            >
              <option value="caixas">Caixas</option>
              <option value="pacotes">Pacotes</option>
              <option value="unidades">Unidades</option>
              <option value="kg">Kg</option>
            </select>
          </div>

          {/* Botão limpar filtro */}
          {selectedClient && (
            <button 
              onClick={() => setSelectedClient('')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-blue-500 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-bold">Total {metric}</p>
          <p className="text-2xl font-bold text-gray-900">
            {data.totalStockByProduct.reduce((acc, curr) => acc + curr.value, 0).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-green-500 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-bold">
            {selectedClient ? 'Cliente Selecionado' : 'Clientes Ativos'}
          </p>
          <p className="text-xl font-bold text-gray-900 truncate" title={selectedClient || undefined}>
            {selectedClient ? selectedClient : data.totalStockByClient.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-l-purple-500 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-bold">Produtos em Estoque</p>
          <p className="text-2xl font-bold text-gray-900">{data.totalStockByProduct.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Se um cliente está selecionado, escondemos o gráfico de clientes para dar foco aos produtos */}
        {!selectedClient && (
          <ClientStockChart 
            data={data.totalStockByClient} 
            metricLabel={metric} 
            onBarClick={handleBarClick}
          />
        )}
        
        <div className={selectedClient ? "col-span-1 lg:col-span-2" : ""}>
          <ProductStockChart 
            data={data.totalStockByProduct} 
            metricLabel={metric}
            title={selectedClient ? `Produtos em Estoque: ${selectedClient}` : undefined} 
          />
        </div>
      </div>
    </div>
  );
};


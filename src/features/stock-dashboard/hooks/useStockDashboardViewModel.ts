import { useMemo, useState } from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import { DashboardData, MetricType, ChartDataPoint } from '../types';

export const useStockDashboardViewModel = (initialData: EstoqueRecord[]) => {
  const [metric, setMetric] = useState<MetricType>('caixas');
  const [selectedClient, setSelectedClient] = useState<string>('');

  const clients = useMemo(() => {
    const uniqueClients = new Set(initialData.map(d => d.cliente));
    return Array.from(uniqueClients).sort();
  }, [initialData]);

  const dashboardData: DashboardData = useMemo(() => {
    // Se tiver cliente selecionado, filtramos os dados brutos ANTES de processar
    const filteredData = selectedClient 
      ? initialData.filter(r => r.cliente === selectedClient)
      : initialData;

    // 1. Agrupar por Cliente
    const clientMap = new Map<string, number>();
    
    // 2. Agrupar por Produto
    const productMap = new Map<string, number>();

    filteredData.forEach((record) => {
      const value = record.quantidade[metric] || 0;
      
      // Cliente
      const currentClientVal = clientMap.get(record.cliente) || 0;
      clientMap.set(record.cliente, currentClientVal + value);

      // Produto
      const currentProdVal = productMap.get(record.produto) || 0;
      productMap.set(record.produto, currentProdVal + value);
    });

    // Converter para array e ordenar
    const totalStockByClient: ChartDataPoint[] = Array.from(clientMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Maior para menor

    const totalStockByProduct: ChartDataPoint[] = Array.from(productMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalStockByClient,
      totalStockByProduct,
      rawData: filteredData,
    };
  }, [initialData, metric, selectedClient]);

  return {
    data: dashboardData,
    metric,
    setMetric,
    selectedClient,
    setSelectedClient,
    clients,
    isEmpty: initialData.length === 0
  };
};


import { useMemo } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import {
  StockByClientData,
  ClientStockSummary,
  StockSummary,
} from '../types';
import { isQuantidadeZerada } from '@/lib/utils/quantidade-formatter';

export const useStockDashboardViewModel = (records: EstoqueRecord[]) => {
  const stockData: StockByClientData = useMemo(() => {
    const stockByClient = new Map<string, Map<string, Quantidade>>();

    records.forEach((record) => {
      if (!stockByClient.has(record.cliente)) {
        stockByClient.set(record.cliente, new Map());
      }

      const clientProducts = stockByClient.get(record.cliente)!;

      if (clientProducts.has(record.produto)) {
        const existing = clientProducts.get(record.produto)!;
        clientProducts.set(record.produto, {
          caixas: existing.caixas + record.quantidade.caixas,
          pacotes: existing.pacotes + record.quantidade.pacotes,
          unidades: existing.unidades + record.quantidade.unidades,
          kg: existing.kg + record.quantidade.kg,
        });
      } else {
        clientProducts.set(record.produto, { ...record.quantidade });
      }
    });

    const stockByClientArray = new Map<string, ClientStockSummary>();

    stockByClient.forEach((productsMap, cliente) => {
      const produtos: Array<{ produto: string; quantidade: Quantidade }> = [];
      const totalCliente: Quantidade = {
        caixas: 0,
        pacotes: 0,
        unidades: 0,
        kg: 0,
      };

      productsMap.forEach((quantidade, produto) => {
        if (!isQuantidadeZerada(quantidade)) {
          produtos.push({ produto, quantidade });
          totalCliente.caixas += quantidade.caixas;
          totalCliente.pacotes += quantidade.pacotes;
          totalCliente.unidades += quantidade.unidades;
          totalCliente.kg += quantidade.kg;
        }
      });

      produtos.sort((a, b) => a.produto.localeCompare(b.produto));

      stockByClientArray.set(cliente, {
        produtos,
        total: totalCliente,
      });
    });

    const clientsComProdutos = Array.from(stockByClientArray.entries())
      .filter(([, summary]) => summary.produtos.length > 0)
      .map(([cliente]) => cliente)
      .sort();

    return {
      stockByClient: stockByClientArray,
      clients: clientsComProdutos,
      isEmpty: records.length === 0,
    };
  }, [records]);

  const summary: StockSummary = useMemo(() => {
    const totalEstoque: Quantidade = {
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    };
    let totalProdutos = 0;

    stockData.stockByClient.forEach((clientSummary) => {
      totalEstoque.caixas += clientSummary.total.caixas;
      totalEstoque.pacotes += clientSummary.total.pacotes;
      totalEstoque.unidades += clientSummary.total.unidades;
      totalEstoque.kg += clientSummary.total.kg;
      totalProdutos += clientSummary.produtos.length;
    });

    return {
      totalEstoque,
      totalClientes: stockData.clients.length,
      totalProdutos,
    };
  }, [stockData]);

  return {
    stockData,
    summary,
    isEmpty: records.length === 0,
  };
};


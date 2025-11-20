import { useMemo } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import { StockByClientData, ClientStockSummary, StockSummary } from '../types';
import { isQuantidadeZerada } from '@/lib/utils/quantidade-formatter';

export const useStockDashboardViewModel = (initialData: EstoqueRecord[]) => {
  const stockData: StockByClientData = useMemo(() => {
    // Agrupar por cliente e produto
    const stockByClient = new Map<string, Map<string, Quantidade>>();

    initialData.forEach((record) => {
      if (!stockByClient.has(record.cliente)) {
        stockByClient.set(record.cliente, new Map());
      }

      const clientProducts = stockByClient.get(record.cliente)!;
      
      if (clientProducts.has(record.produto)) {
        // Somar quantidades se o produto já existe
        const existing = clientProducts.get(record.produto)!;
        clientProducts.set(record.produto, {
          caixas: existing.caixas + record.quantidade.caixas,
          pacotes: existing.pacotes + record.quantidade.pacotes,
          unidades: existing.unidades + record.quantidade.unidades,
          kg: existing.kg + record.quantidade.kg,
        });
      } else {
        // Adicionar novo produto
        clientProducts.set(record.produto, { ...record.quantidade });
      }
    });

    // Converter Map interno para ClientStockSummary, filtrando produtos zerados
    const stockByClientArray = new Map<string, ClientStockSummary>();
    
    stockByClient.forEach((productsMap, cliente) => {
      // Filtrar produtos zerados e calcular total do cliente
      const produtos: Array<{ produto: string; quantidade: Quantidade }> = [];
      const totalCliente: Quantidade = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };

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

    // Remover clientes sem produtos
    const clientsComProdutos = Array.from(stockByClientArray.entries())
      .filter(([, summary]) => summary.produtos.length > 0)
      .map(([cliente]) => cliente)
      .sort();

    return {
      stockByClient: stockByClientArray,
      clients: clientsComProdutos,
      isEmpty: initialData.length === 0,
    };
  }, [initialData]);

  const summary: StockSummary = useMemo(() => {
    const totalEstoque: Quantidade = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };
    let totalProdutos = 0;

    stockData.stockByClient.forEach((summary) => {
      totalEstoque.caixas += summary.total.caixas;
      totalEstoque.pacotes += summary.total.pacotes;
      totalEstoque.unidades += summary.total.unidades;
      totalEstoque.kg += summary.total.kg;
      totalProdutos += summary.produtos.length;
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
    isEmpty: initialData.length === 0,
  };
};


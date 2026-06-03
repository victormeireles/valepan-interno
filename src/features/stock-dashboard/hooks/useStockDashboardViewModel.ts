import { useMemo } from 'react';
import { EstoqueRecord } from '@/domain/types/inventario';
import {
  buildStockTree,
  countProductsInTree,
  filterStockTree,
  type StockTipoNode,
} from '@/domain/estoque/stock-grouping';
import { criarQuantidadeZerada, somarQuantidades } from '@/domain/estoque/quantidade-calculo';
import { StockSummary } from '../types';

export const useStockDashboardViewModel = (records: EstoqueRecord[]) => {
  const stockTree: StockTipoNode[] = useMemo(
    () => buildStockTree(records),
    [records],
  );

  const summary: StockSummary = useMemo(() => {
    const totalEstoque = stockTree.reduce(
      (acc, tipo) => somarQuantidades(acc, tipo.total, true),
      criarQuantidadeZerada(),
    );

    return {
      totalEstoque,
      totalClientes: stockTree.length,
      totalProdutos: countProductsInTree(stockTree),
    };
  }, [stockTree]);

  const isEmpty = records.length === 0 || stockTree.length === 0;

  return {
    stockTree,
    summary,
    isEmpty,
    filterTree: (searchTerm: string) => filterStockTree(stockTree, searchTerm),
  };
};

export type { StockTipoNode };

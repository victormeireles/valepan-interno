import { Quantidade } from '@/domain/types/inventario';
import type {
  StockFamilyGroup,
  StockProductItem,
  StockTipoNode,
} from '@/domain/estoque/stock-grouping';

export type { StockFamilyGroup, StockProductItem, StockTipoNode };

export interface ProductStockItem {
  produto: string;
  quantidade: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
  produtoFamiliaId?: string | null;
  produtoFamiliaNome?: string | null;
  ordemFamilia?: number;
  ordemNaFamilia?: number;
}

export interface ClientStockSummary {
  produtos: ProductStockItem[];
  total: Quantidade;
}

export interface StockByClientData {
  stockByClient: Map<string, ClientStockSummary>;
  clients: string[];
  isEmpty: boolean;
}

export interface StockSummary {
  totalEstoque: Quantidade;
  totalClientes: number;
  totalProdutos: number;
}

export type StockCardSelection = {
  estoqueNome: string;
  produto: string;
  quantidade: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
};

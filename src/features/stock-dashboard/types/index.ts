import { Quantidade } from '@/domain/types/inventario';

export interface ProductStockItem {
  produto: string;
  quantidade: Quantidade;
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


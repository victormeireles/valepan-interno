export type { InsumoPedidoCompraStatus } from '@/domain/types/insumo-pedido-compra-db';

export type InsumoPedidoPipelineItem = {
  insumoId: string;
  pedidoId: string;
  numero: number;
  quantidade: number;
  dataPrevista: string;
  dataEfetiva: string;
  atrasado: boolean;
};

export type InsumoPedidoPipelineResumo = {
  quantidade: number;
  atrasado: boolean;
  proximaData: string | null;
  pedidoIds: string[];
};

export type InsumoPedidoCompraItemInput = {
  insumoId: string;
  quantidade: number;
};

export type ValidarPedidoCompraInput = {
  fornecedorNome: string;
  dataChegadaPrevista: string;
  itens: InsumoPedidoCompraItemInput[];
};

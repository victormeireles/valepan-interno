export type InsumoPedidoCompraStatus = 'aberto' | 'encerrado' | 'cancelado';

export type InsumoPedidoCompraRow = {
  id: string;
  numero: number;
  fornecedor_nome: string;
  data_chegada_prevista: string;
  status: InsumoPedidoCompraStatus;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type InsumoPedidoCompraItemRow = {
  id: string;
  pedido_id: string;
  insumo_id: string;
  quantidade: number;
};

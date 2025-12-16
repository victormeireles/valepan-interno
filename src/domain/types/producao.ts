export interface ProductionQueueItem {
  id: string;
  lote_codigo: string;
  produto_id: string;
  qtd_planejada: number;
  status: string;
  prioridade: number;
  created_at: string;
  produtos: {
    nome: string;
    unidade: string;
  };
  pedidos?: {
    cliente_id: string;
    clientes?: {
      nome_fantasia: string;
    };
  };
}











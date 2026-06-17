export type PedidoItem = {
  produto: string;
  congelado: 'Sim' | 'Não' | boolean;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
  assadeiras?: number;
  assadeiraId?: string;
  observacao?: string;
};

export type PedidoEmbalagemPayload = {
  dataPedido: string; // yyyy-mm-dd
  dataFabricacao: string; // yyyy-mm-dd
  cliente: string;
  observacao?: string;
  itens: PedidoItem[];
};

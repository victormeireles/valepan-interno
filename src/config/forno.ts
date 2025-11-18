export const PEDIDOS_FORNO_CONFIG = {
  origemProdutos: {
    provider: 'supabase' as const,
  },
  destinoPedidos: {
    spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
    tabName: 'Pedido de Produção',
  }
} as const;

export type PedidoFornoItem = {
  produto: string;
  latas: number;
  unidades: number;
  kg: number;
};

export type PedidoFornoPayload = {
  dataProducao: string; // yyyy-mm-dd (coluna A)
  itens: PedidoFornoItem[];
};



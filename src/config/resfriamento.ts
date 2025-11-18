export const PEDIDOS_RESFRIAMENTO_CONFIG = {
  origemClientes: {
    spreadsheetId: process.env.NEXT_PUBLIC_CLIENTES_SHEET_ID || '1-YyKoGWHUWKBLnqK35mf9varGS-DA104AldE_APS6qw',
    tabName: 'De Para Razao Social',
    column: 'G',
    headerRow: 1,
  },
  origemProdutos: {
    provider: 'supabase' as const,
  },
  destinoPedidos: {
    spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
    tabName: 'Pedido de Produção', // Mesma aba do forno e fermentação
  }
} as const;

export type PedidoResfriamentoItem = {
  produto: string;
  latas: number;
  unidades: number;
  kg: number;
};

export type PedidoResfriamentoPayload = {
  dataPedido: string; // yyyy-mm-dd
  itens: PedidoResfriamentoItem[];
};


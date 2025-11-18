export const PEDIDOS_EMBALAGEM_CONFIG = {
  origemClientes: {
    spreadsheetId: process.env.NEXT_PUBLIC_CLIENTES_SHEET_ID || '1-YyKoGWHUWKBLnqK35mf9varGS-DA104AldE_APS6qw',
    tabName: 'De Para Razao Social',
    column: 'G',
    headerRow: 1, // PRD menciona a partir da linha 2
  },
  origemProdutos: {
    provider: 'supabase' as const,
  },
  destinoPedidos: {
    spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
    tabName: 'Pedido de embalagem',
  }
} as const;

export const EMBALAGEM_PRODUCAO_DESTINO = {
  spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
  tabName: '6 - Embalagem',
} as const;

export type PedidoItem = {
  produto: string;
  congelado: 'Sim' | 'Não';
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

export type PedidoEmbalagemPayload = {
  dataPedido: string; // yyyy-mm-dd
  dataFabricacao: string; // yyyy-mm-dd
  cliente: string;
  observacao?: string;
  itens: PedidoItem[];
};



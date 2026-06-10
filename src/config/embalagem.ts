/** Planilha Google compartilhada (Inventário/Estoque/Saídas — fora do escopo embalagem DB). */
export const EMBALAGEM_LEGACY_SPREADSHEET_ID =
  '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM';

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
} as const;

export const EMBALAGEM_PRODUCAO_DESTINO = {
  spreadsheetId: EMBALAGEM_LEGACY_SPREADSHEET_ID,
  tabName: '6 - Embalagem',
} as const;

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

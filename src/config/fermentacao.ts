export const PEDIDOS_FERMENTACAO_CONFIG = {
  origemClientes: {
    spreadsheetId: process.env.NEXT_PUBLIC_CLIENTES_SHEET_ID || '1-YyKoGWHUWKBLnqK35mf9varGS-DA104AldE_APS6qw',
    tabName: 'De Para Razao Social',
    column: 'G',
    headerRow: 1,
  },
  origemProdutos: {
    spreadsheetId: process.env.NEXT_PUBLIC_PRODUTOS_SHEET_ID || '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
    tabName: 'Produtos',
    productColumn: 'A',
    unitColumn: 'B',
    headerRow: 2,
  },
  destinoPedidos: {
    spreadsheetId: '1oqcxI5Qy2NsnYr5vdDtnI1Le7Mb5izKD-kQLYlj3VJM',
    tabName: 'Pedido de Forno', // Mesma aba do forno
  }
} as const;

export type PedidoFermentacaoItem = {
  produto: string;
  latas: number;
  unidades: number;
  kg: number;
};

export type PedidoFermentacaoPayload = {
  dataPedido: string; // yyyy-mm-dd
  itens: PedidoFermentacaoItem[];
};

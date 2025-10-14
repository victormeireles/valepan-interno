export const PEDIDOS_FORNO_CONFIG = {
  origemProdutos: {
    spreadsheetId: process.env.NEXT_PUBLIC_PRODUTOS_SHEET_ID || '1WsdJ4ocAhLis_7eDkPDHgYMraNqmRe0I2XQJK-mrHcI',
    tabName: 'Produtos',
    productColumn: 'A',
    unitColumn: 'B',
    headerRow: 2,
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



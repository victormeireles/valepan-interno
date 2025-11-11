import { PEDIDOS_EMBALAGEM_CONFIG } from './embalagem';

const DEFAULT_SAIDAS_TAB_NAME =
  process.env.NEXT_PUBLIC_PRODUCAO_TAB_SAIDAS || 'Pedido de saídas';

type QuantityColumnMap = {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

export const SAIDAS_SHEET_COLUMNS = {
  data: 0,
  cliente: 1,
  observacao: 2,
  produto: 3,
  meta: {
    caixas: 4,
    pacotes: 5,
    unidades: 6,
    kg: 7,
  } as QuantityColumnMap,
  createdAt: 8,
  updatedAt: 9,
  realizado: {
    caixas: 10,
    pacotes: 11,
    unidades: 12,
    kg: 13,
  } as QuantityColumnMap,
  saidaUpdatedAt: 14,
  fotoUrl: 15,
  fotoId: 16,
} as const;

export const SAIDAS_SHEET_CONFIG = {
  origemClientes: PEDIDOS_EMBALAGEM_CONFIG.origemClientes,
  origemProdutos: PEDIDOS_EMBALAGEM_CONFIG.origemProdutos,
  destino: {
    spreadsheetId: PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos.spreadsheetId,
    tabName: DEFAULT_SAIDAS_TAB_NAME,
    quantidadeColumns: SAIDAS_SHEET_COLUMNS.meta,
    realizadoColumns: SAIDAS_SHEET_COLUMNS.realizado,
  },
} as const;

export type SaidasQuantidadeColumns = typeof SAIDAS_SHEET_COLUMNS.meta;
export type SaidasRealizadoColumns = typeof SAIDAS_SHEET_COLUMNS.realizado;



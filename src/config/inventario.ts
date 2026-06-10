import { EMBALAGEM_LEGACY_SPREADSHEET_ID, PEDIDOS_EMBALAGEM_CONFIG } from './embalagem';

const DEFAULT_INVENTARIO_TAB_NAME =
  process.env.NEXT_PUBLIC_PRODUCAO_TAB_INVENTARIO || 'Inventário';

const DEFAULT_ESTOQUE_TAB_NAME =
  process.env.NEXT_PUBLIC_PRODUCAO_TAB_ESTOQUE || 'Estoque';

type QuantityColumnMap = {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

export const INVENTARIO_SHEET_COLUMNS = {
  data: 0,
  cliente: 1,
  produto: 2,
  quantidade: {
    caixas: 3,
    pacotes: 4,
    unidades: 5,
    kg: 6,
  } as QuantityColumnMap,
  createdAt: 7,
  updatedAt: 8,
} as const;

export const ESTOQUE_SHEET_COLUMNS = {
  cliente: 0,
  produto: 1,
  quantidade: {
    caixas: 2,
    pacotes: 3,
    unidades: 4,
    kg: 5,
  } as QuantityColumnMap,
  inventarioAtualizadoEm: 6,
  atualizadoEm: 7,
} as const;

export const INVENTARIO_SHEET_CONFIG = {
  origemClientes: PEDIDOS_EMBALAGEM_CONFIG.origemClientes,
  origemProdutos: PEDIDOS_EMBALAGEM_CONFIG.origemProdutos,
  destinoInventario: {
    spreadsheetId: EMBALAGEM_LEGACY_SPREADSHEET_ID,
    tabName: DEFAULT_INVENTARIO_TAB_NAME,
    quantidadeColumns: INVENTARIO_SHEET_COLUMNS.quantidade,
  },
  destinoEstoque: {
    spreadsheetId: EMBALAGEM_LEGACY_SPREADSHEET_ID,
    tabName: DEFAULT_ESTOQUE_TAB_NAME,
    quantidadeColumns: ESTOQUE_SHEET_COLUMNS.quantidade,
  },
} as const;

export type InventarioQuantidadeColumns =
  typeof INVENTARIO_SHEET_COLUMNS.quantidade;
export type EstoqueQuantidadeColumns =
  typeof ESTOQUE_SHEET_COLUMNS.quantidade;



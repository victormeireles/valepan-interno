import { EMBALAGEM_LEGACY_SPREADSHEET_ID } from './embalagem';

const DEFAULT_ESTOQUE_TAB_NAME =
  process.env.NEXT_PUBLIC_PRODUCAO_TAB_ESTOQUE || 'Estoque';

type QuantityColumnMap = {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

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

export const ESTOQUE_SHEET_CONFIG = {
  spreadsheetId: EMBALAGEM_LEGACY_SPREADSHEET_ID,
  tabName: DEFAULT_ESTOQUE_TAB_NAME,
  quantidadeColumns: ESTOQUE_SHEET_COLUMNS.quantidade,
} as const;

export type EstoqueQuantidadeColumns =
  typeof ESTOQUE_SHEET_COLUMNS.quantidade;

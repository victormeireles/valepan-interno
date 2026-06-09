/** Colunas A–J da aba Pedido de embalagem (pedido/meta). */
export const PEDIDO_SHEET_COL = {
  dataProducao: 0,
  dataFabricacaoEtiqueta: 1,
  cliente: 2,
  observacao: 3,
  produto: 4,
  pedidoCaixas: 6,
  pedidoPacotes: 7,
  pedidoUnidades: 8,
  pedidoKg: 9,
} as const;

/** Colunas M–P (realizado de embalagem na mesma aba). */
export const PRODUCAO_SHEET_COL = {
  caixas: 12,
  pacotes: 13,
  unidades: 14,
  kg: 15,
} as const;

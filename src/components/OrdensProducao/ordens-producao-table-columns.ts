/**
 * Larguras proporcionais à hierarquia da informação (data-table UX):
 * - Identificador principal (produto) recebe a maior fatia
 * - Metadados secundários ficam compactos com truncate + title
 * - Números com largura fixa proporcional pequena
 * - Controles (checkbox, drag, #, menu) mínimos
 */
export const ORDENS_PRODUCAO_TABLE_COLUMN_WIDTHS = [
  '3%', // seleção
  '2.5%', // arrastar
  '2%', // prioridade
  '36%', // produto — coluna principal
  '12%', // assadeira
  '8%', // cliente
  '5%', // data etiqueta
  '12%', // obs
  '5%', // latas
  '5%', // caixas
  '6.5%', // unidades
  '3%', // ações
] as const;

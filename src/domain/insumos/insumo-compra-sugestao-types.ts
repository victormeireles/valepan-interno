import type { InsumoCompraJanelaTipo } from './insumo-compra-janela';

export type InsumoCompraSugestaoStatus =
  | 'urgente'
  | 'pedir_fora_janela'
  | 'pedir_hoje'
  | 'adiar_lote_minimo'
  | 'ok'
  | 'sem_consumo'
  | 'sem_regra';

export type InsumoCompraSugestaoInput = {
  estoque: number;
  /** Consumo por dia útil (média semanal / 5,5). */
  consumoDiario: number;
  leadTimeDias: number;
  quantidadeMinima: number | null;
  quantidadeMaxima: number | null;
  janelaTipo: InsumoCompraJanelaTipo;
  diasSemana: number[] | null;
  dayOfWeek: number;
  temRegraAtiva: boolean;
};

export type InsumoCompraSugestaoResult = {
  status: InsumoCompraSugestaoStatus;
  quantidadeSugerida: number | null;
  coberturaAtualDias: number | null;
  metaEstoque: number | null;
  motivo: string;
};

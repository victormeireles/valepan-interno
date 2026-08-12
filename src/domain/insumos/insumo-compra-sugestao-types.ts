export type InsumoCompraSugestaoStatus =
  | 'urgente'
  | 'pedir_fora_janela'
  | 'pedir_hoje'
  | 'adiar_lote_minimo'
  | 'ok'
  | 'sem_consumo'
  | 'sem_regra';

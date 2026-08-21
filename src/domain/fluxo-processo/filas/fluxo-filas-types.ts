import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoFilaKey = 'aProduzir' | 'fermentando' | 'resfriando' | 'embalado' | 'perdas';

export type FluxoFilaItemOrigem = 'op_do_dia' | 'op_anterior' | 'sem_op';

export type FluxoFilaPerdaOrigem = 'fermentacao' | 'forno' | 'embalagem';

export type FluxoFilaItem = {
  ordemProducaoId: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  observacao: string;
  volumeUn: number;
  preso: boolean;
  presoMin: number | null;
  naFilaMin: number | null;
  ultimoLoteEm: string | null;
  dataOp: string | null;
  origem: FluxoFilaItemOrigem;
  /** Preenchido só na fila Perdas: etapa cujo fechamento gerou o saldo. */
  perdaOrigem: FluxoFilaPerdaOrigem | null;
};

export type FluxoFilaUltimoLote = {
  produtoNome: string;
  assadeiraNome: string;
  volumeUn: number;
  produzidoEm: string;
};

export type FluxoFilaResumo = {
  totalUn: number;
  anteriorUn: number;
  presoUn: number;
  items: FluxoFilaItem[];
  /** Último apontamento da etapa (ferm/forno/emb); null em a produzir. */
  ultimoLote: FluxoFilaUltimoLote | null;
};

export type FluxoFilasDia = {
  aProduzir: FluxoFilaResumo;
  fermentando: FluxoFilaResumo;
  resfriando: FluxoFilaResumo;
  embalado: FluxoFilaResumo;
  perdas: FluxoFilaResumo;
};

export type FluxoFilasOpInput = {
  id: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  observacao: string;
  unidades: number;
  latas: number;
  caixas: number;
  dataProducao: string;
  fermentacaoFinalizada?: boolean;
  fornoFinalizada?: boolean;
  embalagemFinalizada?: boolean;
};

export type FluxoFilasBuilderInput = {
  ops: FluxoFilasOpInput[];
  opsAnteriores: FluxoFilasOpInput[];
  eventosFerm: FluxoControleEventoInput[];
  eventosForno: FluxoControleEventoInput[];
  eventosEmb: FluxoControleEventoInput[];
  camaraMin: number;
  resfrioMin: number;
  asOfMs: number;
};

import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoFilaKey = 'aProduzir' | 'fermentando' | 'resfriando' | 'embalado';

export type FluxoFilaItemOrigem = 'op_do_dia' | 'op_anterior' | 'sem_op';

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
};

export type FluxoFilaResumo = {
  totalUn: number;
  anteriorUn: number;
  presoUn: number;
  items: FluxoFilaItem[];
};

export type FluxoFilasDia = {
  aProduzir: FluxoFilaResumo;
  fermentando: FluxoFilaResumo;
  resfriando: FluxoFilaResumo;
  embalado: FluxoFilaResumo;
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

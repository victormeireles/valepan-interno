import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoFilaKey = 'aProduzir' | 'fermentando' | 'resfriando';

export type FluxoFilaItem = {
  ordemProducaoId: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  volumeUn: number;
  preso: boolean;
  presoMin: number | null;
  ultimoLoteEm: string | null;
};

export type FluxoFilaResumo = {
  totalUn: number;
  presoUn: number;
  items: FluxoFilaItem[];
};

export type FluxoFilasDia = {
  aProduzir: FluxoFilaResumo;
  fermentando: FluxoFilaResumo;
  resfriando: FluxoFilaResumo;
};

export type FluxoFilasOpInput = {
  id: string;
  ordemPlanejamento: number;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
};

export type FluxoFilasBuilderInput = {
  ops: FluxoFilasOpInput[];
  eventosFerm: FluxoControleEventoInput[];
  eventosForno: FluxoControleEventoInput[];
  eventosEmb: FluxoControleEventoInput[];
  camaraMin: number;
  resfrioMin: number;
  asOfMs: number;
};

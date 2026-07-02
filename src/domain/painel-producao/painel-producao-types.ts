export type PainelProducaoStatusFilter =
  | 'todos'
  | 'aguardando'
  | 'fermentando'
  | 'forno'
  | 'embalando'
  | 'concluido';

export type PainelProducaoStatus =
  | 'aguardando'
  | 'fermentando'
  | 'forno'
  | 'embalando'
  | 'concluido';

export type PainelProducaoLoteView = {
  qtd: string;
  hora: string;
};

export type PainelProducaoStageView = {
  done: number;
  meta: number;
  unit: string;
  fim: string | null;
  lotes: PainelProducaoLoteView[];
};

export type PainelProducaoProduct = {
  id: string;
  ordemPlanejamento: number;
  name: string;
  cliente: string;
  congelado?: boolean;
  assadeira?: string;
  fermentacaoFinalizada: boolean;
  fornoFinalizada: boolean;
  embalagemFinalizada: boolean;
  ferm: PainelProducaoStageView;
  forno: PainelProducaoStageView;
  emb: PainelProducaoStageView;
};

export type PainelProducaoAreaId = 'ferm' | 'forno' | 'emb';

export type PainelProducaoAreaView = {
  id: PainelProducaoAreaId;
  name: string;
  icon: string;
  accent: string;
  unit: string;
  done: number;
  meta: number;
  ritmo: number;
  ritmoOntem: number;
  ritmoSemana: number;
  janelaIni: string;
  janelaFim: string;
  janela: string;
  producaoEncerrada: boolean;
};

export type PainelProducaoData = {
  dia: string;
  diaLabel: string;
  agora: string;
  op: string;
  areas: PainelProducaoAreaView[];
  products: PainelProducaoProduct[];
};

export type CargaPainelProducaoResponse = {
  date: string;
  ultimaDataComDados: string | null;
  painel: PainelProducaoData;
};

export type PainelProducaoRitmoEntry = {
  quantity: number;
  timestamp: string;
};

export type EstimativaProducaoParams = {
  dataProducao: string;
  horarioInicioProducao: string;
  horarioInicioForno: string;
  horarioInicioEmbalagem: string;
  tempoMedioFermentacaoMin: number;
  tempoMedioResfriamentoMin: number;
  taxaAssadeirasHoraProducao: number;
  taxaAssadeirasHoraForno: number;
  taxaCaixasHoraEmbalagem: number;
};

export type EstimativaProducaoOrdemInput = {
  id: string;
  ordemPlanejamento: number;
  assadeiras: number;
  caixas: number;
};

export type EstimativaProducaoInput = {
  params: EstimativaProducaoParams;
  ordens: EstimativaProducaoOrdemInput[];
};

export type EstimativaProducaoHorarios = {
  fermentacaoInicioPrevisto: string;
  fermentacaoFimPrevisto: string;
  camaraFimPrevisto: string;
  fornoInicioPrevisto: string;
  fornoFimPrevisto: string;
  resfriamentoFimPrevisto: string;
  embalagemInicioPrevisto: string;
  embalagemFimPrevisto: string;
};

export type EstimativaProducaoRow = EstimativaProducaoHorarios & {
  ordemProducaoId: string;
};

export type EstimativaPersistRow = EstimativaProducaoRow & {
  taxaAssadeirasHoraProducao: number;
  taxaAssadeirasHoraForno: number;
  taxaCaixasHoraEmbalagem: number;
  tempoMedioFermentacaoMin: number;
  tempoMedioResfriamentoMin: number;
};

export type EstimativaRecalcStatus = 'ok' | 'sem_produtividade' | 'vazio';

export type EstimativaRecalcResult = {
  status: EstimativaRecalcStatus;
};

export type EstimativaProdutividadeMensal = {
  anoMes: string;
  taxaAssadeirasHoraProducao: number;
  taxaAssadeirasHoraForno: number;
  taxaCaixasHoraEmbalagem: number;
};

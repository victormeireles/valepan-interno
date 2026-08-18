export type ConfigOperacaoSnapshot = {
  horarioInicioProducao: string;
  horarioFimProducao: string;
  horarioInicioForno: string;
  horarioFimForno: string;
  horarioInicioEmbalagem: string;
  horarioFimEmbalagem: string;
  tempoMedioFermentacaoMin: number;
  tempoMedioResfriamentoMin: number;
  updatedAt: string | null;
};

export type ConfigOperacaoPatch = Partial<
  Omit<ConfigOperacaoSnapshot, 'updatedAt'>
>;

export type ConfigOperacaoRow = {
  horario_inicio_producao: string;
  horario_fim_producao: string;
  horario_inicio_forno: string;
  horario_fim_forno: string;
  horario_inicio_embalagem: string;
  horario_fim_embalagem: string;
  tempo_medio_fermentacao_min: number;
  tempo_medio_resfriamento_min: number;
  updated_at: string;
};

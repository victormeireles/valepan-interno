import type {
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';

export type ConfigOperacaoTurno = {
  etapa: ProducaoTurnoEtapaId;
  numero: ProducaoTurnoNumero;
  inicio: string;
  fim: string;
};

export type ConfigOperacaoTurnoRow = {
  etapa: string;
  numero: number;
  inicio: string;
  fim: string;
};

export type ConfigOperacaoSnapshot = {
  horarioInicioProducao: string;
  horarioFimProducao: string;
  horarioInicioForno: string;
  horarioFimForno: string;
  horarioInicioEmbalagem: string;
  horarioFimEmbalagem: string;
  tempoMedioFermentacaoMin: number;
  tempoMedioResfriamentoMin: number;
  turnos: ConfigOperacaoTurno[];
  updatedAt: string | null;
};

export type ConfigOperacaoPatch = {
  turnos?: ConfigOperacaoTurno[];
  tempoMedioFermentacaoMin?: number;
  tempoMedioResfriamentoMin?: number;
};

export type ConfigOperacaoRow = {
  tempo_medio_fermentacao_min: number;
  tempo_medio_resfriamento_min: number;
  updated_at: string;
};

export type ProducaoTurnoEtapaId = 'fermentacao' | 'forno' | 'embalagem';
export type ProducaoTurnoNumero = 1 | 2 | 3;

export type ProducaoTurnoCadastrado = {
  numero: ProducaoTurnoNumero;
  inicio: string;
  fim: string;
};

export type ProducaoTurnoAtivo = {
  numero: ProducaoTurnoNumero;
  confirmadoEm: string;
};

export type ProducaoTurnoDia = {
  startMs: number;
  endMs: number;
};

export type ProducaoTurnoPromptKind = 'nenhum' | 'definir' | 'confirmar_fora';

export type ProducaoTurnoPromptInput = {
  nowMs: number;
  agoraMin: number;
  turnos: ProducaoTurnoCadastrado[];
  ativo: ProducaoTurnoAtivo | null;
};

export type ProducaoTurnoPromptDecision = {
  kind: ProducaoTurnoPromptKind;
  ativoValido: boolean;
  numeroAtivo: ProducaoTurnoNumero | null;
  turnoVigente: ProducaoTurnoNumero | null;
};

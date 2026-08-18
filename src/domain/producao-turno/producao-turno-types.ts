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

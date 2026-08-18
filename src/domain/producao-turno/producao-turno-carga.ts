import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
} from './producao-turno-types';

export type ProducaoTurnoCargaAtivo = {
  numero: ProducaoTurnoAtivo['numero'];
  confirmadoEm: string;
  valido: boolean;
};

export type ProducaoTurnoCargaDto = {
  turnos: ProducaoTurnoCadastrado[];
  turnoAtivo: ProducaoTurnoCargaAtivo | null;
};

export function turnoLabelFromNumero(
  turno: ProducaoTurnoNumero | null | undefined,
): 'T1' | 'T2' | 'T3' | undefined {
  if (turno !== 1 && turno !== 2 && turno !== 3) return undefined;
  return `T${turno}`;
}

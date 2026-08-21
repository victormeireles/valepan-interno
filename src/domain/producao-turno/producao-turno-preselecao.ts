import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';
import { isClockInJanela } from './producao-turno-janela';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
} from './producao-turno-types';

const MINUTES_PER_DAY = 24 * 60;

export type TurnoPreselecaoInput = {
  turnos: ProducaoTurnoCadastrado[];
  agoraMin: number;
  ultimo: ProducaoTurnoNumero | null;
};

function minutesSinceFim(agoraMin: number, fim: string): number {
  const fimMin = toMinutesFromClock(fim);
  return (agoraMin - fimMin + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

function pickHoraExtra(turnos: ProducaoTurnoCadastrado[], agoraMin: number): ProducaoTurnoNumero {
  return [...turnos].sort((a, b) => {
    const delta = minutesSinceFim(agoraMin, a.fim) - minutesSinceFim(agoraMin, b.fim);
    return delta !== 0 ? delta : a.numero - b.numero;
  })[0].numero;
}

export function resolveTurnoPreselecao(input: TurnoPreselecaoInput): ProducaoTurnoNumero | null {
  const { turnos, agoraMin, ultimo } = input;
  if (turnos.length === 0) return null;

  if (ultimo != null && turnos.some((turno) => turno.numero === ultimo)) {
    return ultimo;
  }

  const naJanela = turnos.filter((turno) =>
    isClockInJanela(agoraMin, turno.inicio, turno.fim),
  );
  if (naJanela.length === 1) return naJanela[0].numero;
  if (naJanela.length === 0) return pickHoraExtra(turnos, agoraMin);
  return null;
}

import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';
import type { ProducaoTurnoCadastrado } from './producao-turno-types';

const MINUTES_PER_DAY = 24 * 60;

/** Offset no eixo desde T1.inicio; clocks antes de T1.inicio somam 24h (overnight). */
function axisMinutes(clock: string, t1InicioMin: number): number {
  let minutes = toMinutesFromClock(clock);
  if (minutes < t1InicioMin) minutes += MINUTES_PER_DAY;
  return minutes;
}

export function assertTurnosEtapaValidos(turnos: ProducaoTurnoCadastrado[]): string | null {
  const sorted = [...turnos].sort((a, b) => a.numero - b.numero);
  const numeros = new Set(sorted.map((t) => t.numero));

  if (!numeros.has(1)) {
    return 'O 1º turno é obrigatório.';
  }

  if (numeros.has(3) && !numeros.has(2)) {
    return 'Ligue o 2º turno antes do 3º.';
  }

  for (const turno of sorted) {
    if (turno.inicio === turno.fim) {
      return 'Início e fim do turno não podem ser iguais.';
    }
  }

  const t1 = sorted.find((t) => t.numero === 1)!;
  const t1InicioMin = toMinutesFromClock(t1.inicio);

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const fimAtual = axisMinutes(current.fim, t1InicioMin);
    const inicioProximo = axisMinutes(next.inicio, t1InicioMin);
    if (inicioProximo < fimAtual) {
      return 'Os turnos desta etapa se sobrepõem.';
    }
  }

  return null;
}

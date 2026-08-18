import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';
import type { ProducaoTurnoCadastrado } from './producao-turno-types';

const MINUTES_PER_DAY = 24 * 60;
const OVERLAP_MESSAGE = 'Os turnos desta etapa se sobrepõem.';

/** Offset no eixo; se o relógio for antes do início anterior, soma 24h (monotônico). */
function axisMinutes(clock: string, previousStartOnAxis: number): number {
  const minutes = toMinutesFromClock(clock);
  return minutes < previousStartOnAxis ? minutes + MINUTES_PER_DAY : minutes;
}

function placeOnAxis(
  sorted: ProducaoTurnoCadastrado[],
): Array<{ inicio: number; fim: number }> {
  let previousStart = toMinutesFromClock(sorted[0].inicio);
  return sorted.map((turno) => {
    const inicio = axisMinutes(turno.inicio, previousStart);
    const fim = axisMinutes(turno.fim, inicio);
    previousStart = inicio;
    return { inicio, fim };
  });
}

export function assertTurnosEtapaValidos(turnos: ProducaoTurnoCadastrado[]): string | null {
  const sorted = [...turnos].sort((a, b) => a.numero - b.numero);
  const numeros = new Set(sorted.map((t) => t.numero));

  if (!numeros.has(1)) {
    return 'O 1º turno é obrigatório.';
  }

  for (const turno of sorted) {
    if (turno.inicio === turno.fim) {
      return 'Início e fim do turno não podem ser iguais.';
    }
  }

  const axis = placeOnAxis(sorted);
  for (let i = 0; i < axis.length - 1; i++) {
    if (axis[i + 1].inicio < axis[i].fim) {
      return OVERLAP_MESSAGE;
    }
  }

  const t1InicioMin = toMinutesFromClock(sorted[0].inicio);
  const lastFim = axis[axis.length - 1].fim;
  if (lastFim > t1InicioMin + MINUTES_PER_DAY) {
    return OVERLAP_MESSAGE;
  }

  if (numeros.has(3) && !numeros.has(2)) {
    return 'Ligue o 2º turno antes do 3º.';
  }

  return null;
}

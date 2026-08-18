import { janelaDurationMinutes } from '@/domain/painel-producao/painel-producao-time';
import {
  addCalendarDaysISO,
  brazilClockUtcMs,
  getBrazilDateISOFromInstant,
} from '@/lib/utils/date-utils';
import type { ProducaoTurnoCadastrado, ProducaoTurnoDia } from './producao-turno-types';

export class ProducaoTurnoDiaResolver {
  resolve(nowMs: number, turnos: ProducaoTurnoCadastrado[]): ProducaoTurnoDia | null {
    if (turnos.length === 0) return null;

    const sorted = [...turnos].sort((a, b) => a.numero - b.numero);
    const t1 = sorted[0];
    const last = sorted[sorted.length - 1];

    const durationMs = janelaDurationMinutes(t1.inicio, last.fim) * 60_000;
    if (durationMs <= 0) return null;

    const todayISO = getBrazilDateISOFromInstant(new Date(nowMs));
    const yesterdayISO = addCalendarDaysISO(todayISO, -1);

    const candidates = [todayISO, yesterdayISO].map((dateISO) => {
      const startMs = brazilClockUtcMs(dateISO, t1.inicio);
      return { startMs, endMs: startMs + durationMs };
    });

    for (const candidate of candidates) {
      if (nowMs >= candidate.startMs && nowMs < candidate.endMs) {
        return candidate;
      }
    }

    return null;
  }
}

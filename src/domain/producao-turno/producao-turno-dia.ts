import {
  addCalendarDaysISO,
  brazilClockUtcMs,
  getBrazilDateISOFromInstant,
} from '@/lib/utils/date-utils';
import type { ProducaoTurnoCadastrado, ProducaoTurnoDia } from './producao-turno-types';

const DAY_MS = 24 * 60 * 60 * 1000;

export class ProducaoTurnoDiaResolver {
  resolve(nowMs: number, turnos: ProducaoTurnoCadastrado[]): ProducaoTurnoDia | null {
    if (turnos.length === 0) return null;

    const t1 = [...turnos].find((turno) => turno.numero === 1);
    if (!t1) return null;

    const todayISO = getBrazilDateISOFromInstant(new Date(nowMs));
    const yesterdayISO = addCalendarDaysISO(todayISO, -1);

    const candidates = [todayISO, yesterdayISO].map((dateISO) => {
      const startMs = brazilClockUtcMs(dateISO, t1.inicio);
      return { startMs, endMs: startMs + DAY_MS };
    });

    for (const candidate of candidates) {
      if (nowMs >= candidate.startMs && nowMs < candidate.endMs) {
        return candidate;
      }
    }

    return null;
  }
}

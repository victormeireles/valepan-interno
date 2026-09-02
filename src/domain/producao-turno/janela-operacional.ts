import { addCalendarDaysISO, brazilClockUtcMs } from '@/lib/utils/date-utils';

const DAY_MS = 24 * 60 * 60 * 1000;

export type JanelaOperacional = {
  iniMs: number;
  fimMs: number;
  t1Inicio: string;
  startDateISO: string;
};

export class JanelaOperacionalResolver {
  /**
   * Janela de 24h a partir do relógio do T1.
   * O meio-dia escolhe qual ocorrência civil desse relógio (véspera se T1 > 12h),
   * não qual turno cadastrado — quem chama deve passar o `inicio` do numero 1.
   */
  forDate(dateISO: string, t1Inicio: string): JanelaOperacional {
    const noonMs = brazilClockUtcMs(dateISO, '12:00');
    const startMs = brazilClockUtcMs(dateISO, t1Inicio);

    const usePreviousDay = noonMs < startMs;
    const startDateISO = usePreviousDay ? addCalendarDaysISO(dateISO, -1) : dateISO;
    const iniMs = usePreviousDay ? brazilClockUtcMs(startDateISO, t1Inicio) : startMs;

    return {
      iniMs,
      fimMs: iniMs + DAY_MS,
      t1Inicio,
      startDateISO,
    };
  }

  contains(nowMs: number, janela: JanelaOperacional): boolean {
    return nowMs >= janela.iniMs && nowMs < janela.fimMs;
  }

  t1Hour(t1Inicio: string): number {
    return parseInt(t1Inicio.slice(0, 2), 10);
  }

  hoursAxis(t1Inicio: string): number[] {
    const base = this.t1Hour(t1Inicio);
    return Array.from({ length: 24 }, (_, i) => (base + i) % 24);
  }

  union(janelas: JanelaOperacional[]): { iniMs: number; fimMs: number } {
    return {
      iniMs: Math.min(...janelas.map((j) => j.iniMs)),
      fimMs: Math.max(...janelas.map((j) => j.fimMs)),
    };
  }

  toIsoRange(janela: { iniMs: number; fimMs: number }): { startIso: string; endIso: string } {
    return {
      startIso: new Date(janela.iniMs).toISOString(),
      endIso: new Date(janela.fimMs).toISOString(),
    };
  }

  civilHourDateISO(janela: JanelaOperacional, hour: number): string {
    const t1 = this.t1Hour(janela.t1Inicio);
    if (hour >= t1) return janela.startDateISO;
    return addCalendarDaysISO(janela.startDateISO, 1);
  }
}

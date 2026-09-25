import { addCalendarDaysISO } from '@/lib/utils/date-utils';

export type FaltaPeriodo = { inicio: string; fim: string };

export class FaltaPeriodoCalculo {
  mesAteOntem(hoje: string): FaltaPeriodo {
    const fim = addCalendarDaysISO(hoje, -1);
    const inicio = `${hoje.slice(0, 8)}01`;
    return { inicio, fim: fim < inicio ? inicio : fim };
  }

  mesAnterior(periodo: FaltaPeriodo): FaltaPeriodo {
    return {
      inicio: this.deslocarMes(periodo.inicio, -1),
      fim: this.deslocarMes(periodo.fim, -1),
    };
  }

  private deslocarMes(iso: string, delta: number): string {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const alvo = new Date(Date.UTC(ano, mes - 1 + delta, 1));
    const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    const y = alvo.getUTCFullYear();
    const m = String(alvo.getUTCMonth() + 1).padStart(2, '0');
    const d = String(Math.min(dia, ultimo)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

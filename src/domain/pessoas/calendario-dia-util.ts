import { addCalendarDaysISO } from '@/lib/utils/date-utils';

/** Segunda a sábado. Domingo não é dia de trabalho. */
export class CalendarioDiaUtil {
  ehUtil(iso: string): boolean {
    return this.diaSemana(iso) !== 0;
  }

  proximoUtil(iso: string): string {
    let cursor = addCalendarDaysISO(iso, 1);
    while (!this.ehUtil(cursor)) cursor = addCalendarDaysISO(cursor, 1);
    return cursor;
  }

  contarUteis(de: string, ate: string): number {
    if (ate < de) return 0;
    let total = 0;
    let cursor = de;
    while (cursor <= ate) {
      if (this.ehUtil(cursor)) total += 1;
      cursor = addCalendarDaysISO(cursor, 1);
    }
    return total;
  }

  private diaSemana(iso: string): number {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  }
}

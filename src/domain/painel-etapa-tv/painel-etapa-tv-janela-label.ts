import { formatJanelaClockLabel } from '@/domain/painel-producao/painel-producao-time';
import type { JanelaOperacional } from '@/domain/producao-turno/janela-operacional';
import { addCalendarDaysISO } from '@/lib/utils/date-utils';

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

function dayMonthLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)} ${MONTHS_PT[Number(month) - 1]}`;
}

export class PainelEtapaTvJanelaLabel {
  static format(dateISO: string, janela: JanelaOperacional): string {
    const clock = formatJanelaClockLabel(janela.t1Inicio);
    const start = dayMonthLabel(janela.startDateISO);
    const end = dayMonthLabel(addCalendarDaysISO(janela.startDateISO, 1));
    return `OP ${dayMonthLabel(dateISO)} · turnos ${clock} de ${start} → ${clock} de ${end}`;
  }
}

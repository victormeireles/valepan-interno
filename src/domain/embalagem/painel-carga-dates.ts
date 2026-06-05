import { addCalendarDaysISO } from '@/lib/utils/date-utils';

export function resolveCargaComparisonDates(selectedDate: string) {
  return {
    dateSemana: addCalendarDaysISO(selectedDate, -7),
  };
}

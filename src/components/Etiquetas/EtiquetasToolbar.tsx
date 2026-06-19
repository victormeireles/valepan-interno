'use client';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import {
  ordensProducaoTitleClass,
  ordensProducaoToolbarClass,
  ordensProducaoToolbarFiltersRowClass,
  ordensProducaoToolbarTopRowClass,
} from '@/components/OrdensProducao/ordens-producao-theme';
import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

export type EtiquetasToolbarProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onManualClick: () => void;
};

export default function EtiquetasToolbar({
  selectedDate,
  onDateChange,
  onManualClick,
}: EtiquetasToolbarProps) {
  const today = getTodayISOInBrazilTimezone();
  const isToday = selectedDate === today;
  const isYesterday = selectedDate === addCalendarDaysISO(today, -1);

  return (
    <header className={ordensProducaoToolbarClass}>
      <div className={ordensProducaoToolbarTopRowClass}>
        <h1 className={ordensProducaoTitleClass}>Etiquetas</h1>
        <Button type="button" variant="primary" icon="add" onClick={onManualClick}>
          Gerar etiqueta manual
        </Button>
      </div>

      <div className={ordensProducaoToolbarFiltersRowClass}>
        <DateField
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="Data da fila"
          widthClass="w-[9.25rem] max-w-[9.25rem]"
        />
        <Chip active={isToday} onClick={() => onDateChange(today)}>
          Hoje
        </Chip>
        <Chip active={isYesterday} onClick={() => onDateChange(addCalendarDaysISO(today, -1))}>
          Ontem
        </Chip>
      </div>
    </header>
  );
}

'use client';

import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import {
  ordensProducaoTitleClass,
  ordensProducaoToolbarClass,
  ordensProducaoToolbarFiltersRowClass,
  ordensProducaoToolbarResumoClass,
  ordensProducaoToolbarTopRowClass,
} from '@/components/OrdensProducao/ordens-producao-theme';

type OrdensProducaoToolbarProps = {
  filterDate: string;
  onDateChange: (date: string) => void;
  totalOrdens: number;
  totalLatas: number;
  totalUnidades: number;
  totalCaixas: number;
  onImport: () => void;
  onNewOrder: () => void;
};

function formatQty(value: number): string {
  return value.toLocaleString('pt-BR');
}

export default function OrdensProducaoToolbar({
  filterDate,
  onDateChange,
  totalOrdens,
  totalLatas,
  totalUnidades,
  totalCaixas,
  onImport,
  onNewOrder,
}: OrdensProducaoToolbarProps) {
  const today = getTodayISOInBrazilTimezone();
  const isToday = filterDate === today;
  const isYesterday = filterDate === addCalendarDaysISO(today, -1);
  const isTomorrow = filterDate === addCalendarDaysISO(today, 1);

  const resumoLabel =
    totalOrdens === 0
      ? '0 ordens'
      : `${totalOrdens} ${totalOrdens === 1 ? 'ordem' : 'ordens'} • ${formatQty(totalLatas)} LT • ${formatQty(totalUnidades)} UN • ${formatQty(totalCaixas)} CX`;

  return (
    <header className={ordensProducaoToolbarClass}>
      <div className={ordensProducaoToolbarTopRowClass}>
        <h1 className={ordensProducaoTitleClass}>Ordens de Produção</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" icon="upload_file" onClick={onImport}>
            Importar CSV
          </Button>
          <Button type="button" variant="primary" icon="add" onClick={onNewOrder}>
            Nova ordem
          </Button>
        </div>
      </div>

      <div className={ordensProducaoToolbarFiltersRowClass}>
        <DateField
          value={filterDate}
          onChange={(e) => onDateChange(e.target.value)}
          aria-label="Data de produção"
        />
        <Chip active={isToday} onClick={() => onDateChange(today)}>
          Hoje
        </Chip>
        <Chip active={isYesterday} onClick={() => onDateChange(addCalendarDaysISO(today, -1))}>
          Ontem
        </Chip>
        <Chip active={isTomorrow} onClick={() => onDateChange(addCalendarDaysISO(today, 1))}>
          Amanhã
        </Chip>
        <p className={ordensProducaoToolbarResumoClass}>{resumoLabel}</p>
      </div>
    </header>
  );
}

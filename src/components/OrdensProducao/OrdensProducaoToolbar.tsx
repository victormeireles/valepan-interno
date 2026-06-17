import {
  addCalendarDaysISO,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import {
  ordensProducaoChipClass,
  ordensProducaoDateInputClass,
  ordensProducaoMetaTextClass,
  ordensProducaoPrimaryButtonClass,
  ordensProducaoSecondaryButtonClass,
  ordensProducaoTitleClass,
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
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-stone-200 bg-stone-50/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className={ordensProducaoTitleClass}>Ordens de Produção</h1>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => onDateChange(e.target.value)}
              className={ordensProducaoDateInputClass}
              aria-label="Data de produção"
            />
            <button
              type="button"
              onClick={() => onDateChange(today)}
              className={ordensProducaoChipClass(isToday)}
              aria-pressed={isToday}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => onDateChange(addCalendarDaysISO(today, -1))}
              className={ordensProducaoChipClass(isYesterday)}
              aria-pressed={isYesterday}
            >
              Ontem
            </button>
            <button
              type="button"
              onClick={() => onDateChange(addCalendarDaysISO(today, 1))}
              className={ordensProducaoChipClass(isTomorrow)}
              aria-pressed={isTomorrow}
            >
              Amanhã
            </button>
            <p className={ordensProducaoMetaTextClass}>{resumoLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onImport} className={ordensProducaoSecondaryButtonClass}>
            <span className="material-icons text-base" aria-hidden="true">
              upload_file
            </span>
            Importar CSV
          </button>
          <button type="button" onClick={onNewOrder} className={ordensProducaoPrimaryButtonClass}>
            <span className="material-icons text-base" aria-hidden="true">
              add
            </span>
            Nova ordem
          </button>
        </div>
      </div>
    </header>
  );
}

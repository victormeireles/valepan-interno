'use client';

import { useMemo, type ReactNode } from 'react';
import { belowEtapaToolbarStickyTop } from '@/components/ui/page-shell';
import type { SaidasDashboardItem } from '@/components/Realizado/etapa/types';
import {
  buildHourlyQuantityMap,
  countQuantityWithoutValidHour,
  cumulativeQuantityUntilHour,
  formatIntPtBrOrDash,
  formatIntervaloHoraBr,
  getQuantityForHour,
  unionHoursWithQuantity,
} from '@/domain/realizado/hourly-quantity-metrics';
import {
  formatWeekdayDayMonthBr,
  formatWeekdayPassadaDayMonthBr,
} from '@/lib/utils/date-utils';

type EtapaSaidasDashboardProps = {
  selectedDate: string;
  unitLabel: string;
  unitName: string;
  totalCaixas: number;
  items: SaidasDashboardItem[];
  comparisonPrev: { date: string; items: SaidasDashboardItem[] } | null;
  comparisonWeek: { date: string; items: SaidasDashboardItem[] };
};

function itemsToHourlyEntries(items: SaidasDashboardItem[]) {
  return items
    .filter((item) => item.caixas > 0)
    .map((item) => ({ quantity: item.caixas, timestamp: item.saidaUpdatedAt }));
}

function HourAccumSplitColumns({
  left,
  right,
  inline = false,
}: {
  left: ReactNode;
  right: ReactNode;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <span className="whitespace-nowrap align-baseline tabular-nums">
        <span className="border-r border-stone-200 pr-1">{left}</span>
        <span className="pl-1">{right}</span>
      </span>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-baseline whitespace-nowrap tabular-nums">
      <div className="min-w-0 flex-1 basis-0 border-r border-stone-200 pr-2 text-right">{left}</div>
      <div className="min-w-0 flex-1 basis-0 pl-2 text-left">{right}</div>
    </div>
  );
}

function HourAccumColumnSubheads() {
  const subCls = 'text-[11px] font-normal leading-none text-text-muted sm:text-xs';
  return (
    <HourAccumSplitColumns
      inline
      left={<span className={subCls}>hora</span>}
      right={<span className={subCls}>acum.</span>}
    />
  );
}

function HourColumnHeader({
  title,
  emphasis = 'secondary',
}: {
  title: string;
  emphasis?: 'primary' | 'secondary';
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 leading-tight">
      <span
        className={[
          'text-[13px] leading-snug sm:text-sm',
          emphasis === 'primary'
            ? 'font-semibold text-amber-800'
            : 'font-medium text-text-muted',
        ].join(' ')}
      >
        {title}
      </span>
      <HourAccumColumnSubheads />
    </div>
  );
}

function HourAccumPair({
  map,
  hour,
  emphasis,
  unitLabel,
}: {
  map: Map<number, number>;
  hour: number;
  emphasis: 'primary' | 'secondary';
  unitLabel: string;
}) {
  const qtyHour = getQuantityForHour(map, hour);
  const qtyAccum = cumulativeQuantityUntilHour(map, hour);
  const hourClass =
    emphasis === 'primary' ? 'font-semibold text-amber-800' : 'font-medium text-stone-700';
  const acumClass = emphasis === 'primary' ? 'text-text-muted' : 'text-stone-400';

  return (
    <div
      aria-label={`${qtyHour} ${unitLabel} nesta hora, ${qtyAccum} ${unitLabel} acumulados até este intervalo`}
    >
      <HourAccumSplitColumns
        left={<span className={hourClass}>{formatIntPtBrOrDash(qtyHour)}</span>}
        right={<span className={acumClass}>{formatIntPtBrOrDash(qtyAccum)}</span>}
      />
    </div>
  );
}

export default function EtapaSaidasDashboard({
  selectedDate,
  unitLabel,
  unitName,
  totalCaixas,
  items,
  comparisonPrev,
  comparisonWeek,
}: EtapaSaidasDashboardProps) {
  const fmt = (n: number) => n.toLocaleString('pt-BR');

  const mapDay = useMemo(() => buildHourlyQuantityMap(itemsToHourlyEntries(items)), [items]);
  const mapPrev = useMemo(
    () => buildHourlyQuantityMap(itemsToHourlyEntries(comparisonPrev?.items ?? [])),
    [comparisonPrev],
  );
  const mapWeek = useMemo(
    () => buildHourlyQuantityMap(itemsToHourlyEntries(comparisonWeek.items)),
    [comparisonWeek],
  );

  const hoursUnion = useMemo(
    () => unionHoursWithQuantity(mapDay, mapPrev, mapWeek),
    [mapDay, mapPrev, mapWeek],
  );

  const semHorario = useMemo(
    () => countQuantityWithoutValidHour(itemsToHourlyEntries(items)),
    [items],
  );

  const tituloColFiltro = formatWeekdayDayMonthBr(selectedDate);
  const tituloColPrev = comparisonPrev
    ? formatWeekdayDayMonthBr(comparisonPrev.date)
    : null;
  const tituloColD7 = formatWeekdayPassadaDayMonthBr(comparisonWeek.date);

  return (
    <aside
      className={['min-w-0 space-y-3 min-[960px]:sticky', belowEtapaToolbarStickyTop].join(' ')}
      aria-label="Painel de métricas do dia"
    >
      <section
        className="overflow-hidden rounded-xl border border-border-default bg-surface p-4 shadow-control sm:p-5"
        aria-label="Total de saídas no dia"
      >
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
          Total no dia
        </p>
        <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-text-strong">
          {fmt(totalCaixas)}{' '}
          <span className="text-lg font-medium text-text-muted">{unitLabel}</span>
        </p>
      </section>

      <section
        aria-label={`${unitName} por hora`}
        className="overflow-hidden rounded-xl border border-border-default bg-surface shadow-control"
      >
        {hoursUnion.length === 0 ? (
          <p className="p-4 text-[13px] leading-snug text-text-muted sm:text-[15px]">
            Nenhuma saída com horário nos dias comparados — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] table-fixed border-collapse text-[13px] leading-snug sm:min-w-[32rem] sm:text-[15px]">
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[25%]" />
                <col className="w-[25%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border-default bg-stone-50">
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-left align-bottom font-medium text-text-muted"
                  >
                    Intervalo
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader title={tituloColFiltro} emphasis="primary" />
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader
                      title={tituloColPrev ?? 'Dia anterior (sem dados)'}
                    />
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right align-bottom">
                    <HourColumnHeader title={tituloColD7} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursUnion.map((hour, i) => {
                  const hasToday = getQuantityForHour(mapDay, hour) > 0;
                  return (
                    <tr
                      key={hour}
                      className={[
                        'border-b border-stone-100 last:border-0',
                        hasToday ? 'bg-amber-50/45' : i % 2 ? 'bg-stone-50/60' : 'bg-surface',
                      ].join(' ')}
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-medium tabular-nums text-stone-700"
                      >
                        {formatIntervaloHoraBr(hour)}
                      </th>
                      <td className="px-3 py-2 align-middle">
                        <HourAccumPair
                          map={mapDay}
                          hour={hour}
                          emphasis="primary"
                          unitLabel={unitLabel}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle text-stone-600">
                        {comparisonPrev ? (
                          <HourAccumPair
                            map={mapPrev}
                            hour={hour}
                            emphasis="secondary"
                            unitLabel={unitLabel}
                          />
                        ) : (
                          <div className="text-right tabular-nums text-stone-400">—</div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <HourAccumPair
                          map={mapWeek}
                          hour={hour}
                          emphasis="secondary"
                          unitLabel={unitLabel}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!comparisonPrev && hoursUnion.length > 0 && (
          <p className="px-4 pb-3 text-[13px] leading-snug text-text-muted sm:text-base">
            Não foi encontrado dia anterior com saídas (até 14 dias atrás).
          </p>
        )}
        {semHorario > 0 && (
          <p className="px-4 pb-4 text-[13px] leading-snug text-amber-800 sm:text-base">
            {formatIntPtBrOrDash(semHorario)} {unitLabel}(s) no dia filtrado sem horário de
            registro — não entram na tabela.
          </p>
        )}
      </section>
    </aside>
  );
}

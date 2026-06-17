'use client';

import { useMemo } from 'react';
import type { EtapaDashboardItem } from '@/domain/types/painel-etapa';
import {
  buildHourlyQuantityMap,
  countQuantityWithoutValidHour,
  unionHoursWithQuantity,
} from '@/domain/realizado/hourly-quantity-metrics';
import {
  formatWeekdayDayMonthBr,
  formatWeekdayPassadaDayMonthBr,
} from '@/lib/utils/date-utils';
import HourlyAccumTable from './dashboard/HourlyAccumTable';
import ProductionDaySummary from './dashboard/ProductionDaySummary';

type EtapaAssadeirasDashboardProps = {
  selectedDate: string;
  items: EtapaDashboardItem[];
  comparisonPrev: { date: string; items: EtapaDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EtapaDashboardItem[] };
};

function itemsToHourlyEntries(items: EtapaDashboardItem[]) {
  return items
    .filter((item) => item.assadeiras > 0)
    .map((item) => ({ quantity: item.assadeiras, timestamp: item.produzidoEm }));
}

export default function EtapaAssadeirasDashboard({
  selectedDate,
  items,
  comparisonPrev,
  comparisonWeek,
}: EtapaAssadeirasDashboardProps) {
  const totais = useMemo(() => {
    const meta = items.reduce((sum, item) => sum + (item.pedidoAssadeiras || 0), 0);
    const produzido = items.reduce((sum, item) => sum + (item.assadeiras || 0), 0);
    const falta = Math.max(0, meta - produzido);
    const progressoPct = meta > 0 ? Math.min(100, (produzido / meta) * 100) : 0;

    return { meta, produzido, falta, progressoPct };
  }, [items]);

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

  return (
    <aside
      className="min-w-0 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 shadow-inner lg:sticky lg:top-4 space-y-6"
      aria-label="Painel de métricas do dia"
    >
      <ProductionDaySummary
        producedHeading="Produzido / meta"
        remainingHeading="Falta produzir"
        producedLabel={`${totais.produzido} lt`}
        metaLabel={`${totais.meta} lt`}
        remaining={totais.falta}
        unitLabel="lt"
        progressPct={totais.progressoPct}
        progressAriaLabel="Produzido em latas em relação à meta em latas"
      />

      <HourlyAccumTable
        unitSingular="lt"
        hours={hoursUnion}
        mapDay={mapDay}
        mapPrev={mapPrev}
        mapWeek={mapWeek}
        titleDay={formatWeekdayDayMonthBr(selectedDate)}
        titlePrev={comparisonPrev ? formatWeekdayDayMonthBr(comparisonPrev.date) : null}
        titleWeek={formatWeekdayPassadaDayMonthBr(comparisonWeek.date)}
        hasPrev={comparisonPrev !== null}
        quantityWithoutHour={semHorario}
        missingHourMessage={`${semHorario.toLocaleString('pt-BR')} lata(s) no dia filtrado sem horário de registro — não entram na tabela.`}
        missingPrevMessage="Não foi encontrado dia anterior com ordens (até 14 dias atrás)."
      />
    </aside>
  );
}

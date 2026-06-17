'use client';

import type { ReactNode } from 'react';
import {
  cumulativeQuantityUntilHour,
  formatIntPtBrOrDash,
  formatIntervaloHoraBr,
  getQuantityForHour,
} from '@/domain/realizado/hourly-quantity-metrics';

type HourlyAccumTableProps = {
  unitSingular: string;
  hours: number[];
  mapDay: Map<number, number>;
  mapPrev: Map<number, number>;
  mapWeek: Map<number, number>;
  titleDay: string;
  titlePrev: string | null;
  titleWeek: string;
  hasPrev: boolean;
  quantityWithoutHour: number;
  missingHourMessage: string;
  missingPrevMessage: string;
};

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
        <span className="border-r border-gray-600/55 pr-1">{left}</span>
        <span className="pl-1">{right}</span>
      </span>
    );
  }

  return (
    <div className="flex w-full min-w-0 items-baseline tabular-nums whitespace-nowrap">
      <div className="min-w-0 flex-1 basis-0 border-r border-gray-600/55 pr-2 text-right">
        {left}
      </div>
      <div className="min-w-0 flex-1 basis-0 pl-2 text-left">{right}</div>
    </div>
  );
}

function HourAccumColumnSubheads() {
  const subCls =
    'text-[13px] font-normal leading-snug tracking-normal text-gray-500 sm:text-sm';

  return (
    <HourAccumSplitColumns
      inline
      left={<span className={subCls}>hora</span>}
      right={<span className={subCls}>acum.</span>}
    />
  );
}

function HourAccumPair({
  map,
  hour,
  emphasis,
  unitSingular,
}: {
  map: Map<number, number>;
  hour: number;
  emphasis: 'primary' | 'secondary';
  unitSingular: string;
}) {
  const qtyHour = getQuantityForHour(map, hour);
  const qtyAccum = cumulativeQuantityUntilHour(map, hour);
  const hourClass =
    emphasis === 'primary'
      ? 'font-semibold text-amber-200/95'
      : 'font-medium text-gray-200';
  const acumClass = emphasis === 'primary' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div
      aria-label={`${qtyHour} ${unitSingular} nesta hora, ${qtyAccum} ${unitSingular} acumulados até este intervalo`}
    >
      <HourAccumSplitColumns
        left={<span className={hourClass}>{formatIntPtBrOrDash(qtyHour)}</span>}
        right={<span className={acumClass}>{formatIntPtBrOrDash(qtyAccum)}</span>}
      />
    </div>
  );
}

export default function HourlyAccumTable({
  unitSingular,
  hours,
  mapDay,
  mapPrev,
  mapWeek,
  titleDay,
  titlePrev,
  titleWeek,
  hasPrev,
  quantityWithoutHour,
  missingHourMessage,
  missingPrevMessage,
}: HourlyAccumTableProps) {
  if (hours.length === 0) {
    return (
      <section aria-label={`${unitSingular} por hora`}>
        <p className="text-[13px] leading-snug text-gray-500 sm:text-[15px]">
          Nenhum lançamento com horário nos dias comparados — nada a listar.
        </p>
      </section>
    );
  }

  return (
    <section aria-label={`${unitSingular} por hora`}>
      <div className="overflow-x-auto rounded-lg border border-gray-700/80">
        <table className="w-full min-w-[320px] table-fixed border-collapse text-[13px] sm:text-[15px] leading-snug">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
            <col className="w-[26%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/50">
              <th
                scope="col"
                className="px-3 py-2.5 text-left font-medium text-gray-300 align-bottom"
              >
                Intervalo
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right align-bottom font-medium text-amber-200/95"
              >
                <span className="inline-block whitespace-nowrap align-bottom">
                  {titleDay} <HourAccumColumnSubheads />
                </span>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right align-bottom font-medium text-gray-300"
              >
                <span className="inline-block whitespace-nowrap align-bottom">
                  {titlePrev ?? 'Dia anterior (sem dados)'} <HourAccumColumnSubheads />
                </span>
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right align-bottom font-medium text-gray-300"
              >
                <span className="inline-block whitespace-nowrap align-bottom">
                  {titleWeek} <HourAccumColumnSubheads />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour} className="border-b border-gray-700/60 last:border-0">
                <th
                  scope="row"
                  className="px-3 py-2 tabular-nums text-left font-medium text-gray-200"
                >
                  {formatIntervaloHoraBr(hour)}
                </th>
                <td className="px-3 py-2 align-middle">
                  <HourAccumPair
                    map={mapDay}
                    hour={hour}
                    emphasis="primary"
                    unitSingular={unitSingular}
                  />
                </td>
                <td className="px-3 py-2 align-middle text-gray-300">
                  {hasPrev ? (
                    <HourAccumPair
                      map={mapPrev}
                      hour={hour}
                      emphasis="secondary"
                      unitSingular={unitSingular}
                    />
                  ) : (
                    <div className="text-right tabular-nums text-gray-500">—</div>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <HourAccumPair
                    map={mapWeek}
                    hour={hour}
                    emphasis="secondary"
                    unitSingular={unitSingular}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!hasPrev && (
        <p className="mt-2 text-[13px] leading-snug text-gray-500 sm:text-base">
          {missingPrevMessage}
        </p>
      )}
      {quantityWithoutHour > 0 && (
        <p className="mt-2 text-[13px] leading-snug text-amber-200/80 sm:text-base">
          {missingHourMessage}
        </p>
      )}
    </section>
  );
}

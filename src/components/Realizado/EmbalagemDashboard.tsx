'use client';

import { useMemo, type ReactNode } from 'react';
import {
  getBrazilHourFromIso,
  formatWeekdayDayMonthBr,
  formatWeekdayPassadaDayMonthBr,
  getTodayISOInBrazilTimezone,
  getBrazilHourMinuteNow,
  hoursRemainingUntilClockTodayBr,
  getBrazilCalendarDateTimeFromInstant,
} from '@/lib/utils/date-utils';

export type EmbalagemDashboardItem = {
  cliente: string;
  produto: string;
  produzido: number;
  aProduzir: number;
  caixas?: number;
  pacotes?: number;
  pedidoCaixas?: number;
  pedidoPacotes?: number;
  producaoUpdatedAt?: string;
  pacoteFotoUrl?: string;
  etiquetaFotoUrl?: string;
  palletFotoUrl?: string;
};

/** Soma caixas (coluna M) por hora de Brasília em `producaoUpdatedAt`. */
function hourlyCaixasMap(items: EmbalagemDashboardItem[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const it of items) {
    const cx = it.caixas ?? 0;
    if (cx <= 0) continue;
    const h = getBrazilHourFromIso(it.producaoUpdatedAt);
    if (h === null) continue;
    m.set(h, (m.get(h) ?? 0) + cx);
  }
  return m;
}

function getCaixasForHour(map: Map<number, number>, hour: number): number {
  return map.get(hour) ?? 0;
}

/** Faixa horária no fuso BR: hora 7 → "7h–8h"; 23 → "23h–24h". */
function formatIntervaloHoraBr(hour: number): string {
  if (hour < 0 || hour > 23) return `${hour}h`;
  if (hour === 23) return '23h–24h';
  return `${hour}h–${hour + 1}h`;
}

/** Última faixa usada: 21h–22h (índice 21). Nunca usa 22h–23h (índice 22). */
const ULTIMA_FAIXA_RITMO = 21;

/**
 * Média de caixas/h no dia anterior: da hora atual até a última faixa com dado ≤21h–22h.
 * Não estende com zeros depois do último dado; não inclui faixa 22h–23h.
 */
function mediaCaixasHoraRestanteDiaAnterior(
  mapPrev: Map<number, number>,
  currentHour: number,
): number | null {
  if (currentHour < 0 || currentHour > ULTIMA_FAIXA_RITMO) return null;

  let lastWithData = -1;
  for (let h = currentHour; h <= ULTIMA_FAIXA_RITMO; h++) {
    if ((mapPrev.get(h) ?? 0) > 0) {
      lastWithData = h;
    }
  }
  if (lastWithData < 0) return null;

  let sum = 0;
  for (let h = currentHour; h <= lastWithData; h++) {
    sum += mapPrev.get(h) ?? 0;
  }
  const denom = lastWithData - currentHour + 1;
  if (denom <= 0) return null;
  const avg = sum / denom;
  return avg > 0 ? avg : null;
}

function formatCxPorHora(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n <= 0) return '—';
  return `${Math.round(n)} cx/h`;
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2.5" />
    </svg>
  );
}

function IconTrend({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function PrevisaoMetricCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={title}
      className="flex min-h-[4.25rem] min-w-0 items-center gap-2.5 rounded-lg border border-gray-700/90 bg-gradient-to-br from-gray-900/80 to-gray-900/40 px-2.5 py-2"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-400/95">
        {icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 leading-none">{title}</p>
        <div className="text-sm leading-snug text-gray-100">{children}</div>
      </div>
    </div>
  );
}

type EmbalagemDashboardProps = {
  selectedDate: string;
  items: EmbalagemDashboardItem[];
  comparisonPrev: { date: string; items: EmbalagemDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EmbalagemDashboardItem[] };
};

export default function EmbalagemDashboard({
  selectedDate,
  items,
  comparisonPrev,
  comparisonWeek,
}: EmbalagemDashboardProps) {
  const totais = useMemo(() => {
    const totalCaixasProduzido = items.reduce((sum, item) => sum + (item.caixas || 0), 0);
    const totalCaixasMeta = items.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    const progressoCaixasPct =
      totalCaixasMeta > 0
        ? Math.min(100, (totalCaixasProduzido / totalCaixasMeta) * 100)
        : 0;
    const faltaEmbalarCx = Math.max(0, totalCaixasMeta - totalCaixasProduzido);
    return {
      produzido: `${totalCaixasProduzido} cx`,
      meta: `${totalCaixasMeta} cx`,
      progressoCaixasPct,
      faltaEmbalarCx,
    };
  }, [items]);

  const mapD = useMemo(() => hourlyCaixasMap(items), [items]);
  const mapPrev = useMemo(
    () => (comparisonPrev ? hourlyCaixasMap(comparisonPrev.items) : new Map<number, number>()),
    [comparisonPrev],
  );
  const mapWeek = useMemo(() => hourlyCaixasMap(comparisonWeek.items), [comparisonWeek.items]);

  /** Horas em que pelo menos um dos três dias (filtro, dia anterior, D-7) teve caixas > 0. */
  const hoursUnion = useMemo(() => {
    const s = new Set<number>();
    const collect = (m: Map<number, number>) => {
      for (const [h, cx] of m) {
        if (cx > 0) s.add(h);
      }
    };
    collect(mapD);
    collect(mapPrev);
    collect(mapWeek);
    return [...s].sort((a, b) => a - b);
  }, [mapD, mapPrev, mapWeek]);

  const caixasSemHorario = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const cx = it.caixas ?? 0;
      if (cx <= 0) continue;
      if (getBrazilHourFromIso(it.producaoUpdatedAt) === null) n += cx;
    }
    return n;
  }, [items]);

  const tituloColFiltro = formatWeekdayDayMonthBr(selectedDate);
  const tituloColPrev = comparisonPrev
    ? formatWeekdayDayMonthBr(comparisonPrev.date)
    : null;
  const tituloColD7 = formatWeekdayPassadaDayMonthBr(comparisonWeek.date);

  const previsaoFinalizacao = useMemo(() => {
    const hoje = getTodayISOInBrazilTimezone();
    if (selectedDate !== hoje) {
      return { visivel: false as const };
    }
    const falta = totais.faltaEmbalarCx;
    const { hour: curH } = getBrazilHourMinuteNow();
    const hAte20 = hoursRemainingUntilClockTodayBr(20, 0);
    const hAte22 = hoursRemainingUntilClockTodayBr(22, 0);

    if (falta <= 0) {
      return {
        visivel: true as const,
        falta,
        taxa20: null as number | null,
        taxa22: null as number | null,
        hAte20,
        hAte22,
        ritmoAnterior: null as number | null,
        ritmo: { kind: 'no_prev' as const },
        passouLimite20: hAte20 <= 0,
        passouLimite22: hAte22 <= 0,
      };
    }

    const taxaPara = (h: number) => (h > 0 && falta > 0 ? falta / h : null);

    const ritmoAnterior =
      comparisonPrev !== null ? mediaCaixasHoraRestanteDiaAnterior(mapPrev, curH) : null;

    type Ritmo =
      | { kind: 'no_prev' }
      | { kind: 'no_media' }
      | { kind: 'termina'; hour: number; minute: number }
      | { kind: 'passa_22'; resto: number; embAte22: number };

    let ritmo: Ritmo = { kind: 'no_prev' };
    if (!comparisonPrev) {
      ritmo = { kind: 'no_prev' };
    } else if (ritmoAnterior === null) {
      ritmo = { kind: 'no_media' };
    } else {
      const finishMs = Date.now() + (falta / ritmoAnterior) * 3600000;
      const fin = getBrazilCalendarDateTimeFromInstant(new Date(finishMs));
      const terminaAte22Hoje =
        fin.dateISO === hoje &&
        (fin.hour < 22 || (fin.hour === 22 && fin.minute === 0));

      if (terminaAte22Hoje) {
        ritmo = { kind: 'termina', hour: fin.hour, minute: fin.minute };
      } else {
        const embAte22 = Math.min(falta, ritmoAnterior * hAte22);
        const resto = Math.max(0, Math.round(falta - embAte22));
        ritmo = {
          kind: 'passa_22',
          resto,
          embAte22: Math.round(embAte22),
        };
      }
    }

    return {
      visivel: true as const,
      falta,
      taxa20: taxaPara(hAte20),
      taxa22: taxaPara(hAte22),
      hAte20,
      hAte22,
      ritmoAnterior,
      ritmo,
      passouLimite20: hAte20 <= 0,
      passouLimite22: hAte22 <= 0,
    };
  }, [selectedDate, totais.faltaEmbalarCx, comparisonPrev, mapPrev]);

  const showRitmoPrevisao = useMemo(() => {
    if (!previsaoFinalizacao.visivel || previsaoFinalizacao.falta <= 0) return false;
    if (previsaoFinalizacao.ritmoAnterior === null) return false;
    const k = previsaoFinalizacao.ritmo.kind;
    return k === 'termina' || k === 'passa_22';
  }, [previsaoFinalizacao]);

  return (
    <aside
      className="min-w-0 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 shadow-inner lg:sticky lg:top-4 space-y-6"
      aria-label="Painel de métricas do dia"
    >
      <section aria-label="Resumo do dia">
        <div className="flex flex-wrap gap-4 items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Embalado / meta</p>
            <p className="text-2xl font-bold text-white tabular-nums">
              {totais.produzido}
              <span className="text-gray-500 font-normal mx-1">/</span>
              <span className="text-gray-300">{totais.meta}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Falta embalar</p>
            <p className="text-xl font-semibold text-amber-300 tabular-nums">
              {totais.faltaEmbalarCx} cx
            </p>
          </div>
        </div>
        <div
          className="mt-3 h-2.5 w-full rounded-full bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(totais.progressoCaixasPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Embalado em caixas em relação à meta em caixas"
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, totais.progressoCaixasPct)}%` }}
          />
        </div>
      </section>

      {previsaoFinalizacao.visivel && (
        <section className="!mt-4" aria-label="Previsão de finalização">
          {previsaoFinalizacao.falta <= 0 ? (
            <p className="text-sm text-emerald-300/95">Meta em caixas já atingida — nada a projetar.</p>
          ) : (
            <div
              className={`grid gap-2 ${showRitmoPrevisao ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} grid-cols-1`}
            >
              <PrevisaoMetricCard icon={<IconClock className="h-5 w-5" />} title="Meta até 20h">
                {previsaoFinalizacao.passouLimite20 ? (
                  <span className="text-amber-200/80">20h já passou hoje</span>
                ) : (
                  <span className="font-semibold tabular-nums text-amber-200/95">
                    {formatCxPorHora(previsaoFinalizacao.taxa20)}
                  </span>
                )}
              </PrevisaoMetricCard>
              <PrevisaoMetricCard icon={<IconClock className="h-5 w-5" />} title="Meta até 22h">
                {previsaoFinalizacao.passouLimite22 ? (
                  <span className="text-amber-200/80">22h já passou hoje</span>
                ) : (
                  <span className="font-semibold tabular-nums text-amber-200/95">
                    {formatCxPorHora(previsaoFinalizacao.taxa22)}
                  </span>
                )}
              </PrevisaoMetricCard>
              {showRitmoPrevisao && previsaoFinalizacao.ritmoAnterior !== null && (
                <PrevisaoMetricCard
                  icon={<IconTrend className="h-5 w-5" />}
                  title={`${formatCxPorHora(previsaoFinalizacao.ritmoAnterior)} dia anterior`}
                >
                  {previsaoFinalizacao.ritmo.kind === 'termina' ? (
                    <p className="font-semibold tabular-nums text-gray-200">
                      acaba {previsaoFinalizacao.ritmo.hour}h
                      {String(previsaoFinalizacao.ritmo.minute).padStart(2, '0')}
                    </p>
                  ) : previsaoFinalizacao.ritmo.kind === 'passa_22' ? (
                    <div className="space-y-1">
                      <p className="text-sm leading-snug text-gray-200">
                        embala mais{' '}
                        <span className="font-semibold tabular-nums text-gray-100">
                          {previsaoFinalizacao.ritmo.embAte22} cx
                        </span>{' '}
                        e
                      </p>
                      <p className="text-sm font-semibold leading-snug text-red-400" role="status">
                        <span className="tabular-nums">{previsaoFinalizacao.ritmo.resto} cx</span>
                        <span className="font-medium text-red-400/90"> para dia seguinte</span>
                      </p>
                    </div>
                  ) : null}
                </PrevisaoMetricCard>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-label="Caixas por hora">
        {hoursUnion.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma caixa com horário de registro nos dias comparados — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700/80">
            <table className="w-full min-w-[320px] table-fixed border-collapse text-sm">
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
                    className="px-3 py-2.5 text-right font-medium text-amber-200/95 align-bottom"
                  >
                    {tituloColFiltro}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-medium text-gray-300 align-bottom"
                  >
                    {tituloColPrev ?? 'Dia anterior (sem dados)'}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2.5 text-right font-medium text-gray-300 align-bottom"
                  >
                    {tituloColD7}
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursUnion.map((hour) => (
                  <tr key={hour} className="border-b border-gray-700/60 last:border-0">
                    <th
                      scope="row"
                      className="px-3 py-2 tabular-nums text-left font-medium text-gray-200"
                    >
                      {formatIntervaloHoraBr(hour)}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-200/95">
                      {getCaixasForHour(mapD, hour)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-300">
                      {comparisonPrev ? getCaixasForHour(mapPrev, hour) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-300">
                      {getCaixasForHour(mapWeek, hour)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!comparisonPrev && hoursUnion.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Não foi encontrado dia anterior com pedidos (até 14 dias atrás).
          </p>
        )}
        {caixasSemHorario > 0 && (
          <p className="mt-2 text-xs text-amber-200/80">
            {caixasSemHorario} caixa(s) no dia filtrado sem horário em col. Q — não entram na tabela.
          </p>
        )}
      </section>
    </aside>
  );
}

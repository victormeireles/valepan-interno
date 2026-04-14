'use client';

import { useMemo } from 'react';
import {
  getBrazilHourFromIso,
  formatWeekdayDayMonthBr,
  formatWeekdayPassadaDayMonthBr,
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

function formatQuantidade(caixas: number, pacotes: number): string {
  const parts: string[] = [];
  if (caixas > 0) parts.push(`${caixas} cx`);
  if (pacotes > 0) parts.push(`${pacotes} pct`);
  return parts.length > 0 ? parts.join(' + ') : '0';
}

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
    const totalPacotesProduzido = items.reduce((sum, item) => sum + (item.pacotes || 0), 0);
    const totalCaixasMeta = items.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    const totalPacotesMeta = items.reduce((sum, item) => sum + (item.pedidoPacotes || 0), 0);
    const progressoCaixasPct =
      totalCaixasMeta > 0
        ? Math.min(100, (totalCaixasProduzido / totalCaixasMeta) * 100)
        : 0;
    const faltaEmbalarCx = Math.max(0, totalCaixasMeta - totalCaixasProduzido);
    return {
      produzido: formatQuantidade(totalCaixasProduzido, totalPacotesProduzido),
      meta: formatQuantidade(totalCaixasMeta, totalPacotesMeta),
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

  return (
    <aside
      className="min-w-0 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 shadow-inner lg:sticky lg:top-4 space-y-6"
      aria-label="Painel de métricas do dia"
    >
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Resumo do dia</h2>
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

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Caixas por hora</h2>
        {hoursUnion.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma caixa com horário de registro nos dias comparados — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700/80">
            <table className="w-full min-w-[320px] text-sm text-left">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    Intervalo
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-amber-200/95">
                    {tituloColFiltro}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    {tituloColPrev ?? 'Dia anterior (sem dados)'}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    {tituloColD7}
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursUnion.map((hour) => (
                  <tr key={hour} className="border-b border-gray-700/60 last:border-0">
                    <th scope="row" className="px-3 py-2 tabular-nums text-gray-200 font-medium">
                      {formatIntervaloHoraBr(hour)}
                    </th>
                    <td className="px-3 py-2 tabular-nums text-amber-200/95">
                      {getCaixasForHour(mapD, hour)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-300">
                      {comparisonPrev ? getCaixasForHour(mapPrev, hour) : '—'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-300">
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

'use client';

import { useMemo } from 'react';
import { getBrazilHourFromIso, formatISODateBr } from '@/lib/utils/date-utils';
import { getEmbalagemPhotoStatus } from '@/domain/realizado/embalagem-photo-status';

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

  const pendentesFinalizados = useMemo(() => {
    let finalizados = 0;
    let pendentes = 0;
    for (const item of items) {
      const pct = item.aProduzir > 0 ? (item.produzido / item.aProduzir) * 100 : 0;
      if (pct >= 90) finalizados += 1;
      else pendentes += 1;
    }
    return { finalizados, pendentes };
  }, [items]);

  const fotosAlerta = useMemo(() => {
    let n = 0;
    for (const item of items) {
      const s = getEmbalagemPhotoStatus(item);
      if (s.hasPhoto && (s.color === 'yellow' || s.color === 'red')) n += 1;
    }
    return n;
  }, [items]);

  const mapD = useMemo(() => hourlyCaixasMap(items), [items]);
  const mapPrev = useMemo(
    () => (comparisonPrev ? hourlyCaixasMap(comparisonPrev.items) : new Map<number, number>()),
    [comparisonPrev],
  );
  const mapWeek = useMemo(() => hourlyCaixasMap(comparisonWeek.items), [comparisonWeek.items]);

  const hoursFiltered = useMemo(() => {
    const hs = [...mapD.entries()]
      .filter(([, cx]) => cx > 0)
      .map(([h]) => h)
      .sort((a, b) => a - b);
    return hs;
  }, [mapD]);

  const caixasSemHorario = useMemo(() => {
    let n = 0;
    for (const it of items) {
      const cx = it.caixas ?? 0;
      if (cx <= 0) continue;
      if (getBrazilHourFromIso(it.producaoUpdatedAt) === null) n += cx;
    }
    return n;
  }, [items]);

  const topProdutos = useMemo(() => {
    return [...items]
      .filter((i) => (i.caixas ?? 0) > 0)
      .sort((a, b) => (b.caixas ?? 0) - (a.caixas ?? 0))
      .slice(0, 3);
  }, [items]);

  const labelDiaFiltro = formatISODateBr(selectedDate);
  const labelPrev = comparisonPrev ? formatISODateBr(comparisonPrev.date) : null;
  const labelWeek = formatISODateBr(comparisonWeek.date);

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
        <h2 className="text-lg font-semibold text-white mb-1">Caixas por hora</h2>
        <p className="text-xs text-gray-400 mb-3">
          Cada valor soma as <strong className="text-gray-300">caixas (col. M)</strong> cuja última
          gravação caiu naquela hora (Brasília). Comparativo: dia filtrado, último dia com pedidos
          antes dele, e mesmo calendário D-7.
        </p>
        {hoursFiltered.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma caixa com horário de registro no dia filtrado — nada a listar.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700/80">
            <table className="w-full min-w-[320px] text-sm text-left">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900/50">
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    Hora
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-amber-200/95">
                    {labelDiaFiltro}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    {labelPrev ? `Antes (${labelPrev})` : 'Dia anterior c/ dados'}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium text-gray-300">
                    D-7 ({labelWeek})
                  </th>
                </tr>
              </thead>
              <tbody>
                {hoursFiltered.map((hour) => (
                  <tr key={hour} className="border-b border-gray-700/60 last:border-0">
                    <th scope="row" className="px-3 py-2 tabular-nums text-gray-200 font-medium">
                      {hour}h
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
        {!comparisonPrev && hoursFiltered.length > 0 && (
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

      <section className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-gray-900/60 border border-gray-700 p-3">
          <p className="text-gray-400 text-xs">Pendentes (&lt;90%)</p>
          <p className="text-xl font-semibold text-white tabular-nums">{pendentesFinalizados.pendentes}</p>
        </div>
        <div className="rounded-lg bg-gray-900/60 border border-gray-700 p-3">
          <p className="text-gray-400 text-xs">Finalizados (≥90%)</p>
          <p className="text-xl font-semibold text-emerald-300 tabular-nums">{pendentesFinalizados.finalizados}</p>
        </div>
        <div className="rounded-lg bg-gray-900/60 border border-gray-700 p-3 col-span-2">
          <p className="text-gray-400 text-xs">Linhas com foto incompleta ou ausente (com produção)</p>
          <p className="text-xl font-semibold text-amber-200 tabular-nums">{fotosAlerta}</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Top produtos (caixas)</h2>
        {topProdutos.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhuma caixa registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {topProdutos.map((p, i) => (
              <li
                key={`${p.produto}-${p.cliente}-${i}`}
                className="flex justify-between gap-2 text-sm border-b border-gray-700/80 pb-2 last:border-0"
              >
                <span className="text-gray-200 truncate" title={p.produto}>
                  {i + 1}. {p.produto}
                </span>
                <span className="text-amber-200/90 tabular-nums shrink-0">{p.caixas ?? 0} cx</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

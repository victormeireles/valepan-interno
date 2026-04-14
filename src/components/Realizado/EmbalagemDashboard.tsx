'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getBrazilHourFromIso } from '@/lib/utils/date-utils';
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

type EmbalagemDashboardProps = {
  items: EmbalagemDashboardItem[];
};

export default function EmbalagemDashboard({ items }: EmbalagemDashboardProps) {
  const totais = useMemo(() => {
    const totalCaixasProduzido = items.reduce((sum, item) => sum + (item.caixas || 0), 0);
    const totalPacotesProduzido = items.reduce((sum, item) => sum + (item.pacotes || 0), 0);
    const totalCaixasMeta = items.reduce((sum, item) => sum + (item.pedidoCaixas || 0), 0);
    const totalPacotesMeta = items.reduce((sum, item) => sum + (item.pedidoPacotes || 0), 0);
    return {
      produzido: formatQuantidade(totalCaixasProduzido, totalPacotesProduzido),
      meta: formatQuantidade(totalCaixasMeta, totalPacotesMeta),
    };
  }, [items]);

  const mediaLinhasPct = useMemo(() => {
    const comMeta = items.filter((i) => i.aProduzir > 0);
    if (comMeta.length === 0) return 0;
    return (
      comMeta.reduce(
        (acc, i) => acc + Math.min(100, (i.produzido / i.aProduzir) * 100),
        0,
      ) / comMeta.length
    );
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

  const chartData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${hour}h`,
      linhas: 0,
    }));
    let semRegistro = 0;
    for (const item of items) {
      const h = getBrazilHourFromIso(item.producaoUpdatedAt);
      if (h === null) {
        semRegistro += 1;
        continue;
      }
      buckets[h].linhas += 1;
    }
    return { buckets, semRegistro };
  }, [items]);

  const topProdutos = useMemo(() => {
    return [...items]
      .sort((a, b) => b.produzido - a.produzido)
      .slice(0, 3)
      .filter((i) => i.produzido > 0);
  }, [items]);

  const chartSummary = useMemo(() => {
    const max = chartData.buckets.reduce((m, b) => Math.max(m, b.linhas), 0);
    const peak = chartData.buckets.find((b) => b.linhas === max && max > 0);
    return peak ? `Pico às ${peak.hour}h (${peak.linhas} linhas).` : 'Sem linhas com horário registrado no gráfico.';
  }, [chartData.buckets]);

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
            <p className="text-xs text-gray-400">Média das linhas</p>
            <p className="text-xl font-semibold text-amber-300 tabular-nums">
              {mediaLinhasPct.toFixed(0)}%
            </p>
          </div>
        </div>
        <div
          className="mt-3 h-2.5 w-full rounded-full bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(mediaLinhasPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso médio das linhas em relação à meta"
        >
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.min(100, mediaLinhasPct)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Barras: caixas e pacotes somados como na lista; percentual = média do avanço por linha.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-1">Atividade por hora</h2>
        <p className="text-xs text-gray-400 mb-2">
          Linhas por hora da última atualização (horário de Brasília). Não indica volume em caixas por hora.
        </p>
        <p className="sr-only" id="embalagem-chart-summary">
          {chartSummary} {chartData.semRegistro > 0
            ? `${chartData.semRegistro} linhas sem registro de horário.`
            : ''}
        </p>
        <div className="h-56 w-full min-h-[14rem]" aria-describedby="embalagem-chart-summary">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                tickFormatter={(v) => `${v}h`}
                interval={2}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(value: number) => [`${value} linhas`, 'Linhas']}
                labelFormatter={(label) => `Hora ${label}h`}
              />
              <Bar dataKey="linhas" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Linhas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {chartData.semRegistro > 0 && (
          <p className="mt-2 text-xs text-amber-200/90">
            Sem registro de horário: {chartData.semRegistro} linha(s) — não entram no gráfico.
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
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Top produtos (produzido)</h2>
        {topProdutos.length === 0 ? (
          <p className="text-xs text-gray-500">Nenhum volume registrado ainda.</p>
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
                <span className="text-amber-200/90 tabular-nums shrink-0">{p.produzido}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

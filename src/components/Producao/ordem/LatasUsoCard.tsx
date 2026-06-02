'use client';

import type { LataUsoTipoResumo } from '@/lib/production/latas-uso-resumo';
import type { TotaisOrdemDiariaDia } from '@/lib/production/ordem-producao-cell-selection';

type Props = {
  resumo: LataUsoTipoResumo[];
  /** Soma de todas as linhas da ordem do dia (latas e caixas estimadas). */
  totaisDia?: TotaisOrdemDiariaDia | null;
  className?: string;
};

const intFmt = new Intl.NumberFormat('pt-BR');
const razaoFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function tomDaRazao(razao: number | null): {
  badge: string;
  bar: string;
} {
  if (razao == null) return { badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300' };
  if (razao > 1) return { badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500' };
  if (razao === 1) return { badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' };
  return { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' };
}

export default function LatasUsoCard({ resumo, totaisDia, className }: Props) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm ${className ?? ''}`}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Latas em uso
      </h3>
      {resumo.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">Sem latas planejadas.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {resumo.map((r) => {
            const tom = tomDaRazao(r.razao);
            const pct = r.razao == null ? 0 : Math.min(1, r.razao) * 100;
            return (
              <li key={r.assadeiraId} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-slate-900" title={r.nome}>
                    {r.nome}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tom.badge}`}
                  >
                    {r.razao == null ? '—' : razaoFmt.format(r.razao)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${tom.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] tabular-nums text-slate-500">
                  {intFmt.format(r.emUso)} / {intFmt.format(r.disponivel)}
                  {r.razao != null && r.razao > 1 ? (
                    <span className="ml-1 text-rose-600">
                      · lavar {intFmt.format(r.emUso - r.disponivel)}
                    </span>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {totaisDia && totaisDia.itens > 0 ? (
        <div className="mt-3 border-t border-slate-200 pt-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Total do dia (todas as linhas)
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
            {intFmt.format(totaisDia.latas)} latas
            <span className="mx-1.5 font-normal text-slate-400">·</span>
            {intFmt.format(totaisDia.caixas)} caixas (embalagem)
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {totaisDia.itens} {totaisDia.itens === 1 ? 'item' : 'itens'} na ordem
          </p>
        </div>
      ) : null}
    </div>
  );
}

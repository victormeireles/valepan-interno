'use client';

import Link from 'next/link';
import type { ProductionStep } from '@/domain/types/producao-etapas';
import { etapaPathForOrdem } from '@/lib/production/production-station-routes';
import type { OpTimelineStepVm } from '@/lib/production/op-timeline-state';

interface OpEtapasTimelineProps {
  ordemId: string;
  steps: OpTimelineStepVm[];
}

function stepClass(s: OpTimelineStepVm): string {
  const base =
    'flex-1 min-w-[4.5rem] text-center rounded-lg px-1.5 py-2 text-[10px] sm:text-xs font-semibold transition-colors border';
  switch (s.status) {
    case 'done':
      return `${base} border-emerald-200 bg-emerald-50 text-emerald-900`;
    case 'open':
      return `${base} border-amber-300 bg-amber-50 text-amber-950`;
    case 'highlight':
      return `${base} border-slate-900 bg-slate-900 text-white shadow-sm`;
    default:
      return `${base} border-slate-200 bg-slate-50 text-slate-500`;
  }
}

export default function OpEtapasTimeline({ ordemId, steps }: OpEtapasTimelineProps) {
  return (
    <nav
      className="mb-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      aria-label="Etapas da ordem de produção"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 px-0.5">
        Etapas da OP
      </p>
      <div className="flex flex-wrap gap-1.5 justify-between">
        {steps.map((s) => (
          <Link
            key={s.step}
            href={etapaPathForOrdem(ordemId, s.step as ProductionStep)}
            className={stepClass(s)}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

'use client';

import { belowEtapaToolbarStickyTop } from '@/components/ui/page-shell';
import type { RealizadoEtapaConfig, RealizadoEtapaDashboardResumoData } from './types';

const BAR_TRACK = 'h-2.5 w-full max-w-full rounded-full bg-stone-100 overflow-hidden';
const BAR_FILL =
  'h-full max-w-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type EtapaResumoDashboardProps = {
  config: RealizadoEtapaConfig;
  selectedDate: string;
  data: RealizadoEtapaDashboardResumoData;
};

export default function EtapaResumoDashboard({
  config,
  data,
}: EtapaResumoDashboardProps) {
  const fmt = (n: number) => n.toLocaleString('pt-BR');
  const metaAtingida = data.falta === 0;

  return (
    <aside
      className={['min-w-0 min-[960px]:sticky', belowEtapaToolbarStickyTop].join(' ')}
      aria-label="Painel de métricas do dia"
    >
      <section
        className="overflow-hidden rounded-xl border border-border-default bg-surface p-4 shadow-control sm:p-5"
        aria-label="Resumo do dia"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
              {config.summaryLabel}
            </p>
            <p className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-text-strong">
              {fmt(data.produzido)}{' '}
              <span className="text-lg font-medium text-text-muted">{config.unit}</span>
              <span className="mx-2 font-normal text-stone-400">/</span>
              <span className="text-xl font-semibold text-text-muted">{fmt(data.meta)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted sm:text-xs">
              {config.remainingLabel}
            </p>
            <p
              className={[
                'mt-0.5 font-mono text-2xl font-bold tabular-nums',
                metaAtingida ? 'text-success' : 'text-accent',
              ].join(' ')}
            >
              {fmt(data.falta)} {config.unit}
            </p>
          </div>
        </div>

        <div
          className={`mt-3.5 ${BAR_TRACK}`}
          role="progressbar"
          aria-valuenow={Math.round(data.progressoPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${config.summaryLabel} em relação à meta`}
        >
          <div
            className={[BAR_FILL, metaAtingida ? 'bg-success' : 'bg-accent'].join(' ')}
            style={{ width: `${Math.min(100, data.progressoPct)}%` }}
          />
        </div>

        {metaAtingida ? (
          <p className="mt-3 text-xs leading-snug text-success-fg sm:text-[13px]">
            Meta atingida — nada a projetar.
          </p>
        ) : null}
      </section>
    </aside>
  );
}

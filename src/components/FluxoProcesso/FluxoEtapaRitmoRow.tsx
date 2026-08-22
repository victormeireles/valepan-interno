'use client';

import { fluxoEtapaRitmoDisplay } from './fluxo-etapa-ritmo-display';
import { fmtQtyExact } from './fluxo-display-scale';
import { useFluxoDisplay } from './fluxo-display-context';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

type FluxoEtapaRitmoRowProps = {
  fluxo: VpFluxoPayload;
  etapaKey: FluxoEtapaKey;
};

function RitmoDelta({ label, value }: { label: string; value: number }) {
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      {label}
      <span
        className={[
          'inline-flex items-center font-mono text-xs font-semibold tabular-nums',
          up ? 'text-success-fg' : 'text-danger-fg',
        ].join(' ')}
      >
        <span className="material-icons text-[13px]" aria-hidden>
          {up ? 'arrow_upward' : 'arrow_downward'}
        </span>
        {Math.abs(value)}%
      </span>
    </span>
  );
}

export default function FluxoEtapaRitmoRow({
  fluxo,
  etapaKey,
}: FluxoEtapaRitmoRowProps) {
  const { scale } = useFluxoDisplay();
  const view = fluxoEtapaRitmoDisplay.build(scale, fluxo, etapaKey);
  if (!view) return null;

  return (
    <div
      className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-1.5 border-t border-stone-100 pt-2.5"
      aria-label={`${fmtQtyExact(view.atual)} ${view.rateLabel}, ontem ${view.deltaOntemPct}%, semana ${view.deltaSemanaPct}%`}
    >
      <span className="font-mono text-sm tabular-nums text-text-body">
        <strong className="text-text-strong">{fmtQtyExact(view.atual)}</strong>{' '}
        {view.rateLabel}
      </span>
      <span className="inline-flex gap-3">
        <RitmoDelta label="ontem" value={view.deltaOntemPct} />
        <RitmoDelta label="semana" value={view.deltaSemanaPct} />
      </span>
    </div>
  );
}

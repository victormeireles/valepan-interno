'use client';

import { Card } from '@/components/ui/Card';
import type {
  FluxoEtapaKey,
  FluxoEtapaResumo,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';
import FluxoBarrasHora from './FluxoBarrasHora';
import FluxoFaixaEtapa from './FluxoFaixaEtapa';
import { FluxoJanelaGraficoCopy } from './fluxo-janela-grafico-copy';
import FluxoOpRelogioList from './FluxoOpRelogioList';

type FluxoProducaoPorHoraProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
  onEtapaChange: (key: FluxoEtapaKey) => void;
};

export default function FluxoProducaoPorHora({
  fluxo,
  etapa,
  onEtapaChange,
}: FluxoProducaoPorHoraProps) {
  const { scale } = useFluxoDisplay();
  const byKey = Object.fromEntries(fluxo.etapas.map((e) => [e.key, e])) as Record<
    FluxoEtapaKey,
    FluxoEtapaResumo
  >;
  const total = scale.etapaTotal(etapa);
  const outraOp = scale.opAnteriorTotal(etapa);
  const caption = FluxoJanelaGraficoCopy.caption(
    fmtQty(total, scale.mode),
    scale.unitLabel,
    outraOp > 0
      ? FluxoJanelaGraficoCopy.outraOpCaption(
          fmtQty(outraOp, scale.mode),
          fluxo.turnosResumo?.[etapa]?.outraOpData,
        )
      : '',
  );

  return (
    <Card padding="md" className="min-w-0">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <span className="text-base font-bold text-text-strong">
          {FluxoJanelaGraficoCopy.TITULO}
        </span>
        <div
          className="flex min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain rounded-full bg-surface-sunken p-0.5"
          role="tablist"
          aria-label="Etapa do gráfico"
        >
          {fluxo.etapas.map((e) => (
            <button
              key={e.key}
              type="button"
              role="tab"
              aria-selected={etapa === e.key}
              onClick={() => onEtapaChange(e.key)}
              className={[
                'min-h-11 shrink-0 cursor-pointer rounded-full border-none px-3.5 text-sm',
                etapa === e.key
                  ? 'bg-surface font-semibold text-text-strong shadow-[0_1px_3px_rgba(63,3,19,0.12)]'
                  : 'bg-transparent font-normal text-text-muted',
              ].join(' ')}
            >
              {e.nome}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] tabular-nums text-text-muted lg:ml-auto">
          {caption}
        </span>
      </div>
      <FluxoBarrasHora fluxo={fluxo} etapa={etapa} />
      <FluxoFaixaEtapa etapa={byKey[etapa]} />
      <FluxoOpRelogioList etapa={etapa} controle={fluxo.controle} />
    </Card>
  );
}

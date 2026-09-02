'use client';

import { Card } from '@/components/ui/Card';
import { useFluxoDisplay } from '@/components/FluxoProcesso/fluxo-display-context';
import { fmtQty } from '@/components/FluxoProcesso/fluxo-display-scale';
import FluxoBarrasHora from '@/components/FluxoProcesso/FluxoBarrasHora';
import { FluxoJanelaGraficoCopy } from '@/components/FluxoProcesso/fluxo-janela-grafico-copy';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

type PainelEtapaTvGraficoProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
};

export default function PainelEtapaTvGrafico({ fluxo, etapa }: PainelEtapaTvGraficoProps) {
  const { scale } = useFluxoDisplay();
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
    <Card padding="md" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-2 flex min-w-0 shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-bold text-text-strong">
          {FluxoJanelaGraficoCopy.TITULO}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-text-muted lg:ml-auto">
          {caption}
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <FluxoBarrasHora fluxo={fluxo} etapa={etapa} fillHeight />
      </div>
    </Card>
  );
}

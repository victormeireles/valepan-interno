'use client';

import { Card } from '@/components/ui/Card';
import { useFluxoDisplay } from '@/components/FluxoProcesso/fluxo-display-context';
import { fmtQty } from '@/components/FluxoProcesso/fluxo-display-scale';
import FluxoBarrasHora from '@/components/FluxoProcesso/FluxoBarrasHora';
import FluxoFaixaEtapa from '@/components/FluxoProcesso/FluxoFaixaEtapa';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import { diaAnteriorLabelFromDia } from '@/components/FluxoProcesso/fluxo-processo-format';
import {
  extractCalendarDate,
  getBrazilHourMinuteNow,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';

type PainelEtapaTvGraficoProps = {
  fluxo: VpFluxoPayload;
  etapa: FluxoEtapaKey;
};

export default function PainelEtapaTvGrafico({ fluxo, etapa }: PainelEtapaTvGraficoProps) {
  const { scale } = useFluxoDisplay();
  const total = scale.etapaTotal(etapa);
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
  const mostrarAgora = extractCalendarDate(fluxo.dia) === getTodayISOInBrazilTimezone();
  const horaAgora = getBrazilHourMinuteNow().hour;
  const etapaResumo = fluxo.etapas.find((item) => item.key === etapa);

  return (
    <Card padding="md" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="mb-2 flex min-w-0 shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-bold text-text-strong">Produção por hora</span>
        <span className="font-mono text-[11px] tabular-nums text-text-muted lg:ml-auto">
          {fmtQty(total, scale.mode)} {scale.unitLabel} no dia · empilhado por assadeira
          {etapa === 'emb' && scale.opAnteriorTotal() > 0
            ? ` · ${fmtQty(scale.opAnteriorTotal(), scale.mode)} de OP de ${antLabel}`
            : ''}
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <FluxoBarrasHora
          fluxo={fluxo}
          etapa={etapa}
          mostrarAgora={mostrarAgora}
          horaAgora={horaAgora}
        />
        {etapaResumo ? <FluxoFaixaEtapa etapa={etapaResumo} /> : null}
      </div>
    </Card>
  );
}

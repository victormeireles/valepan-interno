'use client';

import { Card } from '@/components/ui/Card';
import type {
  FluxoEtapaKey,
  FluxoEtapaResumo,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  extractCalendarDate,
  getBrazilHourMinuteNow,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import { useFluxoDisplay } from './fluxo-display-context';
import { fmtQty } from './fluxo-display-scale';
import FluxoBarrasHora from './FluxoBarrasHora';
import FluxoFaixaEtapa from './FluxoFaixaEtapa';
import FluxoOpRelogioList from './FluxoOpRelogioList';
import { diaAnteriorLabelFromDia } from './fluxo-processo-format';

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
  const antLabel = diaAnteriorLabelFromDia(fluxo.dia);
  const total = scale.etapaTotal(etapa);
  const mostrarAgora =
    extractCalendarDate(fluxo.dia) === getTodayISOInBrazilTimezone();
  const horaAgora = getBrazilHourMinuteNow().hour;

  return (
    <Card padding="md" className="min-w-0">
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <span className="text-base font-bold text-text-strong">Produção por hora</span>
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
          {fmtQty(total, scale.mode)} {scale.unitLabel} no dia · empilhado por assadeira
          {etapa === 'emb' && scale.opAnteriorTotal() > 0
            ? ` · ${fmtQty(scale.opAnteriorTotal(), scale.mode)} de OP de ${antLabel}`
            : ''}
        </span>
      </div>
      <FluxoBarrasHora
        fluxo={fluxo}
        etapa={etapa}
        mostrarAgora={mostrarAgora}
        horaAgora={horaAgora}
      />
      <FluxoFaixaEtapa etapa={byKey[etapa]} />
      <FluxoOpRelogioList etapa={etapa} controle={fluxo.controle} />
    </Card>
  );
}

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

  return (
    <Card padding="lg">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="text-base font-bold text-text-strong">Produção por hora</span>
        <div className="flex gap-0.5 rounded-full bg-surface-sunken p-0.5">
          {fluxo.etapas.map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => onEtapaChange(e.key)}
              className={[
                'cursor-pointer rounded-full border-none px-3.5 py-1.5 text-sm',
                etapa === e.key
                  ? 'bg-surface font-semibold text-text-strong shadow-[0_1px_3px_rgba(63,3,19,0.12)]'
                  : 'bg-transparent font-normal text-text-muted',
              ].join(' ')}
            >
              {e.nome}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-text-muted">
          {fmtQty(total, scale.mode)} {scale.unitLabel} no dia · empilhado por assadeira
          {etapa === 'emb'
            ? ` · ${fmtQty(scale.opAnteriorTotal(), scale.mode)} de OP de ${antLabel}`
            : ''}
        </span>
      </div>
      <FluxoBarrasHora fluxo={fluxo} etapa={etapa} />
      <FluxoFaixaEtapa etapa={byKey[etapa]} />
    </Card>
  );
}

'use client';

import type { FluxoEtapaResumo, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import FluxoEtapaCard from './FluxoEtapaCard';

type FluxoEtapaCardsProps = {
  fluxo: VpFluxoPayload;
  etapaAtiva: string;
  onSelect: (key: FluxoEtapaResumo['key']) => void;
};

export default function FluxoEtapaCards({ fluxo, etapaAtiva, onSelect }: FluxoEtapaCardsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
      {fluxo.etapas.map((e) => (
        <FluxoEtapaCard
          key={e.key}
          fluxo={fluxo}
          etapa={e}
          ativa={etapaAtiva === e.key}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

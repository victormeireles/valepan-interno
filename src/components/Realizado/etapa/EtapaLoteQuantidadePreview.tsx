'use client';

import type { ReactNode } from 'react';

type EtapaLoteQuantidadePreviewProps = {
  totalProjetado: number;
  metaReferencia: number;
  metaPlanejada: number;
  unidade: string;
};

function fmt(n: number): string {
  return n.toLocaleString('pt-BR');
}

function QuantidadeMono({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono tabular-nums text-stone-800">{children}</span>
  );
}

export default function EtapaLoteQuantidadePreview({
  totalProjetado,
  metaReferencia,
  metaPlanejada,
  unidade,
}: EtapaLoteQuantidadePreviewProps) {
  const opDiverge = metaPlanejada !== metaReferencia;

  return (
    <div className="space-y-1 text-sm text-stone-600">
      <p>
        Total após este lote:{' '}
        <QuantidadeMono>
          {fmt(totalProjetado)} / {fmt(metaReferencia)} {unidade}
        </QuantidadeMono>
      </p>
      <p className={opDiverge ? 'text-stone-600' : 'text-xs text-stone-400'}>
        OP planejada:{' '}
        <span className="font-mono tabular-nums">
          {fmt(metaPlanejada)} {unidade}
        </span>
      </p>
    </div>
  );
}

'use client';

import FluxoEtapaCard from '@/components/FluxoProcesso/FluxoEtapaCard';
import { Card } from '@/components/ui/Card';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import type {
  PainelEtapaTvOpFonte,
  PainelEtapaTvUltimoLote,
} from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import PainelEtapaTvGrafico from './PainelEtapaTvGrafico';
import PainelEtapaTvProximasOps from './PainelEtapaTvProximasOps';
import PainelEtapaTvUltimoLotePanel from './PainelEtapaTvUltimoLote';

type PainelEtapaTvGridProps = {
  config: PainelEtapaTvConfig;
  fluxo: VpFluxoPayload | null;
  hasScale: boolean;
  ultimoLote: PainelEtapaTvUltimoLote | null;
  ultimoProduct: EtapaProductItem | undefined;
  proximasOps: PainelEtapaTvOpFonte[];
  products: EtapaProductItem[];
  unit: string;
  showMarca: boolean;
};

function FluxoIndisponivel() {
  return (
    <Card padding="md" className="flex h-full min-h-0 items-center">
      <p className="text-sm text-text-muted">Fluxo indisponível nesta data.</p>
    </Card>
  );
}

export default function PainelEtapaTvGrid({
  config,
  fluxo,
  hasScale,
  ultimoLote,
  ultimoProduct,
  proximasOps,
  products,
  unit,
  showMarca,
}: PainelEtapaTvGridProps) {
  const etapaFluxo = fluxo?.etapas.find((item) => item.key === config.fluxoKey);

  return (
    <div
      className={[
        'grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden',
        'lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]',
      ].join(' ')}
    >
      <div className="min-h-0 overflow-auto">
        {fluxo && etapaFluxo ? (
          <FluxoEtapaCard fluxo={fluxo} etapa={etapaFluxo} ativa selecionavel={false} />
        ) : (
          <FluxoIndisponivel />
        )}
      </div>
      <div className="min-h-0 overflow-hidden">
        {fluxo && hasScale ? (
          <PainelEtapaTvGrafico fluxo={fluxo} etapa={config.fluxoKey} />
        ) : (
          <FluxoIndisponivel />
        )}
      </div>
      <div className="min-h-0 overflow-hidden rounded-xl border border-border-default bg-surface p-3 shadow-control">
        <PainelEtapaTvUltimoLotePanel
          lote={ultimoLote}
          product={ultimoProduct}
          unit={unit}
          showTipoEstoqueMarcaBadge={showMarca}
        />
      </div>
      <div className="min-h-0 overflow-hidden rounded-xl border border-border-default bg-surface p-3 shadow-control">
        <PainelEtapaTvProximasOps
          ops={proximasOps}
          products={products}
          showTipoEstoqueMarcaBadge={showMarca}
        />
      </div>
    </div>
  );
}

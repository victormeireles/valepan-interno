'use client';

import { Card } from '@/components/ui/Card';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import type { PainelEtapaTvOpProgressoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import type { PainelEtapaTvTurnosResumoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';
import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type {
  PainelEtapaTvOpFonte,
  PainelEtapaTvUltimoLote,
} from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import PainelEtapaTvGrafico from './PainelEtapaTvGrafico';
import PainelEtapaTvProximasOps from './PainelEtapaTvProximasOps';
import PainelEtapaTvResumoCard from './PainelEtapaTvResumoCard';
import PainelEtapaTvUltimoLotePanel from './PainelEtapaTvUltimoLote';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

type PainelEtapaTvGridProps = {
  config: PainelEtapaTvConfig;
  fluxo: VpFluxoPayload | null;
  hasScale: boolean;
  progresso: PainelEtapaTvOpProgressoDto | null;
  turnos: PainelEtapaTvTurnosResumoDto | null;
  t1Label: string;
  dateISO: string;
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
  progresso,
  turnos,
  t1Label,
  dateISO,
  ultimoLote,
  ultimoProduct,
  proximasOps,
  products,
  unit,
  showMarca,
}: PainelEtapaTvGridProps) {
  return (
    <div
      className={[
        'grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden',
        'lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]',
      ].join(' ')}
    >
      <div className="min-h-0 overflow-auto">
        {progresso && turnos && t1Label ? (
          <PainelEtapaTvResumoCard
            progresso={progresso}
            turnos={turnos}
            dateISO={dateISO}
            unit={unit}
            t1Label={t1Label}
          />
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

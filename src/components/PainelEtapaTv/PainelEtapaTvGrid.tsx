'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import type { PainelEtapaTvOpProgressoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import type { PainelEtapaTvTurnosResumoDto } from '@/domain/painel-etapa-tv/painel-etapa-tv-turnos-resumo';
import type { EtapaProductItem } from '@/components/Realizado/etapa/types';
import type {
  PainelEtapaTvOpFonte,
  PainelEtapaTvUltimoLote,
} from '@/domain/painel-etapa-tv/painel-etapa-tv-types';
import type { PainelEtapaTvFilaOp } from '@/domain/painel-etapa-tv/fila-anterior/painel-etapa-tv-fila-op';
import PainelEtapaTvFilaAnterior from './PainelEtapaTvFilaAnterior';
import PainelEtapaTvGrafico from './PainelEtapaTvGrafico';
import PainelEtapaTvProximasOps from './PainelEtapaTvProximasOps';
import PainelEtapaTvResumoCard from './PainelEtapaTvResumoCard';
import PainelEtapaTvUltimoLotePanel from './PainelEtapaTvUltimoLote';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  PAINEL_ETAPA_TV_CHART_CELL_CLASS,
  PAINEL_ETAPA_TV_GRID_CLASS,
  PAINEL_ETAPA_TV_TOP_CELL_CLASS,
} from './painel-etapa-tv-layout';

type PainelEtapaTvGridProps = {
  config: PainelEtapaTvConfig;
  fluxo: VpFluxoPayload | null;
  hasScale: boolean;
  progresso: PainelEtapaTvOpProgressoDto | null;
  turnos: PainelEtapaTvTurnosResumoDto | null;
  t1Label: string;
  ultimoLotes: PainelEtapaTvUltimoLote[];
  proximasOps: PainelEtapaTvOpFonte[];
  filaOps: PainelEtapaTvFilaOp[];
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

function TopPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${PAINEL_ETAPA_TV_TOP_CELL_CLASS} rounded-xl border border-border-default bg-surface p-3 shadow-control`}
    >
      {children}
    </div>
  );
}

function FilaOuProximas({
  configId,
  proximasOps,
  filaOps,
  products,
  showMarca,
}: {
  configId: PainelEtapaTvConfig['id'];
  proximasOps: PainelEtapaTvOpFonte[];
  filaOps: PainelEtapaTvFilaOp[];
  products: EtapaProductItem[];
  showMarca: boolean;
}) {
  if (configId === 'fermentacao') {
    return (
      <PainelEtapaTvProximasOps
        ops={proximasOps}
        products={products}
        showTipoEstoqueMarcaBadge={showMarca}
      />
    );
  }
  return (
    <PainelEtapaTvFilaAnterior
      etapa={configId === 'forno' ? 'forno' : 'embalagem'}
      ops={filaOps}
      products={products}
      showTipoEstoqueMarcaBadge={showMarca}
    />
  );
}

export default function PainelEtapaTvGrid({
  config,
  fluxo,
  hasScale,
  progresso,
  turnos,
  t1Label,
  ultimoLotes,
  proximasOps,
  filaOps,
  products,
  unit,
  showMarca,
}: PainelEtapaTvGridProps) {
  return (
    <div className={PAINEL_ETAPA_TV_GRID_CLASS}>
      <div className={PAINEL_ETAPA_TV_TOP_CELL_CLASS}>
        {progresso && turnos && t1Label ? (
          <PainelEtapaTvResumoCard
            progresso={progresso}
            turnos={turnos}
            unit={unit}
            t1Label={t1Label}
            accent={config.realizado.accent}
          />
        ) : (
          <FluxoIndisponivel />
        )}
      </div>
      <TopPanel>
        <PainelEtapaTvUltimoLotePanel
          lotes={ultimoLotes}
          products={products}
          unit={unit}
          showTipoEstoqueMarcaBadge={showMarca}
        />
      </TopPanel>
      <TopPanel>
        <FilaOuProximas
          configId={config.id}
          proximasOps={proximasOps}
          filaOps={filaOps}
          products={products}
          showMarca={showMarca}
        />
      </TopPanel>
      <div className={PAINEL_ETAPA_TV_CHART_CELL_CLASS}>
        {fluxo && hasScale ? (
          <PainelEtapaTvGrafico fluxo={fluxo} etapa={config.fluxoKey} />
        ) : (
          <FluxoIndisponivel />
        )}
      </div>
    </div>
  );
}

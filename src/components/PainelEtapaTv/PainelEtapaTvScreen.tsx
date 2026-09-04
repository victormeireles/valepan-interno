'use client';

import { useMemo } from 'react';
import { FluxoDisplayContext } from '@/components/FluxoProcesso/fluxo-display-context';
import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
import type { RealizadoEtapaToolbarMetrics } from '@/components/Realizado/etapa/types';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import { PainelEtapaTvFonteAdapter } from '@/domain/painel-etapa-tv/painel-etapa-tv-fonte-adapter';
import { PainelEtapaTvOpProgresso } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import { PainelEtapaTvProximasOpsPicker } from '@/domain/painel-etapa-tv/painel-etapa-tv-proximas-ops-picker';
import { PainelEtapaTvResumoCopy } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-copy';
import { PainelEtapaTvResumoLotes } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-lotes';
import { PainelEtapaTvUltimoLotePicker } from '@/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import PainelEtapaTvGrid from './PainelEtapaTvGrid';
import PainelEtapaTvHeader from './PainelEtapaTvHeader';
import { PainelEtapaTvFilaBuilder } from './painel-etapa-tv-fila-builder';
import {
  PAINEL_ETAPA_TV_BODY_CLASS,
  PAINEL_ETAPA_TV_SHELL_CLASS,
} from './painel-etapa-tv-layout';
import { PainelEtapaTvProductMapper } from './painel-etapa-tv-product-mapper';

type PainelEtapaTvScreenProps = {
  config: PainelEtapaTvConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  metrics: RealizadoEtapaToolbarMetrics;
  fluxo: VpFluxoPayload | null;
  ordens: PainelOrdemEtapa[];
  pedidos: PainelPedidoEmbalagem[];
};

export default function PainelEtapaTvScreen({
  config,
  selectedDate,
  onDateChange,
  metrics,
  fluxo,
  ordens,
  pedidos,
}: PainelEtapaTvScreenProps) {
  const unit = config.realizado.unit.toUpperCase();
  const showMarca = Boolean(config.realizado.tipoEstoqueMarcaBadge);
  const janela = fluxo?.janelasPorEtapa?.[config.fluxoKey];
  const turnos = fluxo?.turnosResumo?.[config.fluxoKey] ?? null;
  const t1Label = janela ? PainelEtapaTvResumoCopy.t1Label(janela.t1Inicio) : '';

  const products = useMemo(
    () => PainelEtapaTvProductMapper.fromCarga(config.id, { ordens, pedidos }, selectedDate),
    [config.id, ordens, pedidos, selectedDate],
  );

  const { ultimoLotes, proximasOps } = useMemo(() => {
    const fonte =
      config.id === 'embalagem'
        ? PainelEtapaTvFonteAdapter.fromPedidos(pedidos)
        : PainelEtapaTvFonteAdapter.fromOrdens(ordens);
    const janelaMs = janela ? { iniMs: janela.iniMs, fimMs: janela.fimMs } : undefined;
    const doFluxo = fluxo?.ultimoPorEtapa?.[config.fluxoKey];
    const ultimos =
      doFluxo && doFluxo.length > 0
        ? doFluxo
        : PainelEtapaTvUltimoLotePicker.fromLotesPorOp(fonte.lotes, janelaMs);
    return {
      ultimoLotes: ultimos,
      proximasOps: PainelEtapaTvProximasOpsPicker.pick(
        fonte.ops,
        ultimos.map((lote) => lote.ordemId),
      ),
    };
  }, [config.id, config.fluxoKey, fluxo?.ultimoPorEtapa, janela, ordens, pedidos]);

  const filaOps = useMemo(() => {
    if (config.id === 'fermentacao' || !fluxo?.filas) return [];
    return PainelEtapaTvFilaBuilder.fromFluxo(
      config.id,
      fluxo,
      fluxo.filas,
      ordens,
      pedidos,
    );
  }, [config.id, fluxo, ordens, pedidos]);

  const lotesDaEtapa = useMemo(
    () => PainelEtapaTvResumoLotes.fromCarga(config.id, ordens, pedidos),
    [config.id, ordens, pedidos],
  );

  const progresso = useMemo(() => {
    if (!janela) return null;
    return PainelEtapaTvOpProgresso.fromLotes(lotesDaEtapa, metrics.meta, janela);
  }, [janela, lotesDaEtapa, metrics.meta]);

  const scale = useMemo(
    () => (fluxo ? new FluxoDisplayScale(fluxo, config.mode) : null),
    [fluxo, config.mode],
  );

  const grid = (
    <PainelEtapaTvGrid
      config={config}
      fluxo={fluxo}
      hasScale={scale !== null}
      progresso={progresso}
      turnos={turnos}
      t1Label={t1Label}
      ultimoLotes={ultimoLotes}
      proximasOps={proximasOps}
      filaOps={filaOps}
      products={products}
      unit={unit}
      showMarca={showMarca}
    />
  );

  return (
    <div className={PAINEL_ETAPA_TV_SHELL_CLASS}>
      <PainelEtapaTvHeader
        config={config.realizado}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        metrics={metrics}
      />
      <div className={PAINEL_ETAPA_TV_BODY_CLASS}>
        {fluxo && scale ? (
          <FluxoDisplayContext.Provider value={{ mode: config.mode, setMode: () => {}, scale }}>
            {grid}
          </FluxoDisplayContext.Provider>
        ) : (
          grid
        )}
      </div>
    </div>
  );
}

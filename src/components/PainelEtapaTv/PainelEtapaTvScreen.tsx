'use client';

import { useMemo } from 'react';
import { FluxoDisplayContext } from '@/components/FluxoProcesso/fluxo-display-context';
import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
import { pageShellBreakoutX } from '@/components/ui/page-shell';
import type { RealizadoEtapaToolbarMetrics } from '@/components/Realizado/etapa/types';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type { PainelEtapaTvConfig } from '@/domain/painel-etapa-tv/painel-etapa-tv-config';
import { PainelEtapaTvFonteAdapter } from '@/domain/painel-etapa-tv/painel-etapa-tv-fonte-adapter';
import { PainelEtapaTvJanelaLabel } from '@/domain/painel-etapa-tv/painel-etapa-tv-janela-label';
import { PainelEtapaTvOpProgresso } from '@/domain/painel-etapa-tv/painel-etapa-tv-op-progresso';
import { PainelEtapaTvProximasOpsPicker } from '@/domain/painel-etapa-tv/painel-etapa-tv-proximas-ops-picker';
import { PainelEtapaTvResumoCopy } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-copy';
import { PainelEtapaTvResumoLotes } from '@/domain/painel-etapa-tv/painel-etapa-tv-resumo-lotes';
import { PainelEtapaTvUltimoLotePicker } from '@/domain/painel-etapa-tv/painel-etapa-tv-ultimo-lote-picker';
import { formatOpLabelFromDate } from '@/domain/painel-producao/painel-producao-time';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import PainelEtapaTvGrid from './PainelEtapaTvGrid';
import PainelEtapaTvHeader from './PainelEtapaTvHeader';
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
  const janelaLabel = janela
    ? PainelEtapaTvJanelaLabel.format(selectedDate, janela)
    : formatOpLabelFromDate(selectedDate);

  const products = useMemo(
    () => PainelEtapaTvProductMapper.fromCarga(config.id, { ordens, pedidos }, selectedDate),
    [config.id, ordens, pedidos, selectedDate],
  );

  const { ultimoLote, proximasOps } = useMemo(() => {
    const fonte =
      config.id === 'embalagem'
        ? PainelEtapaTvFonteAdapter.fromPedidos(pedidos)
        : PainelEtapaTvFonteAdapter.fromOrdens(ordens);
    const ultimoFluxo = fluxo?.ultimoPorEtapa?.[config.fluxoKey];
    const janelaMs = janela ? { iniMs: janela.iniMs, fimMs: janela.fimMs } : undefined;
    const ultimo =
      ultimoFluxo ??
      PainelEtapaTvUltimoLotePicker.fromLotes(fonte.lotes, janelaMs);
    return {
      ultimoLote: ultimo,
      proximasOps: PainelEtapaTvProximasOpsPicker.pick(fonte.ops, ultimo?.ordemId ?? null),
    };
  }, [config.id, config.fluxoKey, fluxo?.ultimoPorEtapa, janela, ordens, pedidos]);

  const lotesDaEtapa = useMemo(
    () => PainelEtapaTvResumoLotes.fromCarga(config.id, ordens, pedidos),
    [config.id, ordens, pedidos],
  );

  const progresso = useMemo(() => {
    if (!janela) return null;
    return PainelEtapaTvOpProgresso.fromLotes(lotesDaEtapa, metrics.meta, janela);
  }, [janela, lotesDaEtapa, metrics.meta]);

  const ultimoProduct = ultimoLote
    ? PainelEtapaTvProductMapper.findById(products, ultimoLote.ordemId)
    : undefined;
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
      dateISO={selectedDate}
      ultimoLote={ultimoLote}
      ultimoProduct={ultimoProduct}
      proximasOps={proximasOps}
      products={products}
      unit={unit}
      showMarca={showMarca}
    />
  );

  return (
    <div className={`${pageShellBreakoutX} flex min-h-dvh flex-col overflow-hidden -mt-6 -mb-6`}>
      <PainelEtapaTvHeader
        config={config.realizado}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        metrics={metrics}
        janelaLabel={janelaLabel}
      />
      <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
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

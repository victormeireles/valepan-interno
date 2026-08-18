import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  buildCapacidadeContext,
  fluxoProdutividadeCapacidade,
} from '@/domain/fluxo-processo/fluxo-produtividade-capacidade';
import type { FluxoDisplayScale } from './fluxo-display-scale';

export type FluxoEtapaRitmoView = {
  atual: number;
  rateLabel: string;
  deltaOntemPct: number;
  deltaSemanaPct: number;
};

export class FluxoEtapaRitmoDisplay {
  build(
    scale: FluxoDisplayScale,
    fluxo: VpFluxoPayload,
    etapa: FluxoEtapaKey,
  ): FluxoEtapaRitmoView | null {
    const nativo = fluxo.ritmoPorEtapa?.[etapa];
    if (!nativo) return null;
    const ctx = buildCapacidadeContext(fluxo);
    return {
      atual: fluxoProdutividadeCapacidade.displayTaxaNativa(
        etapa,
        scale.mode,
        nativo.atual,
        ctx,
      ),
      rateLabel: scale.rateLabel,
      deltaOntemPct: this.deltaPct(nativo.atual, nativo.ontem),
      deltaSemanaPct: this.deltaPct(nativo.atual, nativo.semana),
    };
  }

  private deltaPct(atual: number, base: number): number {
    if (base <= 0) return 0;
    return Math.round((atual / base - 1) * 100);
  }
}

export const fluxoEtapaRitmoDisplay = new FluxoEtapaRitmoDisplay();

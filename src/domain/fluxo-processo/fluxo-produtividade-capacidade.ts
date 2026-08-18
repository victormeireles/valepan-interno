import { FLUXO_FALLBACK_UN_POR_CAIXA, FLUXO_FALLBACK_UN_POR_LATA } from '@/domain/fluxo-processo/fluxo-processo-constants';
import type { FluxoEtapaKey, VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

export type FluxoProdutividadeMeta = {
  taxaAssadeirasHoraProducao: number;
  taxaAssadeirasHoraForno: number;
  taxaCaixasHoraEmbalagem: number;
};

export type FluxoCapacidadeContext = {
  avgUnPorLata: number;
  avgUnPorCaixa: number;
};

export type FluxoCapacidadeDisplayMode = 'un' | 'lt' | 'cx';

/**
 * Converte taxas de metas_mensais_produtividade para meta de ritmo na UI
 * e para un/h no gargalo.
 */
export class FluxoProdutividadeCapacidade {
  displayCapacidade(
    etapa: FluxoEtapaKey,
    mode: FluxoCapacidadeDisplayMode,
    meta: FluxoProdutividadeMeta,
    ctx: FluxoCapacidadeContext,
  ): number {
    if (etapa === 'ferm') {
      return this.assadeirasDisplay(mode, meta.taxaAssadeirasHoraProducao, ctx);
    }
    if (etapa === 'forno') {
      return this.assadeirasDisplay(mode, meta.taxaAssadeirasHoraForno, ctx);
    }
    return this.caixasDisplay(mode, meta.taxaCaixasHoraEmbalagem, ctx);
  }

  /** Taxa nativa da etapa (ass/h ou cx/h) → unidade do modo de exibição. */
  displayTaxaNativa(
    etapa: FluxoEtapaKey,
    mode: FluxoCapacidadeDisplayMode,
    taxa: number,
    ctx: FluxoCapacidadeContext,
  ): number {
    const raw =
      etapa === 'emb'
        ? this.caixasDisplay(mode, taxa, ctx)
        : this.assadeirasDisplay(mode, taxa, ctx);
    return Math.round(raw);
  }

  capacidadeUnHora(
    etapa: FluxoEtapaKey,
    meta: FluxoProdutividadeMeta,
    ctx: FluxoCapacidadeContext,
  ): number {
    if (etapa === 'ferm') {
      return meta.taxaAssadeirasHoraProducao * ctx.avgUnPorLata;
    }
    if (etapa === 'forno') {
      return meta.taxaAssadeirasHoraForno * ctx.avgUnPorLata;
    }
    return meta.taxaCaixasHoraEmbalagem * ctx.avgUnPorCaixa;
  }

  private assadeirasDisplay(
    mode: FluxoCapacidadeDisplayMode,
    taxaAss: number,
    ctx: FluxoCapacidadeContext,
  ): number {
    if (mode === 'un') return taxaAss * ctx.avgUnPorLata;
    if (mode === 'cx') {
      return ctx.avgUnPorCaixa > 0
        ? (taxaAss * ctx.avgUnPorLata) / ctx.avgUnPorCaixa
        : 0;
    }
    return taxaAss;
  }

  private caixasDisplay(
    mode: FluxoCapacidadeDisplayMode,
    taxaCx: number,
    ctx: FluxoCapacidadeContext,
  ): number {
    if (mode === 'cx') return taxaCx;
    if (mode === 'un') return taxaCx * ctx.avgUnPorCaixa;
    return ctx.avgUnPorLata > 0
      ? (taxaCx * ctx.avgUnPorCaixa) / ctx.avgUnPorLata
      : 0;
  }
}

export function buildCapacidadeContext(fluxo: VpFluxoPayload): FluxoCapacidadeContext {
  let sumUnLt = 0;
  let sumLt = 0;
  let sumUnCx = 0;
  let sumCx = 0;

  for (const ass of fluxo.assadeiras) {
    const factorLt =
      ass.unPorLata > 0 ? ass.unPorLata : FLUXO_FALLBACK_UN_POR_LATA;
    const vol = ass.ferm + ass.forno + ass.emb;
    if (vol > 0 && factorLt > 0) {
      sumUnLt += vol;
      sumLt += vol / factorLt;
    }

    const cxFactor = weightedUnPorCaixa(ass.produtos, fluxo.unPorCaixaByProduto);
    if (cxFactor == null) continue;
    let unKnown = 0;
    for (const p of ass.produtos) {
      const f = unPorCaixaProduto(fluxo, p.nome);
      if (f == null) continue;
      unKnown += p.ferm + p.forno + p.emb;
    }
    if (unKnown > 0) {
      sumUnCx += unKnown;
      sumCx += unKnown / cxFactor;
    }
  }

  return {
    avgUnPorLata: sumLt > 0 ? sumUnLt / sumLt : FLUXO_FALLBACK_UN_POR_LATA,
    avgUnPorCaixa: sumCx > 0 ? sumUnCx / sumCx : FLUXO_FALLBACK_UN_POR_CAIXA,
  };
}

function unPorCaixaProduto(
  fluxo: VpFluxoPayload,
  produtoNome: string,
): number | null {
  const f = fluxo.unPorCaixaByProduto?.[produtoNome];
  return f != null && f > 0 ? f : null;
}

function weightedUnPorCaixa(
  produtos: VpFluxoPayload['assadeiras'][0]['produtos'],
  unPorCaixaByProduto: Record<string, number>,
): number | null {
  let sumUn = 0;
  let sumCx = 0;
  for (const p of produtos) {
    const f = unPorCaixaByProduto[p.nome];
    if (f == null || f <= 0) continue;
    const un = p.ferm + p.forno + p.emb;
    if (un <= 0) continue;
    sumUn += un;
    sumCx += un / f;
  }
  if (sumCx <= 0) return null;
  return sumUn / sumCx;
}

export const fluxoProdutividadeCapacidade = new FluxoProdutividadeCapacidade();

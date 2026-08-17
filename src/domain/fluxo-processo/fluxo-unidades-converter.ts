import {
  FLUXO_ASSADEIRA_SEM,
  FLUXO_FALLBACK_UN_POR_CAIXA,
  FLUXO_FALLBACK_UN_POR_LATA,
} from './fluxo-processo-constants';
import type { FluxoOrdemFatorInput } from './fluxo-processo-types';

export type FluxoFatoresUnidade = {
  unPorLataByProduto: Map<string, number>;
  unPorCaixaByProduto: Map<string, number>;
  unPorLataByAssadeira: Map<string, number>;
  unPorCaixaByAssadeira: Map<string, number>;
};

function avgRatio(sumUn: number, sumDenom: number): number | null {
  if (sumDenom <= 0 || sumUn <= 0) return null;
  return sumUn / sumDenom;
}

/**
 * Fatores un/lata e un/caixa derivados das OPs do dia.
 * Fallback: média da assadeira → 24 un/lata | 48 un/caixa.
 */
export class FluxoUnidadesConverter {
  private readonly fatores: FluxoFatoresUnidade;

  constructor(ordensDia: FluxoOrdemFatorInput[]) {
    this.fatores = FluxoUnidadesConverter.buildFatores(ordensDia);
  }

  static buildFatores(ordensDia: FluxoOrdemFatorInput[]): FluxoFatoresUnidade {
    const lataProd = new Map<string, { un: number; latas: number }>();
    const caixaProd = new Map<string, { un: number; caixas: number }>();
    const lataAss = new Map<string, { un: number; latas: number }>();
    const caixaAss = new Map<string, { un: number; caixas: number }>();

    for (const op of ordensDia) {
      const ass = op.assadeiraNome || FLUXO_ASSADEIRA_SEM;
      if (op.latas > 0) {
        const p = lataProd.get(op.produtoNome) ?? { un: 0, latas: 0 };
        p.un += op.unidades;
        p.latas += op.latas;
        lataProd.set(op.produtoNome, p);
        const a = lataAss.get(ass) ?? { un: 0, latas: 0 };
        a.un += op.unidades;
        a.latas += op.latas;
        lataAss.set(ass, a);
      }
      if (op.caixas > 0) {
        const p = caixaProd.get(op.produtoNome) ?? { un: 0, caixas: 0 };
        p.un += op.unidades;
        p.caixas += op.caixas;
        caixaProd.set(op.produtoNome, p);
        const a = caixaAss.get(ass) ?? { un: 0, caixas: 0 };
        a.un += op.unidades;
        a.caixas += op.caixas;
        caixaAss.set(ass, a);
      }
    }

    const unPorLataByProduto = new Map<string, number>();
    const unPorCaixaByProduto = new Map<string, number>();
    const unPorLataByAssadeira = new Map<string, number>();
    const unPorCaixaByAssadeira = new Map<string, number>();

    for (const [k, v] of lataProd) {
      const r = avgRatio(v.un, v.latas);
      if (r != null) unPorLataByProduto.set(k, r);
    }
    for (const [k, v] of caixaProd) {
      const r = avgRatio(v.un, v.caixas);
      if (r != null) unPorCaixaByProduto.set(k, r);
    }
    for (const [k, v] of lataAss) {
      const r = avgRatio(v.un, v.latas);
      if (r != null) unPorLataByAssadeira.set(k, r);
    }
    for (const [k, v] of caixaAss) {
      const r = avgRatio(v.un, v.caixas);
      if (r != null) unPorCaixaByAssadeira.set(k, r);
    }

    return {
      unPorLataByProduto,
      unPorCaixaByProduto,
      unPorLataByAssadeira,
      unPorCaixaByAssadeira,
    };
  }

  unPorLata(produtoNome: string, assadeiraNome: string): number {
    return (
      this.fatores.unPorLataByProduto.get(produtoNome) ??
      this.fatores.unPorLataByAssadeira.get(assadeiraNome || FLUXO_ASSADEIRA_SEM) ??
      FLUXO_FALLBACK_UN_POR_LATA
    );
  }

  unPorCaixa(produtoNome: string, assadeiraNome: string): number {
    return (
      this.fatores.unPorCaixaByProduto.get(produtoNome) ??
      this.fatores.unPorCaixaByAssadeira.get(assadeiraNome || FLUXO_ASSADEIRA_SEM) ??
      FLUXO_FALLBACK_UN_POR_CAIXA
    );
  }

  /**
   * Fator un/caixa só quando a OP do produto tem caixas (>0).
   * Sem conversão → null (exibição em CX ignora o produto).
   */
  unPorCaixaKnown(produtoNome: string): number | null {
    return this.fatores.unPorCaixaByProduto.get(produtoNome) ?? null;
  }

  knownUnPorCaixaByProduto(): Record<string, number> {
    return Object.fromEntries(this.fatores.unPorCaixaByProduto.entries());
  }

  /**
   * Resolve unidades do apontamento.
   * Com latas/caixas digitadas, deriva unidades pelo fator da OP (mesma língua).
   * Sem latas/caixas (Broa, Pão Francês, etc.), usa unidades diretas.
   */
  resolveUnidades(input: {
    unidades: number;
    latas?: number;
    caixas?: number;
    produtoNome: string;
    assadeiraNome: string;
    etapa: 'ferm' | 'forno' | 'emb';
  }): number {
    const ass = input.assadeiraNome || FLUXO_ASSADEIRA_SEM;
    if (input.etapa === 'emb') {
      const cx = input.caixas ?? 0;
      if (cx > 0) return Math.round(cx * this.unPorCaixa(input.produtoNome, ass));
      if (input.unidades > 0) return Math.round(input.unidades);
      return 0;
    }
    const lt = input.latas ?? 0;
    if (lt > 0) return Math.round(lt * this.unPorLata(input.produtoNome, ass));
    if (input.unidades > 0) return Math.round(input.unidades);
    return 0;
  }
}

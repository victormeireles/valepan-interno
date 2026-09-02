import {
  FLUXO_CAPACIDADE_INFORMADA,
  FLUXO_FALLBACK_UN_POR_CAIXA,
  FLUXO_FALLBACK_UN_POR_LATA,
} from '@/domain/fluxo-processo/fluxo-processo-constants';
import type {
  FluxoEtapaKey,
  FluxoProdutoAssadeira,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import {
  buildCapacidadeContext,
  fluxoProdutividadeCapacidade,
} from '@/domain/fluxo-processo/fluxo-produtividade-capacidade';
import { formatCompactNumber } from '@/lib/utils/format-compact-number';

export type FluxoDisplayMode = 'un' | 'lt' | 'cx';

/**
 * Converte unidades ↔ latas / caixas para exibição.
 * Fonte de verdade continua em unidades no payload.
 * Modo CX: só produtos com unPorCaixaByProduto; demais ignorados.
 */
export class FluxoDisplayScale {
  private readonly unPorLataByAss: Map<string, number>;
  private readonly unPorCaixaByAss: Map<string, number>;
  private readonly avgUnPorLata: number;
  private readonly avgUnPorCaixa: number;

  constructor(
    private readonly fluxo: VpFluxoPayload,
    readonly mode: FluxoDisplayMode,
  ) {
    this.unPorLataByAss = new Map();
    this.unPorCaixaByAss = new Map();
    let sumUnLt = 0;
    let sumLt = 0;
    let sumUnCx = 0;
    let sumCx = 0;

    for (const a of fluxo.assadeiras) {
      const factorLt =
        a.unPorLata > 0 ? a.unPorLata : FLUXO_FALLBACK_UN_POR_LATA;
      this.unPorLataByAss.set(a.nome, factorLt);
      if (a.ferm + a.forno + a.emb > 0 && factorLt > 0) {
        sumUnLt += a.ferm + a.forno + a.emb;
        sumLt += (a.ferm + a.forno + a.emb) / factorLt;
      }

      const cxFactor = this.weightedUnPorCaixa(a.produtos);
      if (cxFactor != null) {
        this.unPorCaixaByAss.set(a.nome, cxFactor);
        let unKnown = 0;
        for (const p of a.produtos) {
          if (this.unPorCaixaProduto(p.nome) == null) continue;
          unKnown += p.ferm + p.forno + p.emb;
        }
        if (unKnown > 0) {
          sumUnCx += unKnown;
          sumCx += unKnown / cxFactor;
        }
      }
    }

    this.avgUnPorLata =
      sumLt > 0 ? sumUnLt / sumLt : FLUXO_FALLBACK_UN_POR_LATA;
    this.avgUnPorCaixa =
      sumCx > 0 ? sumUnCx / sumCx : FLUXO_FALLBACK_UN_POR_CAIXA;
  }

  get unitLabel(): string {
    if (this.mode === 'un') return 'un';
    if (this.mode === 'cx') return 'CX';
    return 'LT';
  }

  get rateLabel(): string {
    if (this.mode === 'un') return 'un/h';
    if (this.mode === 'cx') return 'CX/h';
    return 'LT/h';
  }

  /** true se o produto entra no modo caixas. */
  temConversaoCaixa(produtoNome: string): boolean {
    return this.unPorCaixaProduto(produtoNome) != null;
  }

  factorFor(assadeiraNome: string): number {
    if (this.mode === 'cx') {
      return this.unPorCaixaByAss.get(assadeiraNome) ?? this.avgUnPorCaixa;
    }
    return this.unPorLataByAss.get(assadeiraNome) ?? this.avgUnPorLata;
  }

  fromUn(
    unidades: number,
    assadeiraNome?: string,
    produtoNome?: string,
  ): number {
    if (this.mode === 'un') return unidades;
    if (this.mode === 'cx') {
      if (produtoNome) {
        const f = this.unPorCaixaProduto(produtoNome);
        if (f == null || f <= 0) return 0;
        return unidades / f;
      }
      const factor = assadeiraNome
        ? (this.unPorCaixaByAss.get(assadeiraNome) ?? 0)
        : this.avgUnPorCaixa;
      if (factor <= 0) return 0;
      return unidades / factor;
    }
    const factor = assadeiraNome
      ? this.factorFor(assadeiraNome)
      : this.avgUnPorLata;
    if (factor <= 0) return 0;
    return unidades / factor;
  }

  /**
   * Volume do controle em assadeiras (LT) → modo de exibição.
   * matrizPrevisto é sempre em LT, em todas as etapas.
   */
  fromNativo(
    volume: number,
    _etapa: FluxoEtapaKey,
    assadeiraNome?: string,
  ): number {
    void _etapa;
    if (volume <= 0) return 0;
    if (this.mode === 'lt') return volume;
    const unPorLt = this.unPorLata(assadeiraNome);
    if (unPorLt <= 0) return 0;
    const un = volume * unPorLt;
    if (this.mode === 'un') return un;
    const unPorCx = this.unPorCaixa(assadeiraNome);
    return unPorCx > 0 ? un / unPorCx : 0;
  }

  etapaTotal(etapa: FluxoEtapaKey): number {
    if (this.mode === 'un') {
      return this.fluxo.etapas.find((e) => e.key === etapa)?.un ?? 0;
    }
    if (this.mode === 'cx' && etapa === 'emb') {
      return this.fluxo.etapas.find((e) => e.key === 'emb')?.volOperacional ?? 0;
    }
    if (this.mode === 'cx') {
      let total = 0;
      for (const ass of this.fluxo.assadeiras) {
        for (const p of ass.produtos) {
          const f = this.unPorCaixaProduto(p.nome);
          if (f == null || f <= 0) continue;
          total += etapaUnProduto(p, etapa) / f;
        }
      }
      return total;
    }
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const horas = this.fluxo.matriz[etapa][ass] ?? [];
      const un = horas.reduce((t, v) => t + v, 0);
      total += this.fromUn(un, ass);
    }
    return total;
  }

  opAnteriorTotal(etapa: FluxoEtapaKey = 'emb'): number {
    if (this.mode === 'un') return this.somaMatrizAntUn(etapa);
    if (this.mode === 'cx') {
      return etapa === 'emb' ? this.fluxo.opAnterior.volOperacional : 0;
    }
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const horas = this.fluxo.matrizAnt[etapa][ass] ?? [];
      const un = horas.reduce((t, v) => t + v, 0);
      total += this.fromUn(un, ass);
    }
    return total;
  }

  private somaMatrizAntUn(etapa: FluxoEtapaKey): number {
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const horas = this.fluxo.matrizAnt[etapa][ass] ?? [];
      total += horas.reduce((t, v) => t + v, 0);
    }
    return total;
  }

  planoTotal(): number {
    return this.fromUn(this.fluxo.planoUn);
  }

  capacidade(etapa: FluxoEtapaKey): number {
    const meta = this.fluxo.produtividade;
    if (meta) {
      return fluxoProdutividadeCapacidade.displayCapacidade(
        etapa,
        this.mode,
        meta,
        buildCapacidadeContext(this.fluxo),
      );
    }

    const cap = FLUXO_CAPACIDADE_INFORMADA[etapa];
    if (this.mode === 'un') return cap.un;
    if (this.mode === 'cx') {
      return this.avgUnPorCaixa > 0
        ? Math.round(cap.un / this.avgUnPorCaixa)
        : Math.round(cap.lt / 2);
    }
    return cap.lt;
  }

  horaTotal(etapa: FluxoEtapaKey, hour: number): number {
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      total += this.celula(etapa, ass, hour);
    }
    return total;
  }

  horaPrevisto(etapa: FluxoEtapaKey, hour: number): number {
    if (!this.fluxo.controle) return 0;
    const matrizPrevisto = this.fluxo.controle.matrizPrevisto;
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const nativo = matrizPrevisto[etapa][ass]?.[hour] ?? 0;
      total += this.fromNativo(nativo, etapa, ass);
    }
    return total;
  }

  celula(etapa: FluxoEtapaKey, ass: string, hour: number): number {
    if (this.mode === 'cx') {
      return this.celulaPorProduto(etapa, ass, hour);
    }
    const un = this.fluxo.matriz[etapa][ass]?.[hour] ?? 0;
    return this.fromUn(un, ass);
  }

  celulaAnt(etapa: FluxoEtapaKey, ass: string, hour: number): number {
    if (this.mode === 'cx') {
      const un = this.fluxo.matrizAnt[etapa][ass]?.[hour] ?? 0;
      if (un <= 0) return 0;
      const factor = this.unPorCaixaByAss.get(ass) ?? 0;
      if (factor <= 0) return 0;
      return un / factor;
    }
    const un = this.fluxo.matrizAnt[etapa][ass]?.[hour] ?? 0;
    return this.fromUn(un, ass);
  }

  /** Total da etapa na assadeira (modo CX ignora produtos sem fator). */
  assadeiraEtapaTotal(ass: string, etapa: FluxoEtapaKey): number {
    const row = this.fluxo.assadeiras.find((a) => a.nome === ass);
    if (!row) return 0;
    if (this.mode === 'cx') {
      let total = 0;
      for (const p of row.produtos) {
        const f = this.unPorCaixaProduto(p.nome);
        if (f == null || f <= 0) continue;
        total += etapaUnProduto(p, etapa) / f;
      }
      return total;
    }
    const un =
      etapa === 'ferm' ? row.ferm : etapa === 'forno' ? row.forno : row.emb;
    return this.fromUn(un, ass);
  }

  assadeiraEmbAntTotal(ass: string): number {
    const row = this.fluxo.assadeiras.find((a) => a.nome === ass);
    if (!row) return 0;
    if (this.mode === 'cx') {
      let total = 0;
      for (const p of row.produtos) {
        const f = this.unPorCaixaProduto(p.nome);
        if (f == null || f <= 0 || p.embAnt <= 0) continue;
        total += p.embAnt / f;
      }
      return total;
    }
    return this.fromUn(row.embAnt, ass);
  }

  maxHoraComum(): number {
    let max = 1;
    for (const k of ['ferm', 'forno', 'emb'] as FluxoEtapaKey[]) {
      for (let h = 0; h < 24; h++) {
        max = Math.max(max, this.horaTotal(k, h), this.horaPrevisto(k, h));
      }
    }
    return max;
  }

  private unPorLata(assadeiraNome?: string): number {
    if (!assadeiraNome) return this.avgUnPorLata;
    return this.unPorLataByAss.get(assadeiraNome) ?? this.avgUnPorLata;
  }

  private unPorCaixa(assadeiraNome?: string): number {
    if (!assadeiraNome) return this.avgUnPorCaixa;
    return this.unPorCaixaByAss.get(assadeiraNome) ?? this.avgUnPorCaixa;
  }

  private unPorCaixaProduto(produtoNome: string): number | null {
    const f = this.fluxo.unPorCaixaByProduto?.[produtoNome];
    return f != null && f > 0 ? f : null;
  }

  private weightedUnPorCaixa(
    produtos: FluxoProdutoAssadeira[],
  ): number | null {
    let sumUn = 0;
    let sumCx = 0;
    for (const p of produtos) {
      const f = this.unPorCaixaProduto(p.nome);
      if (f == null || f <= 0) continue;
      const un = p.ferm + p.forno + p.emb;
      if (un <= 0) continue;
      sumUn += un;
      sumCx += un / f;
    }
    if (sumCx <= 0) return null;
    return sumUn / sumCx;
  }

  private celulaPorProduto(
    etapa: FluxoEtapaKey,
    ass: string,
    hour: number,
  ): number {
    const row = this.fluxo.assadeiras.find((a) => a.nome === ass);
    if (!row) return 0;
    let total = 0;
    for (const p of row.produtos) {
      const f = this.unPorCaixaProduto(p.nome);
      if (f == null || f <= 0) continue;
      const horas = horasEtapa(p, etapa);
      total += (horas[hour] ?? 0) / f;
    }
    return total;
  }
}

function etapaUnProduto(p: FluxoProdutoAssadeira, etapa: FluxoEtapaKey): number {
  if (etapa === 'ferm') return p.ferm;
  if (etapa === 'forno') return p.forno;
  return p.emb;
}

function horasEtapa(p: FluxoProdutoAssadeira, etapa: FluxoEtapaKey): number[] {
  if (etapa === 'ferm') return p.fermHoras;
  if (etapa === 'forno') return p.fornoHoras;
  return p.embHoras;
}

export function fmtQty(n: number, mode?: FluxoDisplayMode): string {
  void mode;
  return formatCompactNumber(n);
}

/** Volume completo em pt-BR, sem sufixo k/M. */
export function fmtQtyExact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('pt-BR');
}

export function fmtQtyK(n: number, mode?: FluxoDisplayMode): string {
  return fmtQty(n, mode);
}

export function fmtCellShort(n: number, mode: FluxoDisplayMode): string {
  if (n <= 0) return '';
  if ((mode === 'lt' || mode === 'cx') && n < 0.5) return '·';
  if (mode === 'un' && n < 50) return '·';
  return formatCompactNumber(n);
}

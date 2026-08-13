import {
  FLUXO_CAPACIDADE_INFORMADA,
  FLUXO_FALLBACK_UN_POR_LATA,
} from '@/domain/fluxo-processo/fluxo-processo-constants';
import type {
  FluxoEtapaKey,
  VpFluxoPayload,
} from '@/domain/fluxo-processo/fluxo-processo-types';
import { formatCompactNumber } from '@/lib/utils/format-compact-number';

export type FluxoDisplayMode = 'un' | 'lt';

/**
 * Converte unidades ↔ latas (assadeiras) para exibição.
 * Fonte de verdade continua em unidades no payload.
 */
export class FluxoDisplayScale {
  private readonly unPorLataByAss: Map<string, number>;
  private readonly avgUnPorLata: number;

  constructor(
    private readonly fluxo: VpFluxoPayload,
    readonly mode: FluxoDisplayMode,
  ) {
    this.unPorLataByAss = new Map();
    let sumUn = 0;
    let sumLt = 0;
    for (const a of fluxo.assadeiras) {
      const factor =
        a.unPorLata > 0 ? a.unPorLata : FLUXO_FALLBACK_UN_POR_LATA;
      this.unPorLataByAss.set(a.nome, factor);
      if (a.ferm + a.forno + a.emb > 0 && factor > 0) {
        sumUn += a.ferm + a.forno + a.emb;
        sumLt += (a.ferm + a.forno + a.emb) / factor;
      }
    }
    this.avgUnPorLata =
      sumLt > 0 ? sumUn / sumLt : FLUXO_FALLBACK_UN_POR_LATA;
  }

  get unitLabel(): string {
    return this.mode === 'un' ? 'un' : 'LT';
  }

  get rateLabel(): string {
    return this.mode === 'un' ? 'un/h' : 'LT/h';
  }

  factorFor(assadeiraNome: string): number {
    return this.unPorLataByAss.get(assadeiraNome) ?? this.avgUnPorLata;
  }

  fromUn(unidades: number, assadeiraNome?: string): number {
    if (this.mode === 'un') return unidades;
    const factor = assadeiraNome
      ? this.factorFor(assadeiraNome)
      : this.avgUnPorLata;
    if (factor <= 0) return 0;
    return unidades / factor;
  }

  /** Soma convertida célula a célula por assadeira (fecha com o card). */
  etapaTotal(etapa: FluxoEtapaKey): number {
    if (this.mode === 'un') {
      return this.fluxo.etapas.find((e) => e.key === etapa)?.un ?? 0;
    }
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const horas = this.fluxo.matriz[etapa][ass] ?? [];
      const un = horas.reduce((t, v) => t + v, 0);
      total += this.fromUn(un, ass);
    }
    return total;
  }

  opAnteriorTotal(): number {
    if (this.mode === 'un') return this.fluxo.opAnterior.un;
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const horas = this.fluxo.matrizAnt.emb[ass] ?? [];
      const un = horas.reduce((t, v) => t + v, 0);
      total += this.fromUn(un, ass);
    }
    return total;
  }

  planoTotal(): number {
    return this.fromUn(this.fluxo.planoUn);
  }

  capacidade(etapa: FluxoEtapaKey): number {
    const cap = FLUXO_CAPACIDADE_INFORMADA[etapa];
    return this.mode === 'un' ? cap.un : cap.lt;
  }

  horaTotal(etapa: FluxoEtapaKey, hour: number): number {
    let total = 0;
    for (const ass of this.fluxo.ordemAss) {
      const un = this.fluxo.matriz[etapa][ass]?.[hour] ?? 0;
      total += this.fromUn(un, ass);
    }
    return total;
  }

  celula(etapa: FluxoEtapaKey, ass: string, hour: number): number {
    const un = this.fluxo.matriz[etapa][ass]?.[hour] ?? 0;
    return this.fromUn(un, ass);
  }

  celulaAnt(etapa: FluxoEtapaKey, ass: string, hour: number): number {
    const un = this.fluxo.matrizAnt[etapa][ass]?.[hour] ?? 0;
    return this.fromUn(un, ass);
  }

  maxHoraComum(): number {
    let max = 1;
    for (const k of ['ferm', 'forno', 'emb'] as FluxoEtapaKey[]) {
      for (let h = 0; h < 24; h++) {
        max = Math.max(max, this.horaTotal(k, h));
      }
    }
    return max;
  }
}

export function fmtQty(n: number, mode?: FluxoDisplayMode): string {
  void mode;
  return formatCompactNumber(n);
}

/** Alias para eixos / capacidades (mesma regra compacta). */
export function fmtQtyK(n: number, mode?: FluxoDisplayMode): string {
  return fmtQty(n, mode);
}

/** Rótulo compacto sob a barra / na célula do percurso. */
export function fmtCellShort(n: number, mode: FluxoDisplayMode): string {
  if (n <= 0) return '';
  if (mode === 'lt' && n < 0.5) return '·';
  if (mode === 'un' && n < 50) return '·';
  return formatCompactNumber(n);
}

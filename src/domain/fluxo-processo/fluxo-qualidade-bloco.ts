import { FLUXO_BLOCO_MAX_GAP_MINUTES } from './fluxo-processo-constants';
import { brazilMinuteOfDayFromIso } from './fluxo-paradas';
import type { FluxoBlocoLancamento } from './fluxo-processo-types';

export type FluxoBlocoEvento = {
  produzidoEm: string;
  produtoNome: string;
  unidades: number;
};

export type FluxoQualidadeBlocoResult = {
  blocoPct: number;
  /** Top rajadas por unidades (só grupos com ≥2 apontamentos). */
  lancamentos: FluxoBlocoLancamento[];
};

/**
 * Qualidade do apontamento: % de intervalos ≤ maxGapMin (lançamento em bloco)
 * + principais rajadas para cobrança operacional.
 */
export class FluxoQualidadeBlocoCalculator {
  constructor(
    private readonly maxGapMinutes: number = FLUXO_BLOCO_MAX_GAP_MINUTES,
    private readonly topN: number = 5,
  ) {}

  compute(events: FluxoBlocoEvento[]): FluxoQualidadeBlocoResult {
    const sorted = [...events]
      .filter((e) => e.unidades > 0 && brazilMinuteOfDayFromIso(e.produzidoEm) != null)
      .sort(
        (a, b) => new Date(a.produzidoEm).getTime() - new Date(b.produzidoEm).getTime(),
      );

    if (sorted.length < 2) {
      return { blocoPct: 0, lancamentos: [] };
    }

    let blocoIntervals = 0;
    const totalIntervals = sorted.length - 1;

    type Run = { items: FluxoBlocoEvento[] };
    const runs: Run[] = [];
    let current: FluxoBlocoEvento[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevMin = brazilMinuteOfDayFromIso(sorted[i - 1].produzidoEm)!;
      const curMin = brazilMinuteOfDayFromIso(sorted[i].produzidoEm)!;
      const dur = curMin - prevMin;
      if (dur <= this.maxGapMinutes) {
        blocoIntervals += 1;
        current.push(sorted[i]);
      } else {
        runs.push({ items: current });
        current = [sorted[i]];
      }
    }
    runs.push({ items: current });

    const lancamentos = runs
      .filter((r) => r.items.length >= 2)
      .map((r) => this.toLancamento(r.items))
      .sort((a, b) => b.un - a.un || b.eventos - a.eventos)
      .slice(0, this.topN);

    return {
      blocoPct: Math.round((blocoIntervals / totalIntervals) * 100),
      lancamentos,
    };
  }

  /** Compat: só o percentual. */
  computePct(timestampsIso: string[]): number {
    return this.compute(
      timestampsIso.map((produzidoEm) => ({
        produzidoEm,
        produtoNome: '',
        unidades: 1,
      })),
    ).blocoPct;
  }

  private toLancamento(items: FluxoBlocoEvento[]): FluxoBlocoLancamento {
    const ini = brazilMinuteOfDayFromIso(items[0].produzidoEm)!;
    const fim = brazilMinuteOfDayFromIso(items[items.length - 1].produzidoEm)!;
    const un = items.reduce((t, e) => t + e.unidades, 0);
    const byProd = new Map<string, number>();
    for (const e of items) {
      if (!e.produtoNome) continue;
      byProd.set(e.produtoNome, (byProd.get(e.produtoNome) ?? 0) + e.unidades);
    }
    const produtos = [...byProd.entries()]
      .map(([nome, u]) => ({ nome, un: u }))
      .sort((a, b) => b.un - a.un)
      .slice(0, 3);

    return {
      ini,
      fim,
      eventos: items.length,
      un,
      produtos,
    };
  }
}

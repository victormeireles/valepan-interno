import { FLUXO_LEAD_BIN_COUNT } from './fluxo-processo-constants';
import type { FluxoLeadStats } from './fluxo-processo-types';

export type FluxoLeadEvento = {
  produtoNome: string;
  produzidoEm: string;
  unidades: number;
};

type WeightedLag = { lagMin: number; un: number };

/**
 * Casamento FIFO por produto entre etapas.
 * Lag ponderado pelas unidades casadas; mediana/p90 ponderados por un.
 */
export class FluxoLeadTimeCalculator {
  compute(origem: FluxoLeadEvento[], destino: FluxoLeadEvento[]): FluxoLeadStats {
    const pairs = this.matchFifo(origem, destino);
    return this.statsFromPairs(pairs);
  }

  matchFifo(origem: FluxoLeadEvento[], destino: FluxoLeadEvento[]): WeightedLag[] {
    const byProdOrigem = groupByProduto(origem);
    const byProdDestino = groupByProduto(destino);
    const pairs: WeightedLag[] = [];

    for (const [produto, destRows] of byProdDestino) {
      const origRows = byProdOrigem.get(produto) ?? [];
      const queue = origRows.map((r) => ({
        t: new Date(r.produzidoEm).getTime(),
        rem: r.unidades,
      }));
      let qi = 0;

      for (const d of destRows) {
        let need = d.unidades;
        const tDest = new Date(d.produzidoEm).getTime();
        if (Number.isNaN(tDest) || need <= 0) continue;

        while (need > 0 && qi < queue.length) {
          const head = queue[qi];
          if (head.rem <= 0) {
            qi += 1;
            continue;
          }
          const take = Math.min(need, head.rem);
          const lagMin = (tDest - head.t) / 60_000;
          pairs.push({ lagMin, un: take });
          head.rem -= take;
          need -= take;
          if (head.rem <= 0) qi += 1;
        }
      }
    }

    return pairs;
  }

  statsFromPairs(pairs: WeightedLag[]): FluxoLeadStats {
    const bins = Array.from({ length: FLUXO_LEAD_BIN_COUNT }, () => 0);
    let negativoUn = 0;
    let sumLagUn = 0;
    let totalUn = 0;

    const expanded: { lagMin: number; un: number }[] = [];

    for (const p of pairs) {
      if (p.un <= 0) continue;
      totalUn += p.un;
      sumLagUn += p.lagMin * p.un;
      if (p.lagMin < 0) {
        negativoUn += p.un;
      } else {
        const bin = Math.min(FLUXO_LEAD_BIN_COUNT - 1, Math.floor(p.lagMin / 60));
        if (bin >= 0) bins[bin] += p.un;
      }
      expanded.push(p);
    }

    const media = totalUn > 0 ? Math.round(sumLagUn / totalUn) : 0;
    const mediana = weightedPercentile(expanded, 0.5);
    const p90 = weightedPercentile(expanded, 0.9);

    return { media, mediana, p90, negativoUn, bins };
  }
}

function groupByProduto(rows: FluxoLeadEvento[]): Map<string, FluxoLeadEvento[]> {
  const map = new Map<string, FluxoLeadEvento[]>();
  for (const r of rows) {
    if (r.unidades <= 0) continue;
    const t = new Date(r.produzidoEm).getTime();
    if (Number.isNaN(t)) continue;
    const list = map.get(r.produtoNome) ?? [];
    list.push(r);
    map.set(r.produtoNome, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.produzidoEm).getTime() - new Date(b.produzidoEm).getTime());
  }
  return map;
}

/** Percentil ponderado por unidades; arredonda minutos. */
function weightedPercentile(pairs: WeightedLag[], p: number): number {
  if (pairs.length === 0) return 0;
  const sorted = [...pairs].sort((a, b) => a.lagMin - b.lagMin);
  const total = sorted.reduce((t, x) => t + x.un, 0);
  if (total <= 0) return 0;
  const target = total * p;
  let acc = 0;
  for (const row of sorted) {
    acc += row.un;
    if (acc >= target) return Math.round(row.lagMin);
  }
  return Math.round(sorted[sorted.length - 1].lagMin);
}

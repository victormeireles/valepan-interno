import { getBrazilHourFromIso } from '@/lib/utils/date-utils';

import { FLUXO_ASSADEIRA_SEM } from './fluxo-processo-constants';
import type { FluxoEtapaKey, FluxoMatrizEtapas, FluxoMatrizHoras } from './fluxo-processo-types';

export type FluxoMatrizEntry = {
  assadeiraNome: string;
  unidades: number;
  hour?: number;
  timestamp?: string;
  /** true = OP de outra data (parcela vai para matrizAnt). */
  opAnterior?: boolean;
};

function emptyHoras(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

export function emptyMatrizHoras(assadeiras: string[]): FluxoMatrizHoras {
  const m: FluxoMatrizHoras = {};
  for (const a of assadeiras) m[a] = emptyHoras();
  return m;
}

export function emptyMatrizEtapas(assadeiras: string[]): FluxoMatrizEtapas {
  return {
    ferm: emptyMatrizHoras(assadeiras),
    forno: emptyMatrizHoras(assadeiras),
    emb: emptyMatrizHoras(assadeiras),
  };
}

export function sumMatrizHoras(m: FluxoMatrizHoras): number {
  let total = 0;
  for (const horas of Object.values(m)) {
    for (const v of horas) total += v;
  }
  return total;
}

export function sumMatrizEtapa(matriz: FluxoMatrizEtapas, key: FluxoEtapaKey): number {
  return sumMatrizHoras(matriz[key]);
}

/**
 * matriz[etapa][assadeira][hora] = Σ unidades.
 * matrizAnt isola a parcela de OP anterior em ferm, forno e emb.
 */
export class FluxoMatrizHorariaBuilder {
  build(
    assadeiras: string[],
    byEtapa: Record<FluxoEtapaKey, FluxoMatrizEntry[]>,
  ): { matriz: FluxoMatrizEtapas; matrizAnt: FluxoMatrizEtapas } {
    const matriz = emptyMatrizEtapas(assadeiras);
    const matrizAnt = emptyMatrizEtapas(assadeiras);

    for (const key of ['ferm', 'forno', 'emb'] as FluxoEtapaKey[]) {
      for (const entry of byEtapa[key]) {
        if (entry.unidades <= 0) continue;
        const ass = entry.assadeiraNome || FLUXO_ASSADEIRA_SEM;
        if (!matriz[key][ass]) {
          matriz[key][ass] = emptyHoras();
          matrizAnt[key][ass] = emptyHoras();
        }
        const hour =
          entry.hour ??
          (entry.timestamp ? getBrazilHourFromIso(entry.timestamp) : null);
        if (hour == null || hour < 0 || hour > 23) continue;
        matriz[key][ass][hour] += entry.unidades;
        if (entry.opAnterior) {
          matrizAnt[key][ass][hour] += entry.unidades;
        }
      }
    }

    return { matriz, matrizAnt };
  }
}

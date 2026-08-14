import type { InsumoConsumoCalculado } from '@/domain/insumos/insumo-consumo-producao-types';

const EPSILON = 1e-9;

export type InsumoReconcileDelta = {
  insumoId: string;
  delta: number;
};

/**
 * Calcula os deltas de ledger necessários para o lote atingir os consumos alvo.
 * `deltasAtuais` = soma atual de delta_quantidade por insumo no lote (negativo = saída).
 */
export class InsumoConsumoReconcileDeltaCalculator {
  static calcular(
    consumosAlvo: InsumoConsumoCalculado[],
    deltasAtuais: Map<string, number>,
  ): InsumoReconcileDelta[] {
    const alvoMap = new Map(consumosAlvo.map((c) => [c.insumoId, c.quantidade]));
    const insumoIds = new Set([...deltasAtuais.keys(), ...alvoMap.keys()]);
    const result: InsumoReconcileDelta[] = [];

    for (const insumoId of insumoIds) {
      const consumoAlvo = alvoMap.get(insumoId) ?? 0;
      const deltaJaRegistrado = deltasAtuais.get(insumoId) ?? 0;
      const deltaNecessario = -consumoAlvo - deltaJaRegistrado;
      if (Math.abs(deltaNecessario) < EPSILON) continue;
      result.push({ insumoId, delta: deltaNecessario });
    }

    return result;
  }
}

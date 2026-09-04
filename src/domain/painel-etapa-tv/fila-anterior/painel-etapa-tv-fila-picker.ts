import type { PainelEtapaTvFilaOp } from './painel-etapa-tv-fila-op';

/**
 * Top N da fila da etapa anterior, FIFO pelo lote mais antigo na fila-gate.
 * Gate (gateUn > 0) já foi aplicado no aggregator — aqui só ordena e corta.
 */
export class PainelEtapaTvFilaPicker {
  static pick(ops: readonly PainelEtapaTvFilaOp[], limite = 3): PainelEtapaTvFilaOp[] {
    return [...ops]
      .sort((a, b) => {
        if (a.oldestLoteEm !== b.oldestLoteEm) {
          return a.oldestLoteEm < b.oldestLoteEm ? -1 : 1;
        }
        return a.ordemId.localeCompare(b.ordemId);
      })
      .slice(0, limite);
  }
}

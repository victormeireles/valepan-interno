import { describe, expect, it } from 'vitest';
import { toMassaStepOrder } from './massa-step-modal-order';
import type { ProductionQueueItem } from './queue/production-queue-types';

describe('toMassaStepOrder', () => {
  it('adapta a ordem da fila para o formato esperado pelo formulario de massa', () => {
    const item = {
      id: 'ordem-1',
      lote_codigo: 'OP-001',
      produto_id: 'produto-1',
      qtd_planejada: 120,
      produtos: {
        nome: 'Bisnaguinha',
        unidadeNomeResumido: 'un',
        unidades_assadeira: 24,
        box_units: 12,
        receita_massa: {
          quantidade_por_produto: 0.08,
        },
      },
    } satisfies ProductionQueueItem;

    expect(toMassaStepOrder(item)).toEqual({
      id: 'ordem-1',
      lote_codigo: 'OP-001',
      qtd_planejada: 120,
      produto: {
        id: 'produto-1',
        nome: 'Bisnaguinha',
        unidadeNomeResumido: 'un',
        unidades_assadeira: 24,
        box_units: 12,
        receita_massa: {
          quantidade_por_produto: 0.08,
        },
      },
    });
  });
});

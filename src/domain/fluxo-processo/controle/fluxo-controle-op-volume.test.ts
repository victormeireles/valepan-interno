import { describe, expect, it } from 'vitest';

import { controleVolumeOp } from './fluxo-controle-op-volume';
import type { FluxoControleOpInput } from './fluxo-controle-types';

function op(over: Partial<FluxoControleOpInput> = {}): FluxoControleOpInput {
  return {
    id: 'op-1',
    ordemPlanejamento: 1,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    unidades: 2400,
    assadeiras: 100,
    caixas: 33,
    fermentacaoInicioPrevisto: '',
    fermentacaoFimPrevisto: '',
    camaraFimPrevisto: '',
    fornoInicioPrevisto: '',
    fornoFimPrevisto: '',
    resfriamentoFimPrevisto: '',
    embalagemInicioPrevisto: '',
    embalagemFimPrevisto: '',
    ...over,
  };
}

describe('controleVolumeOp', () => {
  it('LT usa assadeiras mesmo quando caixas são outras (ex. 33 CX ≠ 100 LT)', () => {
    expect(controleVolumeOp(op(), 'lt')).toBe(100);
    expect(controleVolumeOp(op(), 'cx')).toBe(33);
  });
});

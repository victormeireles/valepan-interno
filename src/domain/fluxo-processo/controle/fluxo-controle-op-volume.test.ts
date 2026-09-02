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

  it('OP fechada parcial: fermentação fica na OP; forno/emb usam o confirmado', () => {
    const parcial = op({
      assadeiras: 310,
      caixas: 155,
      fermentacaoMetaConfirmada: 1,
      fornoMetaConfirmada: 1,
      embalagemMetaConfirmada: 1,
    });

    expect(controleVolumeOp(parcial, 'lt', 'ferm')).toBe(310);
    expect(controleVolumeOp(parcial, 'lt', 'forno')).toBe(1);
    expect(controleVolumeOp(parcial, 'cx', 'emb')).toBe(1);
    expect(controleVolumeOp(parcial, 'lt')).toBe(310);
  });

  it('forno cascateia fermentação confirmada enquanto o forno não fechou', () => {
    const row = op({ assadeiras: 310, fermentacaoMetaConfirmada: 1 });
    expect(controleVolumeOp(row, 'lt', 'ferm')).toBe(310);
    expect(controleVolumeOp(row, 'lt', 'forno')).toBe(1);
    expect(controleVolumeOp(row, 'lt', 'emb')).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import { OrdemRemocao } from './ordem-remocao';

describe('OrdemRemocao', () => {
  const remocao = new OrdemRemocao();

  it('libera remoção sem vínculos', () => {
    expect(remocao.avaliar({ pecasUsadas: 0, movimentosEstoque: 0 })).toEqual({
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover a ordem.',
    });
  });

  it('bloqueia com peças e movimentos', () => {
    expect(remocao.avaliar({ pecasUsadas: 2, movimentosEstoque: 1 })).toEqual({
      pode: false,
      vinculos: ['2 peças usadas na OS', '1 movimento de estoque'],
      mensagem:
        'Não é possível remover esta ordem. Remova antes os vínculos listados para não quebrar o histórico.',
    });
  });
});

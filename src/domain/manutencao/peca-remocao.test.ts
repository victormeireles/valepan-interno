import { describe, expect, it } from 'vitest';
import { PecaRemocao } from './peca-remocao';

describe('PecaRemocao', () => {
  const remocao = new PecaRemocao();

  it('libera remoção sem uso em ordens', () => {
    expect(remocao.avaliar({ usosEmOrdens: 0 })).toEqual({
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover a peça.',
    });
  });

  it('bloqueia só com usos em ordens', () => {
    expect(remocao.avaliar({ usosEmOrdens: 2 })).toEqual({
      pode: false,
      vinculos: ['2 usos em ordens'],
      mensagem:
        'Não é possível remover esta peça. Remova antes os vínculos listados para não quebrar o histórico.',
    });
  });
});

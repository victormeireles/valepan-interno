import { describe, expect, it } from 'vitest';
import { OrdemRemocao } from './ordem-remocao';

describe('OrdemRemocao', () => {
  const remocao = new OrdemRemocao();

  it('libera a remoção e devolve as peças da própria ordem ao estoque', () => {
    expect(remocao.avaliar()).toEqual({
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover a ordem. Peças usadas voltam ao estoque.',
    });
  });
});

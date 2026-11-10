import { describe, expect, it } from 'vitest';
import { PlanoRemocao } from './plano-remocao';

describe('PlanoRemocao', () => {
  const remocao = new PlanoRemocao();

  it('libera remoção sem ordens', () => {
    expect(remocao.avaliar({ ordens: 0 })).toEqual({
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover o plano.',
    });
  });

  it('bloqueia com ordens ligadas', () => {
    expect(remocao.avaliar({ ordens: 3 })).toEqual({
      pode: false,
      vinculos: ['3 ordens de serviço'],
      mensagem:
        'Não é possível remover este plano. Remova antes os vínculos listados para não quebrar o histórico.',
    });
  });
});

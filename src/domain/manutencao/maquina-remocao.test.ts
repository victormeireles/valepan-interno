import { describe, expect, it } from 'vitest';
import { MaquinaRemocao } from './maquina-remocao';

describe('MaquinaRemocao', () => {
  const remocao = new MaquinaRemocao();

  it('libera remoção sem vínculos', () => {
    expect(remocao.avaliar({ ordens: 0, planos: 0 })).toEqual({
      pode: true,
      vinculos: [],
      mensagem: 'Pode remover a máquina.',
    });
  });

  it('bloqueia com ordens e planos', () => {
    expect(remocao.avaliar({ ordens: 3, planos: 1 })).toEqual({
      pode: false,
      vinculos: ['3 ordens de serviço', '1 plano preventivo'],
      mensagem:
        'Não é possível remover esta máquina. Remova antes os vínculos listados para não quebrar o histórico.',
    });
  });
});

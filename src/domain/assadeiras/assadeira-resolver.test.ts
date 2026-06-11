import { describe, expect, it } from 'vitest';
import { buildVinculoResolvido } from './assadeira-vinculo-builder';

describe('buildVinculoResolvido', () => {
  const assadeiraAtiva = {
    nome: 'Assadeira 24',
    unidades_por_assadeira: 24,
    ativo: true,
  };

  it('monta vínculo de exceção com override', () => {
    const result = buildVinculoResolvido(
      'a1',
      assadeiraAtiva,
      18,
      'excecao',
    );
    expect(result).toEqual({
      assadeira_id: 'a1',
      assadeira_nome: 'Assadeira 24',
      unidades_por_assadeira: 18,
      unidades_efetivas: 18,
      assadeira_padrao: 24,
      origem: 'excecao',
    });
  });

  it('herda padrão da assadeira na regra', () => {
    const result = buildVinculoResolvido(
      'a1',
      assadeiraAtiva,
      null,
      'regra',
    );
    expect(result?.unidades_efetivas).toBe(24);
    expect(result?.origem).toBe('regra');
  });

  it('ignora assadeira inativa', () => {
    const result = buildVinculoResolvido(
      'a1',
      { ...assadeiraAtiva, ativo: false },
      null,
      'regra',
    );
    expect(result).toBeNull();
  });

  it('retorna null sem fator efetivo', () => {
    const result = buildVinculoResolvido(
      'a1',
      { nome: 'X', unidades_por_assadeira: null, ativo: true },
      null,
      'regra',
    );
    expect(result).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { resolverAtualizacoesVinculoMassa } from './receita-massa-vinculos-resolver';

describe('resolverAtualizacoesVinculoMassa', () => {
  const ingredientes = [
    { quantidade: 5, unidade: 'kg' },
    { quantidade: 5, unidade: 'L' },
  ];

  it('calcula quantidade para produtos com gramatura conhecida', () => {
    const resultado = resolverAtualizacoesVinculoMassa(ingredientes, [
      {
        vinculoId: 'v1',
        produtoNome: 'HB Brioche 50g',
        unit_weight: null,
      },
      {
        vinculoId: 'v2',
        produtoNome: 'HB Brioche 65g',
        unit_weight: 65,
      },
    ]);

    expect(resultado.atualizacoes).toEqual([
      { vinculoId: 'v1', quantidade: 200 },
      { vinculoId: 'v2', quantidade: 154 },
    ]);
    expect(resultado.ignorados).toEqual([]);
  });

  it('ignora produtos sem gramatura', () => {
    const resultado = resolverAtualizacoesVinculoMassa(ingredientes, [
      {
        vinculoId: 'v1',
        produtoNome: 'HB Gergelim',
        unit_weight: null,
      },
    ]);

    expect(resultado.atualizacoes).toEqual([]);
    expect(resultado.ignorados).toHaveLength(1);
    expect(resultado.ignorados[0]?.motivo).toContain('gramatura');
  });
});

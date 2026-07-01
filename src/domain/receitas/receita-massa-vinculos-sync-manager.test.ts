import { describe, expect, it } from 'vitest';
import { resolverAtualizacoesVinculoMassa } from './receita-massa-vinculos-resolver';

describe('resolverAtualizacoesVinculoMassa', () => {
  const ingredientes = [
    { quantidade: 5, unidade: 'kg' },
    { quantidade: 5, unidade: 'L' },
  ];

  // pesoG = gramatura assada, quantidade = massa crua (g)
  const gramaturas = [
    { pesoG: 50, quantidade: 54 },
    { pesoG: 65, quantidade: 70 },
  ];

  it('calcula quantidade dividindo pela massa crua da gramatura assada', () => {
    const resultado = resolverAtualizacoesVinculoMassa(
      ingredientes,
      [
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
      ],
      gramaturas,
    );

    // 10000 g / 54 = 185 ; 10000 g / 70 = 143
    expect(resultado.atualizacoes).toEqual([
      { vinculoId: 'v1', quantidade: 185 },
      { vinculoId: 'v2', quantidade: 143 },
    ]);
    expect(resultado.ignorados).toEqual([]);
  });

  it('ignora produtos sem gramatura', () => {
    const resultado = resolverAtualizacoesVinculoMassa(
      ingredientes,
      [
        {
          vinculoId: 'v1',
          produtoNome: 'HB Gergelim',
          unit_weight: null,
        },
      ],
      gramaturas,
    );

    expect(resultado.atualizacoes).toEqual([]);
    expect(resultado.ignorados).toHaveLength(1);
    expect(resultado.ignorados[0]?.motivo).toContain('gramatura');
  });

  it('ignora produtos sem par de massa crua cadastrado', () => {
    const resultado = resolverAtualizacoesVinculoMassa(
      ingredientes,
      [
        {
          vinculoId: 'v1',
          produtoNome: 'HB Brioche 60g',
          unit_weight: 60,
        },
      ],
      gramaturas,
    );

    expect(resultado.atualizacoes).toEqual([]);
    expect(resultado.ignorados).toHaveLength(1);
    expect(resultado.ignorados[0]?.motivo).toContain('massa crua');
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatarMotivoBloqueioExclusaoInsumo,
  podeExcluirInsumo,
  resolverBloqueiosExclusaoInsumo,
} from './insumo-delete-eligibility';

describe('podeExcluirInsumo', () => {
  it('permite exclusão sem receitas nem vínculos Omie', () => {
    expect(podeExcluirInsumo(0, 0)).toBe(true);
  });

  it('bloqueia com receitas', () => {
    expect(podeExcluirInsumo(1, 0)).toBe(false);
  });

  it('bloqueia com vínculos Omie', () => {
    expect(podeExcluirInsumo(0, 1)).toBe(false);
  });
});

describe('resolverBloqueiosExclusaoInsumo', () => {
  it('retorna vazio quando não há bloqueios', () => {
    expect(
      resolverBloqueiosExclusaoInsumo({
        receitasCount: 0,
        vinculosOmieCount: 0,
        movimentosCount: 0,
      }),
    ).toEqual([]);
  });

  it('inclui movimentos como bloqueio', () => {
    expect(
      resolverBloqueiosExclusaoInsumo({
        receitasCount: 0,
        vinculosOmieCount: 0,
        movimentosCount: 2,
      }),
    ).toEqual(['movimentos']);
  });
});

describe('formatarMotivoBloqueioExclusaoInsumo', () => {
  it('formata bloqueio combinado de receitas e Omie', () => {
    expect(
      formatarMotivoBloqueioExclusaoInsumo(['receitas', 'omie']),
    ).toContain('receitas e produtos Omie');
  });
});

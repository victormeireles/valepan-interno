import { describe, expect, it } from 'vitest';

import { isVinculoReceitaMassaAtiva } from './receita-massa-eligibility';

describe('isVinculoReceitaMassaAtiva', () => {
  it('aceita vínculo com tipo massa no link', () => {
    expect(
      isVinculoReceitaMassaAtiva({
        tipo: 'massa',
        receitas: { tipo: 'brilho', ativo: true },
      }),
    ).toBe(true);
  });

  it('aceita quando receita é massa mesmo com tipo errado no vínculo', () => {
    expect(
      isVinculoReceitaMassaAtiva({
        tipo: 'brilho',
        receitas: { tipo: 'massa', ativo: true },
      }),
    ).toBe(true);
  });

  it('usa tipo da receita quando link não tem tipo', () => {
    expect(
      isVinculoReceitaMassaAtiva({
        tipo: null,
        receitas: { tipo: 'massa', ativo: true },
      }),
    ).toBe(true);
  });

  it('rejeita receita inativa', () => {
    expect(
      isVinculoReceitaMassaAtiva({
        receitas: { tipo: 'massa', ativo: false },
      }),
    ).toBe(false);
  });

  it('rejeita quando nem link nem receita são massa', () => {
    expect(
      isVinculoReceitaMassaAtiva({
        tipo: 'brilho',
        receitas: { tipo: 'brilho', ativo: true },
      }),
    ).toBe(false);
  });
});

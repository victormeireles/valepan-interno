import { describe, expect, it } from 'vitest';
import { validateInsumoConversaoParams } from './insumo-conversao-params';

describe('validateInsumoConversaoParams', () => {
  it('aceita ambos vazios', () => {
    expect(
      validateInsumoConversaoParams({
        unidadeId: 'kg-id',
        conversaoUnidadeId: null,
        conversaoFator: null,
      }),
    ).toEqual({ ok: true, conversaoUnidadeId: null, conversaoFator: null });
  });

  it('exige par completo', () => {
    expect(
      validateInsumoConversaoParams({
        unidadeId: 'kg-id',
        conversaoUnidadeId: 'un-id',
        conversaoFator: null,
      }),
    ).toMatchObject({ ok: false });
  });

  it('rejeita mesma unidade', () => {
    expect(
      validateInsumoConversaoParams({
        unidadeId: 'kg-id',
        conversaoUnidadeId: 'kg-id',
        conversaoFator: 5.2,
      }),
    ).toMatchObject({ ok: false });
  });

  it('aceita conversão válida', () => {
    expect(
      validateInsumoConversaoParams({
        unidadeId: 'kg-id',
        conversaoUnidadeId: 'un-id',
        conversaoFator: 5.2,
      }),
    ).toEqual({
      ok: true,
      conversaoUnidadeId: 'un-id',
      conversaoFator: 5.2,
    });
  });
});

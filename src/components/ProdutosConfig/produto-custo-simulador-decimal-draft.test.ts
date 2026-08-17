import { describe, expect, it } from 'vitest';

import { produtoCustoSimuladorDecimalDraft } from './produto-custo-simulador-decimal-draft';

describe('produtoCustoSimuladorDecimalDraft', () => {
  it('não confirma literal incompleto com ponto ou vírgula', () => {
    expect(produtoCustoSimuladorDecimalDraft.commit('1.')).toEqual({
      shouldCommit: false,
      value: undefined,
    });
    expect(produtoCustoSimuladorDecimalDraft.commit('1,')).toEqual({
      shouldCommit: false,
      value: undefined,
    });
  });

  it('confirma número completo com ponto ou vírgula', () => {
    expect(produtoCustoSimuladorDecimalDraft.commit('1.5')).toEqual({
      shouldCommit: true,
      value: 1.5,
    });
    expect(produtoCustoSimuladorDecimalDraft.commit('1,5')).toEqual({
      shouldCommit: true,
      value: 1.5,
    });
    expect(produtoCustoSimuladorDecimalDraft.commit('12')).toEqual({
      shouldCommit: true,
      value: 12,
    });
  });

  it('campo vazio confirma limpeza do valor', () => {
    expect(produtoCustoSimuladorDecimalDraft.commit('')).toEqual({
      shouldCommit: true,
      value: undefined,
    });
    expect(produtoCustoSimuladorDecimalDraft.commit('   ')).toEqual({
      shouldCommit: true,
      value: undefined,
    });
  });

  it('mantém rascunho incompleto quando o pai ainda tem o inteiro', () => {
    expect(produtoCustoSimuladorDecimalDraft.draftForParent('1.', 1)).toBe('1.');
    expect(produtoCustoSimuladorDecimalDraft.draftForParent('1,', 1)).toBe('1,');
  });

  it('preserva vírgula no rascunho quando o valor confirmado bate com o pai', () => {
    expect(produtoCustoSimuladorDecimalDraft.draftForParent('1,5', 1.5)).toBe('1,5');
  });

  it('sincroniza o rascunho quando o pai muda por fora', () => {
    expect(produtoCustoSimuladorDecimalDraft.draftForParent('1,5', undefined)).toBe('');
    expect(produtoCustoSimuladorDecimalDraft.draftForParent('', 2)).toBe('2');
  });
});

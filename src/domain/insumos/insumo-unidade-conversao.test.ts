import { describe, expect, it } from 'vitest';
import { InsumoUnidadeConversao } from './insumo-unidade-conversao';
import { InsumoUnidadeConversaoFormatter } from './insumo-unidade-conversao-formatter';

describe('InsumoUnidadeConversao', () => {
  it('converte kg para UN e de volta (bobina 5,2 kg)', () => {
    const conversao = InsumoUnidadeConversao.fromConfig({
      unidadeExibicao: 'UN',
      fator: 5.2,
    });

    expect(conversao.isAtiva).toBe(true);
    expect(conversao.toExibicao(520)).toBeCloseTo(100, 8);
    expect(conversao.toEstoque(100)).toBeCloseTo(520, 8);
  });

  it('sem conversão retorna a mesma quantidade', () => {
    const conversao = InsumoUnidadeConversao.fromConfig(null);
    expect(conversao.isAtiva).toBe(false);
    expect(conversao.toExibicao(42)).toBe(42);
    expect(conversao.toEstoque(42)).toBe(42);
  });

  it('ignora fator inválido', () => {
    expect(InsumoUnidadeConversao.fromFonte({
      conversaoFator: 0,
      conversaoUnidadeResumida: 'UN',
    }).isAtiva).toBe(false);

    expect(InsumoUnidadeConversao.fromFonte({
      conversaoFator: 5.2,
      conversaoUnidadeResumida: '  ',
    }).isAtiva).toBe(false);
  });
});

describe('InsumoUnidadeConversaoFormatter', () => {
  it('mostra UN como primária e kg como secundária', () => {
    const formatter = InsumoUnidadeConversaoFormatter.create('kg', {
      unidadeExibicao: 'UN',
      fator: 5.2,
    });

    const result = formatter.formatQuantidade(520);
    expect(result.primaria).toBe('100 UN');
    expect(result.secundaria).toBe('520 kg');
    expect(result.valorExibicao).toBeCloseTo(100, 8);
  });

  it('sem conversão mostra só a unidade de estoque', () => {
    const formatter = InsumoUnidadeConversaoFormatter.create('kg', null);
    const result = formatter.formatQuantidade(520);
    expect(result.primaria).toBe('520 kg');
    expect(result.secundaria).toBeNull();
  });

  it('monta hint de equivalência no input', () => {
    const formatter = InsumoUnidadeConversaoFormatter.create('kg', {
      unidadeExibicao: 'UN',
      fator: 5.2,
    });
    expect(formatter.formatEquivalenteEstoque(100)).toBe('Equivale a 520 kg');
    expect(formatter.formatFatorLabel()).toBe('1 UN = 5,2 kg');
    expect(formatter.unidadeCampo()).toBe('UN');
  });
});

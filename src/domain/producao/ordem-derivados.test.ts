import { describe, expect, it } from 'vitest';
import {
  assadeirasFromSheetQuantidade,
  deriveQuantidadesFromAssadeiras,
  deriveQuantidadesFromUnidades,
} from './ordem-derivados';

describe('deriveQuantidadesFromAssadeiras', () => {
  it('calcula unidades e caixas com floor', () => {
    const result = deriveQuantidadesFromAssadeiras({
      assadeiras: 5,
      unidadesPorAssadeira: 24,
      boxUnits: 12,
    });
    expect(result).toEqual({
      unidades: 120,
      caixas: 10,
      pacotes: 0,
      kg: 0,
    });
  });

  it('caixas = 0 sem box_units', () => {
    const result = deriveQuantidadesFromAssadeiras({
      assadeiras: 3,
      unidadesPorAssadeira: 20,
      boxUnits: null,
    });
    expect(result.unidades).toBe(60);
    expect(result.caixas).toBe(0);
  });

  it('floor não arredonda para cima', () => {
    const result = deriveQuantidadesFromAssadeiras({
      assadeiras: 1,
      unidadesPorAssadeira: 25,
      boxUnits: 12,
    });
    expect(result.unidades).toBe(25);
    expect(result.caixas).toBe(2);
  });
});

describe('assadeirasFromSheetQuantidade', () => {
  it('retorna 5 assadeiras para 120 unidades com fator 24', () => {
    const result = assadeirasFromSheetQuantidade(
      { caixas: 0, pacotes: 0, unidades: 120, kg: 0 },
      { unidadesPorAssadeira: 24, boxUnits: 12 },
    );
    expect(result).toBe(5);
  });

  it('usa caixas*boxUnits quando unidades é zero', () => {
    const result = assadeirasFromSheetQuantidade(
      { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
      { unidadesPorAssadeira: 24, boxUnits: 12 },
    );
    expect(result).toBe(5);
  });

  it('retorna 0 sem quantidade válida', () => {
    const result = assadeirasFromSheetQuantidade(
      { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
      { unidadesPorAssadeira: 24, boxUnits: 12 },
    );
    expect(result).toBe(0);
  });
});

describe('deriveQuantidadesFromUnidades', () => {
  it('mantém unidades totais e deriva caixas com floor', () => {
    const result = deriveQuantidadesFromUnidades({
      unidades: 1000,
      boxUnits: 24,
    });
    expect(result).toEqual({
      unidades: 1000,
      caixas: 41,
      pacotes: 0,
      kg: 0,
    });
  });

  it('caixas = 0 sem box_units', () => {
    const result = deriveQuantidadesFromUnidades({
      unidades: 500,
      boxUnits: null,
    });
    expect(result).toEqual({
      unidades: 500,
      caixas: 0,
      pacotes: 0,
      kg: 0,
    });
  });

  it('arredonda unidades para inteiro', () => {
    const result = deriveQuantidadesFromUnidades({
      unidades: 99.6,
      boxUnits: 10,
    });
    expect(result.unidades).toBe(100);
    expect(result.caixas).toBe(10);
  });
});

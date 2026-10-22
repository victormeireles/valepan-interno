import { describe, expect, it } from 'vitest';
import { FaltaCampos } from './falta-campos';

const campos = new FaltaCampos();

describe('FaltaCampos', () => {
  it('esconde justificativa só em injustificada', () => {
    expect(campos.mostraJustificativa('pendente')).toBe(true);
    expect(campos.mostraJustificativa('justificada')).toBe(true);
    expect(campos.mostraJustificativa('injustificada')).toBe(false);
  });

  it('mostra medida só em injustificada', () => {
    expect(campos.mostraMedida('injustificada')).toBe(true);
    expect(campos.mostraMedida('pendente')).toBe(false);
  });

  it('normaliza injustificada limpando justificativa', () => {
    expect(
      campos.normalizar({
        classificacao: 'injustificada',
        justificativa: 'atestado',
        medida: 'advertencia',
      }),
    ).toEqual({
      classificacao: 'injustificada',
      justificativa: null,
      medida: 'advertencia',
    });
  });

  it('normaliza justificada limpando medida', () => {
    expect(
      campos.normalizar({
        classificacao: 'justificada',
        justificativa: '  ASO  ',
        medida: 'suspensao',
      }),
    ).toEqual({
      classificacao: 'justificada',
      justificativa: 'ASO',
      medida: null,
    });
  });
});

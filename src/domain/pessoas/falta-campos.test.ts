import { describe, expect, it } from 'vitest';
import { FaltaCampos } from './falta-campos';

const campos = new FaltaCampos();

describe('FaltaCampos', () => {
  it('esconde justificativa em injustificada e suspensão', () => {
    expect(campos.mostraJustificativa('pendente')).toBe(true);
    expect(campos.mostraJustificativa('justificada')).toBe(true);
    expect(campos.mostraJustificativa('injustificada')).toBe(false);
    expect(campos.mostraJustificativa('suspensao')).toBe(false);
  });

  it('mostra medida só em injustificada', () => {
    expect(campos.mostraMedida('injustificada')).toBe(true);
    expect(campos.mostraMedida('pendente')).toBe(false);
    expect(campos.mostraMedida('suspensao')).toBe(false);
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

  it('normaliza suspensão sem justificativa nem medida', () => {
    expect(
      campos.normalizar({
        classificacao: 'suspensao',
        justificativa: 'atestado',
        medida: 'advertencia',
      }),
    ).toEqual({
      classificacao: 'suspensao',
      justificativa: null,
      medida: null,
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

  it('patchEdicao omite medida quando o campo não veio', () => {
    expect(
      campos.patchEdicao({ classificacao: 'injustificada', justificativa: 'atestado' }),
    ).toEqual({ classificacao: 'injustificada', justificativa: null });
  });

  it('patchEdicao grava medida quando ela veio', () => {
    expect(
      campos.patchEdicao({
        classificacao: 'injustificada',
        justificativa: '',
        medida: 'advertencia',
      }),
    ).toEqual({
      classificacao: 'injustificada',
      justificativa: null,
      medida: 'advertencia',
    });
  });

  it('patchEdicao limpa medida quando veio vazia', () => {
    expect(
      campos.patchEdicao({
        classificacao: 'injustificada',
        justificativa: '',
        medida: '',
      }),
    ).toEqual({
      classificacao: 'injustificada',
      justificativa: null,
      medida: null,
    });
  });
});

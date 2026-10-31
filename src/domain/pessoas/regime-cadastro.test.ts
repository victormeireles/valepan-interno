import { describe, expect, it } from 'vitest';
import { RegimeCadastroNormalizador } from './regime-cadastro';

describe('RegimeCadastroNormalizador', () => {
  const normalizador = new RegimeCadastroNormalizador();

  it('nasce CLT e zera CNPJ e razão social', () => {
    expect(normalizador.normalizar({})).toEqual({ regime: 'clt', cnpj: null, razaoSocial: null });
    expect(normalizador.normalizar({ regime: 'clt', cnpj: '11444777000161', razaoSocial: 'Pao LTDA' })).toEqual({
      regime: 'clt',
      cnpj: null,
      razaoSocial: null,
    });
  });

  it('aceita PJ sem documentos e com CNPJ mascarado', () => {
    expect(normalizador.normalizar({ regime: 'pj' })).toEqual({ regime: 'pj', cnpj: null, razaoSocial: null });
    expect(normalizador.normalizar({ regime: 'pj', cnpj: '11.444.777/0001-61', razaoSocial: '  Pao LTDA  ' })).toEqual({
      regime: 'pj',
      cnpj: '11444777000161',
      razaoSocial: 'Pao LTDA',
    });
  });

  it('recusa regime, CNPJ e razão social inválidos', () => {
    expect(() => normalizador.normalizar({ regime: 'mei' })).toThrow('Regime inválido.');
    expect(() => normalizador.normalizar({ regime: 'pj', cnpj: '11' })).toThrow('CNPJ inválido.');
    expect(() => normalizador.normalizar({ regime: 'pj', razaoSocial: 'A'.repeat(201) })).toThrow('Razão social longa demais.');
  });
});

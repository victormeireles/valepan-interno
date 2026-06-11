import { describe, expect, it } from 'vitest';
import { buildLegacyEtiquetaGerarBody } from './etiqueta-legacy-payload';

describe('buildLegacyEtiquetaGerarBody', () => {
  it('monta body compatível com EtiquetaModal', () => {
    const body = buildLegacyEtiquetaGerarBody({
      produtoNome: 'HB Brioche',
      tipoEstoqueNome: 'Cliente X',
      dataFabricacao: '2026-06-11',
      resolved: {
        nomeEtiqueta: 'HB Smash',
        diasValidade: 21,
        diasValidadeCongelado: 90,
        congelado: true,
        mostrarTextoCongelado: false,
        lote: 162,
      },
    });
    expect(body).toEqual({
      produto: 'HB Brioche',
      nomeEtiqueta: 'HB Smash',
      dataFabricacao: '2026-06-11',
      diasValidade: 21,
      diasValidadeCongelado: 90,
      congelado: true,
      mostrarTextoCongelado: false,
      lote: 162,
      cliente: 'Cliente X',
    });
  });
});

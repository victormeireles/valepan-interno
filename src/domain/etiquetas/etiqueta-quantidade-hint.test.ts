import { describe, expect, it } from 'vitest';
import { buildEtiquetaQuantidadeHint } from './etiqueta-quantidade-hint';

describe('buildEtiquetaQuantidadeHint', () => {
  it('retorna hint para caixas', () => {
    expect(buildEtiquetaQuantidadeHint('cx', { caixas: 50, pacotes: 0, unidades: 0, kg: 0 }))
      .toBe('≈50 etiquetas');
  });

  it('retorna null quando zero', () => {
    expect(buildEtiquetaQuantidadeHint('cx', { caixas: 0, pacotes: 0, unidades: 0, kg: 0 }))
      .toBeNull();
  });
});

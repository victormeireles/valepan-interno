import { describe, expect, it } from 'vitest';
import { formatEtiquetaMeta, formatEtiquetaRealizado } from './format-etiqueta-quantidade';

describe('format-etiqueta-quantidade', () => {
  it('exibe apenas caixas e pacotes na meta, como realizado/embalagem', () => {
    const quantidade = { caixas: 10, pacotes: 5, unidades: 100, kg: 3 };
    expect(formatEtiquetaMeta(quantidade)).toBe('10 cx + 5 pct');
    expect(formatEtiquetaRealizado(quantidade)).toBe('10 cx + 5 pct');
  });

  it('exibe 0 cx quando não há caixas nem pacotes', () => {
    const quantidade = { caixas: 0, pacotes: 0, unidades: 500, kg: 0 };
    expect(formatEtiquetaMeta(quantidade)).toBe('0 cx');
  });
});

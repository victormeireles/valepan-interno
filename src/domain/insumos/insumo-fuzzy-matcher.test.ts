import { describe, expect, it } from 'vitest';
import {
  detectIgnorarKeyword,
  inferFatorConversao,
  insumoFuzzyMatcher,
  jaccardSimilarity,
} from './insumo-fuzzy-matcher';

const catalogo = [
  {
    id: '1',
    nome: 'Farinha de trigo especial',
    unidadeCodigo: 'KG',
    unidadeNome: 'Quilograma',
  },
  {
    id: '2',
    nome: 'Açúcar cristal',
    unidadeCodigo: 'KG',
    unidadeNome: 'Quilograma',
  },
];

describe('insumo-fuzzy-matcher', () => {
  it('calcula similaridade entre descrições parecidas', () => {
    const score = jaccardSimilarity(
      'FARINHA TRIGO ESPECIAL 25KG',
      'Farinha de trigo especial',
    );
    expect(score).toBeGreaterThan(0.4);
  });

  it('detecta keyword para ignorar', () => {
    const result = detectIgnorarKeyword('SERVICO DE MANUTENCAO FORNO');
    expect(result).not.toBeNull();
    expect(result?.confianca).toBe(85);
  });

  it('infere fator por peso na descrição', () => {
    expect(inferFatorConversao('FARINHA ESPECIAL SACO 25KG', 'SC')).toBe(25);
  });

  it('encontra melhor match no catálogo', () => {
    const match = insumoFuzzyMatcher.findBestMatch(
      'FARINHA TRIGO ESPECIAL 25KG SACO',
      'SC',
      catalogo,
    );
    expect(match?.insumoId).toBe('1');
    expect(match?.fatorConversao).toBe(25);
  });
});

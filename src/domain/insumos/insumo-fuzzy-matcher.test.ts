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

  it('detecta keyword para ignorar serviço', () => {
    const result = detectIgnorarKeyword('SERVICO DE MANUTENCAO FORNO');
    expect(result).not.toBeNull();
    expect(result?.confianca).toBeGreaterThanOrEqual(85);
  });

  it('detecta produto de limpeza', () => {
    const result = detectIgnorarKeyword('DETERGENTE NEUTRO 5L');
    expect(result).not.toBeNull();
    expect(result?.motivo).toContain('limpeza');
  });

  it('detecta EPI', () => {
    const result = detectIgnorarKeyword('LUVA NITRILICA M');
    expect(result).not.toBeNull();
    expect(result?.motivo).toContain('EPI');
  });

  it('detecta material de escritório', () => {
    const result = detectIgnorarKeyword('PAPEL A4 SULFITE RESMA');
    expect(result).not.toBeNull();
    expect(result?.motivo).toContain('escritório');
  });

  it('detecta fornecedor de limpeza pelo contexto', () => {
    const result = detectIgnorarKeyword({
      descricao: 'Detergente neutro 5L',
      fornecedorRazaoSocial: 'CLEAN MIX PROD DE HIG E LIMP LTDA',
      fornecedorNome: 'CLEAN MIX',
    });
    expect(result).not.toBeNull();
    expect(result?.confianca).toBeGreaterThanOrEqual(88);
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

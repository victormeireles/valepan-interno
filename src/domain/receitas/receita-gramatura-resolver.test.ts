import { describe, expect, it } from 'vitest';
import {
  resolverMassaCruaGramas,
  resolverQuantidadePorGramatura,
} from './receita-gramatura-resolver';

describe('resolverQuantidadePorGramatura', () => {
  const gramaturas = [
    { pesoG: 50, quantidade: 5000 },
    { pesoG: 65, quantidade: 4888 },
    { pesoG: 75, quantidade: 4200 },
  ];

  it('retorna quantidade quando gramatura coincide', () => {
    expect(resolverQuantidadePorGramatura(gramaturas, 65)).toBe(4888);
  });

  it('retorna null sem correspondência', () => {
    expect(resolverQuantidadePorGramatura(gramaturas, 60)).toBeNull();
  });

  it('retorna null sem gramatura do produto', () => {
    expect(resolverQuantidadePorGramatura(gramaturas, null)).toBeNull();
  });
});

describe('resolverMassaCruaGramas', () => {
  // Para massa: pesoG = gramatura assada, quantidade = massa crua (g)
  const pares = [
    { pesoG: 50, quantidade: 54 },
    { pesoG: 65, quantidade: 70 },
    { pesoG: 75, quantidade: 81 },
  ];

  it('retorna a massa crua do par correspondente à gramatura assada', () => {
    expect(resolverMassaCruaGramas(pares, 65)).toBe(70);
  });

  it('retorna null quando não há par para a gramatura assada', () => {
    expect(resolverMassaCruaGramas(pares, 60)).toBeNull();
  });

  it('retorna null sem gramatura do produto', () => {
    expect(resolverMassaCruaGramas(pares, null)).toBeNull();
    expect(resolverMassaCruaGramas([], 65)).toBeNull();
  });
});

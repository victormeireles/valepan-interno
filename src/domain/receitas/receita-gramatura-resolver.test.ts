import { describe, expect, it } from 'vitest';
import { resolverQuantidadePorGramatura } from './receita-gramatura-resolver';

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

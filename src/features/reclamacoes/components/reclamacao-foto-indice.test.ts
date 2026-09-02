import { describe, expect, it } from 'vitest';
import { indiceFotoCircular } from './reclamacao-foto-indice';

describe('indiceFotoCircular', () => {
  it('avança e volta ao início', () => {
    expect(indiceFotoCircular(0, 3, 1)).toBe(1);
    expect(indiceFotoCircular(2, 3, 1)).toBe(0);
  });

  it('volta e vai ao fim', () => {
    expect(indiceFotoCircular(0, 3, -1)).toBe(2);
    expect(indiceFotoCircular(1, 3, -1)).toBe(0);
  });

  it('com uma foto permanece em 0', () => {
    expect(indiceFotoCircular(0, 1, 1)).toBe(0);
    expect(indiceFotoCircular(0, 1, -1)).toBe(0);
  });
});

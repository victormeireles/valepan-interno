import { describe, expect, it } from 'vitest';
import {
  RECLAMACAO_MAX_FOTOS,
  assertLimiteFotos,
} from './reclamacao-fotos-limite';

describe('reclamacao-fotos-limite', () => {
  it('aceita até 10 e recusa 11', () => {
    expect(assertLimiteFotos(0)).toBeNull();
    expect(assertLimiteFotos(RECLAMACAO_MAX_FOTOS)).toBeNull();
    expect(assertLimiteFotos(11)).toBe('No máximo 10 fotos.');
  });
});

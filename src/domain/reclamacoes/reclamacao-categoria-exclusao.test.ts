import { describe, expect, it } from 'vitest';
import {
  CATEGORIA_EM_USO_MESSAGE,
  assertCategoriaPodeExcluir,
} from './reclamacao-categoria-exclusao';

describe('assertCategoriaPodeExcluir', () => {
  it('permite count 0 e recusa uso', () => {
    expect(assertCategoriaPodeExcluir(0)).toBeNull();
    expect(assertCategoriaPodeExcluir(1)).toBe(CATEGORIA_EM_USO_MESSAGE);
  });
});

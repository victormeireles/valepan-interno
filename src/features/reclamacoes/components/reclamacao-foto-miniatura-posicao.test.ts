import { describe, expect, it } from 'vitest';
import { posicaoMiniaturaFoto } from './reclamacao-foto-miniatura-posicao';

describe('posicaoMiniaturaFoto', () => {
  it('abre à esquerda do ícone quando cabe', () => {
    expect(
      posicaoMiniaturaFoto({ left: 400, right: 444, top: 200, height: 44 }),
    ).toEqual({ top: 134, left: 216 });
  });

  it('abre à direita quando não cabe à esquerda', () => {
    const pos = posicaoMiniaturaFoto({ left: 20, right: 64, top: 200, height: 44 });
    expect(pos.left).toBe(72);
  });
});

import { describe, expect, it } from 'vitest';
import { isCategoriaSempreVisivelEmbalagem } from './categoria-embalagem-visibilidade-rules';

describe('isCategoriaSempreVisivelEmbalagem', () => {
  it('reconhece hambúrguer com e sem acento', () => {
    expect(isCategoriaSempreVisivelEmbalagem('Hambúrguer')).toBe(true);
    expect(isCategoriaSempreVisivelEmbalagem('HAMBURGUER')).toBe(true);
  });

  it('reconhece hot dog', () => {
    expect(isCategoriaSempreVisivelEmbalagem('Hot Dog')).toBe(true);
    expect(isCategoriaSempreVisivelEmbalagem('hotdog')).toBe(true);
  });

  it('rejeita outras categorias', () => {
    expect(isCategoriaSempreVisivelEmbalagem('Pão de Forma')).toBe(false);
    expect(isCategoriaSempreVisivelEmbalagem('Doce')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { navegacaoOculta } from './navegacao-oculta';

describe('navegacaoOculta', () => {
  it('esconde login, TV e a página pública, e mantém a lista', () => {
    expect(navegacaoOculta('/sugestoes')).toBe(true);
    expect(navegacaoOculta('/login')).toBe(true);
    expect(navegacaoOculta('/painel/forno')).toBe(true);
    expect(navegacaoOculta('/pessoas')).toBe(false);
    expect(navegacaoOculta('/pessoas/sugestoes')).toBe(false);
  });
});

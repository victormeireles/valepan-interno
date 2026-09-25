import { describe, expect, it } from 'vitest';
import { NomeCapitalizador } from './nome-capitalizador';

describe('NomeCapitalizador', () => {
  it('capitaliza nome com preposição minúscula', () => {
    expect(new NomeCapitalizador().formatar('maria da silva')).toBe('Maria da Silva');
  });

  it('mantém siglas RH em maiúsculas', () => {
    expect(new NomeCapitalizador().formatar('analista de rh')).toBe('Analista de RH');
  });
});

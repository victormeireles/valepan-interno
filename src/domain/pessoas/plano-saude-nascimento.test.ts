import { describe, expect, it } from 'vitest';
import { MENSAGEM_PLANO_SEM_NASCIMENTO, PlanoSaudeNascimento } from './plano-saude-nascimento';

describe('PlanoSaudeNascimento', () => {
  const regra = new PlanoSaudeNascimento();

  it('grava o plano desligado sem data de nascimento', () => {
    expect(() => regra.conferir(false, null)).not.toThrow();
    expect(() => regra.conferir(false, '')).not.toThrow();
  });

  it('recusa o plano ligado quando a data de nascimento está vazia', () => {
    expect(() => regra.conferir(true, null)).toThrow(MENSAGEM_PLANO_SEM_NASCIMENTO);
    expect(() => regra.conferir(true, '')).toThrow(MENSAGEM_PLANO_SEM_NASCIMENTO);
    expect(() => regra.conferir(true, '04/11/1990')).toThrow(MENSAGEM_PLANO_SEM_NASCIMENTO);
  });

  it('aceita o plano ligado quando a data já está no cadastro', () => {
    expect(() => regra.conferir(true, '1990-04-11')).not.toThrow();
    expect(() => regra.conferir(true, '1990-04-11T00:00:00')).not.toThrow();
  });
});

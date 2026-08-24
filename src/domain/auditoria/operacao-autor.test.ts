import { describe, expect, it } from 'vitest';
import {
  mapOperacaoAutor,
  primeiroNomeAutor,
  SELECT_COM_AUTOR,
} from './operacao-autor';

describe('mapOperacaoAutor', () => {
  it('extrai nome do embed objeto', () => {
    expect(mapOperacaoAutor('u1', { nome: 'Maria Silva' })).toEqual({
      criadoPor: 'u1',
      criadoPorNome: 'Maria Silva',
    });
  });

  it('extrai nome do embed array', () => {
    expect(mapOperacaoAutor('u1', [{ nome: 'João' }]).criadoPorNome).toBe('João');
  });

  it('fica nulo sem autor (histórico)', () => {
    expect(mapOperacaoAutor(null, null)).toEqual({
      criadoPor: null,
      criadoPorNome: null,
    });
  });
});

describe('primeiroNomeAutor', () => {
  it('devolve o primeiro nome', () => {
    expect(primeiroNomeAutor('Maria Silva Santos')).toBe('Maria');
  });

  it('devolve nulo quando vazio', () => {
    expect(primeiroNomeAutor('  ')).toBeNull();
    expect(primeiroNomeAutor(null)).toBeNull();
  });
});

describe('selectComAutor', () => {
  it('inclui o embed de usuarios', () => {
    expect(SELECT_COM_AUTOR).toContain('usuarios!criado_por');
  });
});

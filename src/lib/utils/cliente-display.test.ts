import { describe, expect, it } from 'vitest';
import { getClienteInicial } from './cliente-display';

describe('getClienteInicial', () => {
  it('retorna a primeira letra maiúscula', () => {
    expect(getClienteInicial('Damiao')).toBe('D');
  });

  it('ignora espaços nas bordas', () => {
    expect(getClienteInicial('  HB  ')).toBe('H');
  });

  it('retorna ? para nome vazio', () => {
    expect(getClienteInicial('')).toBe('?');
    expect(getClienteInicial('   ')).toBe('?');
  });
});

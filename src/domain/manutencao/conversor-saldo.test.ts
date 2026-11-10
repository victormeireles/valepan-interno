import { describe, expect, it } from 'vitest';
import { ConversorSaldo } from './conversor-saldo';
import { QuantidadeEstoque } from './quantidade-estoque';

describe('ConversorSaldo', () => {
  const saldo = new ConversorSaldo();

  it('lê string com 3 casas e devolve o mesmo texto numérico', () => {
    expect(saldo.emMilesimos('1.500')).toBe(1500);
    expect(saldo.numerico(1500)).toBe('1.500');
  });

  it('lê número e grava com 3 casas', () => {
    expect(saldo.emMilesimos(1.5)).toBe(1500);
    expect(saldo.numerico(saldo.emMilesimos(1.5))).toBe('1.500');
  });

  it('aceita saldo negativo, que não é quantidade de movimento', () => {
    expect(new QuantidadeEstoque().emMilesimos('-1,500')).toBeNull();
    expect(saldo.emMilesimos('-1.500')).toBe(-1500);
    expect(saldo.emMilesimos(-1.5)).toBe(-1500);
    expect(saldo.numerico(-1500)).toBe('-1.500');
  });
});

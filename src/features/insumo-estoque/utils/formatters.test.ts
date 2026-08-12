import { describe, expect, it } from 'vitest';
import {
  formatCoberturaDias,
  formatInsumoQuantidadeArredondada,
} from './formatters';

describe('formatInsumoQuantidadeArredondada', () => {
  it('arredonda a quantidade e preserva a unidade', () => {
    expect(formatInsumoQuantidadeArredondada(5286.79, 'kg')).toBe('5.287 kg');
    expect(formatInsumoQuantidadeArredondada(4.26, 'kg')).toBe('4,3 kg');
    expect(formatInsumoQuantidadeArredondada(0.047219, 'kg')).toBe('0,0 kg');
    expect(formatInsumoQuantidadeArredondada(0, 'kg')).toBe('-');
  });
});

describe('formatCoberturaDias', () => {
  it('formata a quantidade de dias e representa valor ausente', () => {
    expect(formatCoberturaDias(12)).toBe('12 d');
    expect(formatCoberturaDias(null)).toBe('—');
  });

  it('arredonda dias para inteiro', () => {
    expect(formatCoberturaDias(12.4)).toBe('12 d');
    expect(formatCoberturaDias(12.6)).toBe('13 d');
    expect(formatCoberturaDias(0.4)).toBe('0 d');
  });

  it('compacta coberturas acima de 360 dias', () => {
    expect(formatCoberturaDias(360)).toBe('360 d');
    expect(formatCoberturaDias(361)).toBe('>360 d');
    expect(formatCoberturaDias(900)).toBe('>360 d');
  });
});

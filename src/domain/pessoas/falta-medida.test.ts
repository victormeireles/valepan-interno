import { describe, expect, it } from 'vitest';
import { parseMedidaFalta } from './falta-medida';

describe('parseMedidaFalta', () => {
  it('aceita vazio como nenhuma', () => {
    expect(parseMedidaFalta('')).toBeNull();
    expect(parseMedidaFalta(null)).toBeNull();
  });

  it('aceita valores válidos', () => {
    expect(parseMedidaFalta('advertencia')).toBe('advertencia');
    expect(parseMedidaFalta('suspensao')).toBe('suspensao');
    expect(parseMedidaFalta('justa_causa')).toBe('justa_causa');
  });

  it('rejeita inválido', () => {
    expect(() => parseMedidaFalta('demitido')).toThrow('Medida inválida.');
  });
});

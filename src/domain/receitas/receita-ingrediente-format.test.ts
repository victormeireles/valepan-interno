import { describe, expect, it } from 'vitest';
import { calcularCustoTotal } from '@/components/Receitas/receita-ingrediente-format';

describe('calcularCustoTotal', () => {
  it('custo null → null', () => {
    expect(calcularCustoTotal(2, null)).toBeNull();
    expect(calcularCustoTotal(2, undefined)).toBeNull();
  });

  it('custo 0 com quantidade > 0 → 0', () => {
    expect(calcularCustoTotal(3, 0)).toBe(0);
  });

  it('custo > 0 multiplica pela quantidade', () => {
    expect(calcularCustoTotal(2, 5)).toBe(10);
    expect(calcularCustoTotal(1.5, 4)).toBe(6);
  });

  it('quantidade <= 0 → null', () => {
    expect(calcularCustoTotal(0, 5)).toBeNull();
    expect(calcularCustoTotal(-1, 5)).toBeNull();
  });
});

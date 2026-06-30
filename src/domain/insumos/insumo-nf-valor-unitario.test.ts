import { describe, expect, it } from 'vitest';
import {
  agregarValorUnitarioNfDePendencias,
  calcularValorUnitarioNf,
} from '@/domain/insumos/insumo-nf-valor-unitario';

describe('calcularValorUnitarioNf', () => {
  it('divide valor total pela quantidade', () => {
    expect(calcularValorUnitarioNf(100, 4)).toBe(25);
  });

  it('retorna null quando quantidade é zero', () => {
    expect(calcularValorUnitarioNf(100, 0)).toBeNull();
  });
});

describe('agregarValorUnitarioNfDePendencias', () => {
  it('agrega múltiplas pendências do mesmo produto', () => {
    const resultado = agregarValorUnitarioNfDePendencias([
      { quantidade_nf: 10, valor_total_item: 50, unidade_nf: 'UN' },
      { quantidade_nf: 5, valor_total_item: 30, unidade_nf: 'UN' },
    ]);

    expect(resultado.valorUnitarioNf).toBeCloseTo(80 / 15);
    expect(resultado.unidadeNf).toBe('UN');
  });
});

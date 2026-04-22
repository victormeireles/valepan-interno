import { describe, expect, it } from 'vitest';
import { PlanningQuantityInputConverter } from './planning-quantity-input';
import type { ProductConversionInfo } from './production-conversions';

const produtoCaixa: ProductConversionInfo = {
  unidadeNomeResumido: 'cx',
  box_units: 10,
  package_units: null,
  unidades_assadeira: null,
  receita_massa: null,
};

describe('PlanningQuantityInputConverter', () => {
  it('rejeita valor não positivo', () => {
    const r = PlanningQuantityInputConverter.computeQtdPlanejada('caixa', 0, produtoCaixa);
    expect(r.ok).toBe(false);
  });

  it('caixa: converte para qtd planejada coerente com box_units', () => {
    const r = PlanningQuantityInputConverter.computeQtdPlanejada('caixa', 3, produtoCaixa);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.qtdPlanejada).toBe(3);
    }
  });

  it('unidades: mantém valor como consumo direto', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: null,
      package_units: null,
      unidades_assadeira: null,
      receita_massa: null,
    };
    const r = PlanningQuantityInputConverter.computeQtdPlanejada('unidades', 100, p);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.qtdPlanejada).toBe(100);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { calcularConsumoMultiReceitas } from './insumo-consumo-producao-multi-calculator';

describe('calcularConsumoMultiReceitas', () => {
  it('soma consumo de brilho e confeito por unidades produzidas', () => {
    const result = calcularConsumoMultiReceitas({
      unidadesProduzidas: 300,
      receitas: [
        {
          tipo: 'brilho',
          quantidadePorProduto: 100,
          ingredientes: [{ insumoId: 'ovo', quantidadePadrao: 2 }],
        },
        {
          tipo: 'confeito',
          quantidadePorProduto: 150,
          ingredientes: [{ insumoId: 'acucar', quantidadePadrao: 3 }],
        },
      ],
    });

    expect(result.consumos).toEqual([
      { insumoId: 'ovo', quantidade: 6 },
      { insumoId: 'acucar', quantidade: 6 },
    ]);
  });

  it('usa unidades para receita de caixa e embalagem', () => {
    const result = calcularConsumoMultiReceitas({
      unidadesProduzidas: 240,
      receitas: [
        {
          tipo: 'embalagem',
          quantidadePorProduto: 6,
          ingredientes: [{ insumoId: 'filme', quantidadePadrao: 1 }],
        },
        {
          tipo: 'caixa',
          quantidadePorProduto: 48,
          ingredientes: [{ insumoId: 'papelao', quantidadePadrao: 1 }],
        },
      ],
    });

    const filme = result.consumos.find((c) => c.insumoId === 'filme');
    const papelao = result.consumos.find((c) => c.insumoId === 'papelao');
    expect(filme?.quantidade).toBe(40);
    expect(papelao?.quantidade).toBe(5);
  });

  it('ignora receitas quando unidades produzidas é zero', () => {
    const result = calcularConsumoMultiReceitas({
      unidadesProduzidas: 0,
      receitas: [
        {
          tipo: 'antimofo',
          quantidadePorProduto: 60,
          ingredientes: [{ insumoId: 'antimofo-insumo', quantidadePadrao: 1 }],
        },
        {
          tipo: 'caixa',
          quantidadePorProduto: 48,
          ingredientes: [{ insumoId: 'papelao', quantidadePadrao: 1 }],
        },
      ],
    });

    expect(result.consumos).toEqual([]);
    expect(result.avisos.length).toBe(2);
  });
});

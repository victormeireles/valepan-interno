import { describe, expect, it } from 'vitest';
import { calcularConsumoInsumosProducao } from './insumo-consumo-producao-calculator';

const contextoBase = {
  produtoNome: 'HB 65g',
  quantidadePorProduto: 100,
  unidadesPorAssadeira: 30,
  ingredientes: [
    { insumoId: 'farinha-id', quantidadePadrao: 10 },
    { insumoId: 'agua-id', quantidadePadrao: 5 },
  ],
};

describe('calcularConsumoInsumosProducao', () => {
  it('calcula proporcional por assadeiras sem arredondar receita', () => {
    const result = calcularConsumoInsumosProducao({
      lote: { assadeiras: 1, unidades: 0 },
      modo: 'assadeiras',
      contexto: contextoBase,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.consumos).toEqual([
      { insumoId: 'farinha-id', quantidade: 3 },
      { insumoId: 'agua-id', quantidade: 1.5 },
    ]);
  });

  it('calcula por unidades diretas', () => {
    const result = calcularConsumoInsumosProducao({
      lote: { assadeiras: 0, unidades: 50 },
      modo: 'unidades',
      contexto: { ...contextoBase, unidadesPorAssadeira: null },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.consumos[0]?.quantidade).toBe(5);
  });

  it('falha sem quantidade_por_produto', () => {
    const result = calcularConsumoInsumosProducao({
      lote: { assadeiras: 1, unidades: 0 },
      modo: 'assadeiras',
      contexto: { ...contextoBase, quantidadePorProduto: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it('falha em modo assadeiras sem unidades por assadeira', () => {
    const result = calcularConsumoInsumosProducao({
      lote: { assadeiras: 2, unidades: 0 },
      modo: 'assadeiras',
      contexto: { ...contextoBase, unidadesPorAssadeira: null },
    });
    expect(result.ok).toBe(false);
  });
});

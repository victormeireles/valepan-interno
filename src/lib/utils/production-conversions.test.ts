import { describe, expect, it } from 'vitest';
import {
  getMetaCaixasSaidaEmbalagem,
  getQuantityByStation,
  quantidadeEstoqueParaUnidadesConsumo,
  quantidadePlanejadaParaUnidadesConsumo,
  unidadesConsumoParaQuantidadePlanejada,
  type ProductConversionInfo,
} from './production-conversions';

const produtoCaixa: ProductConversionInfo = {
  unidadeNomeResumido: 'cx',
  box_units: 12,
  package_units: null,
  unidades_assadeira: null,
  receita_massa: null,
};

describe('quantidadePlanejadaParaUnidadesConsumo / unidadesConsumoParaQuantidadePlanejada', () => {
  it('caixa: ida e volta preserva quantidade planejada', () => {
    const qtd = 4;
    const consumo = quantidadePlanejadaParaUnidadesConsumo(qtd, produtoCaixa);
    expect(consumo).toBe(48);
    expect(unidadesConsumoParaQuantidadePlanejada(consumo, produtoCaixa)).toBe(qtd);
  });
});

describe('quantidadeEstoqueParaUnidadesConsumo', () => {
  it('alinha caixas da planilha com box_units do produto', () => {
    const q = { caixas: 2, pacotes: 0, unidades: 0, kg: 0 };
    expect(quantidadeEstoqueParaUnidadesConsumo(q, produtoCaixa)).toBe(24);
  });

  it('soma unidades soltas e kg quando a unidade do produto é kg', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'kg',
      box_units: null,
      package_units: null,
      unidades_assadeira: null,
      receita_massa: null,
    };
    const q = { caixas: 0, pacotes: 0, unidades: 3, kg: 1.5 };
    expect(quantidadeEstoqueParaUnidadesConsumo(q, p)).toBe(4.5);
  });
});

describe('getQuantityByStation', () => {
  it('massa retorna readable com receitas quando configurado', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'LT',
      box_units: null,
      package_units: null,
      unidades_assadeira: 20,
      receita_massa: { quantidade_por_produto: 400 },
    };
    const q = getQuantityByStation('massa', 800, p);
    expect(q.value).toBeGreaterThan(0);
    expect(q.readable).toBeTruthy();
  });

  it('planejamento: latas (LT) exibidas como inteiras, arredondamento para cima', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: null,
      package_units: null,
      unidades_assadeira: 24,
      receita_massa: null,
    };
    // 617 un → 617/24 ≈ 25,708 LT → 26 (sem receita: só toAssadeiras)
    const q = getQuantityByStation('planejamento', 617, p);
    expect(q.assadeiras?.value).toBe(26);
    expect(q.assadeiras?.readable).toMatch(/^26 LT/);
  });
});

describe('getMetaCaixasSaidaEmbalagem', () => {
  it('produto em cx: meta igual ao planejado', () => {
    const m = getMetaCaixasSaidaEmbalagem(12, produtoCaixa);
    expect(m.caixasEsperadas).toBe(12);
    expect(m.resumo).toContain('12');
    expect(m.resumo).toContain('cx');
  });

  it('produto em un com box_units: converte para cx', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: 12,
      package_units: null,
      unidades_assadeira: null,
      receita_massa: null,
    };
    const m = getMetaCaixasSaidaEmbalagem(120, p);
    expect(m.caixasEsperadas).toBe(10);
    expect(m.resumo).toContain('10');
  });
});

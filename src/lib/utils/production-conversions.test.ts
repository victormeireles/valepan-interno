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
  it('alinha caixas de estoque com box_units do produto', () => {
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

  it('massa: latas (LT) exibidas como inteiras, arredondamento para cima', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: null,
      package_units: null,
      unidades_assadeira: 24,
      receita_massa: { quantidade_por_produto: 100 },
    };
    // 600 un → 600/100 = 6 receitas → 6*100/24 = 25 LT
    const q = getQuantityByStation('massa', 600, p);
    expect(q.assadeiras?.value).toBe(25);
    expect(q.assadeiras?.readable).toMatch(/^25 LT/);
  });

  it('massa: unidadesConsumoPlanejadas ignora conversão cx×box_units', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'cx',
      box_units: 48,
      unidades_assadeira: 20,
      receita_massa: { quantidade_por_produto: 100 },
    };
    const semOverride = getQuantityByStation('massa', 200, p);
    expect(semOverride.unidades?.value).toBe(9600);
    const comOverride = getQuantityByStation('massa', 200, p, 4000);
    expect(comOverride.unidades?.value).toBe(4000);
  });

  it('massa: OP em latas (200×20 un) exibe 200 LT, não conversão por receita/un. legado', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: null,
      package_units: null,
      // Cadastro legado divergente dos buracos da lata na OP
      unidades_assadeira: 18.26,
      receita_massa: { quantidade_por_produto: 4380 },
    };
    const q = getQuantityByStation('massa', 200, p, 4000);
    expect(q.assadeiras?.value).toBe(200);
    expect(q.assadeiras?.readable).toMatch(/^200 LT/);
    expect(q.assadeiras?.unidadesPorAssadeira).toBe(20);
  });

  it('fermentacao: unidadesConsumoPlanejadas ÷ buracos da lata = LT da OP (não unidades brutas)', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'cx',
      box_units: 48,
      unidades_assadeira: 20,
      receita_massa: { quantidade_por_produto: 100 },
    };
    const q = getQuantityByStation('fermentacao', 200, p, 4000);
    expect(q.value).toBe(200);
    expect(q.readable).toMatch(/^200 LT/);
    expect(q.unitLabel).toBe('LT');
  });

  it('entrada_forno: latas (LT) a partir de unidades, arredondamento para cima', () => {
    const p: ProductConversionInfo = {
      unidadeNomeResumido: 'un',
      box_units: null,
      package_units: null,
      unidades_assadeira: 24,
      receita_massa: null,
    };
    const q = getQuantityByStation('entrada_forno', 617, p);
    expect(q.value).toBe(26);
    expect(q.readable).toMatch(/^26 LT/);
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

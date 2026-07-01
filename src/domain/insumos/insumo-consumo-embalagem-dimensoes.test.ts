import { describe, expect, it } from 'vitest';
import { derivarDimensoesEmbalagem } from './insumo-consumo-embalagem-dimensoes';
import type { InsumoReceitaTipoContexto } from '@/domain/insumos/insumo-consumo-producao-types';

const receitas: InsumoReceitaTipoContexto[] = [
  { tipo: 'embalagem', quantidadePorProduto: 6, ingredientes: [] },
  { tipo: 'caixa', quantidadePorProduto: 10, ingredientes: [] },
];

const zero = { caixas: 0, pacotes: 0, unidades: 0, kg: 0 };

describe('derivarDimensoesEmbalagem', () => {
  it('deriva pacotes e unidades a partir de caixas', () => {
    const r = derivarDimensoesEmbalagem({ ...zero, caixas: 2 }, receitas);
    expect(r.pacotes).toBe(20);
    expect(r.unidades).toBe(120);
    expect(r.avisos).toEqual([]);
  });

  it('deriva unidades a partir de pacotes', () => {
    const r = derivarDimensoesEmbalagem({ ...zero, pacotes: 5 }, receitas);
    expect(r.pacotes).toBe(5);
    expect(r.unidades).toBe(30);
  });

  it('deriva pacotes a partir de unidades', () => {
    const r = derivarDimensoesEmbalagem({ ...zero, unidades: 60 }, receitas);
    expect(r.unidades).toBe(60);
    expect(r.pacotes).toBe(10);
  });

  it('avisa quando lote em kg', () => {
    const r = derivarDimensoesEmbalagem({ ...zero, kg: 12 }, receitas);
    expect(r.unidades).toBeNull();
    expect(r.pacotes).toBeNull();
    expect(r.avisos.length).toBeGreaterThan(0);
  });

  it('avisa quando caixas sem receita de caixa', () => {
    const r = derivarDimensoesEmbalagem({ ...zero, caixas: 3 }, [
      { tipo: 'embalagem', quantidadePorProduto: 6, ingredientes: [] },
    ]);
    expect(r.pacotes).toBeNull();
    expect(r.avisos.length).toBeGreaterThan(0);
  });
});

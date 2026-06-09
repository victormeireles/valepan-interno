import { describe, expect, it } from 'vitest';
import {
  buildEmbalagemDisplayEntries,
  derivarUnidadeEmbalagem,
  resolverCamposRealizadoEmbalagem,
} from '@/domain/embalagem/painel-quantidade';

describe('resolverCamposRealizadoEmbalagem', () => {
  it('meta com caixas libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 225, pacotes: 0, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta só com pacotes libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 30, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta cx + pct libera caixas e pacotes', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 10, pacotes: 5, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: false, kg: false });
  });

  it('meta com unidades libera só unidades', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 500, kg: 0 }),
    ).toEqual({ caixas: false, pacotes: false, unidades: true, kg: false });
  });

  it('meta com kg libera só kg', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 0, kg: 12 }),
    ).toEqual({ caixas: false, pacotes: false, unidades: false, kg: true });
  });

  it('meta zerada usa fallback (todos visíveis)', () => {
    expect(
      resolverCamposRealizadoEmbalagem({ caixas: 0, pacotes: 0, unidades: 0, kg: 0 }),
    ).toEqual({ caixas: true, pacotes: true, unidades: true, kg: true });
  });
});

describe('derivarUnidadeEmbalagem', () => {
  it('prioriza caixas e ignora unidades/kg', () => {
    expect(
      derivarUnidadeEmbalagem({ caixas: 10, pacotes: 5, unidades: 100, kg: 3 }),
    ).toEqual({ unidade: 'cx', valor: 10 });
  });

  it('usa pacotes quando não há caixas', () => {
    expect(
      derivarUnidadeEmbalagem({ caixas: 0, pacotes: 30, unidades: 0, kg: 0 }),
    ).toEqual({ unidade: 'pct', valor: 30 });
  });

  it('retorna zero quando só há unidades ou kg', () => {
    expect(
      derivarUnidadeEmbalagem({ caixas: 0, pacotes: 0, unidades: 500, kg: 12 }),
    ).toEqual({ unidade: 'cx', valor: 0 });
  });
});

describe('buildEmbalagemDisplayEntries', () => {
  it('inclui apenas caixas e pacotes', () => {
    expect(
      buildEmbalagemDisplayEntries({ caixas: 10, pacotes: 5, unidades: 100, kg: 3 }),
    ).toEqual([
      { quantidade: 10, unidade: 'cx' },
      { quantidade: 5, unidade: 'pct' },
    ]);
  });
});

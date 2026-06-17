import { describe, expect, it } from 'vitest';
import {
  buildEmbalagemCardDisplayEntries,
  buildEmbalagemDisplayEntries,
  derivarUnidadeEmbalagem,
  pedidoUsaCaixasOuPacotes,
  resolverCamposRealizadoEmbalagem,
  resolverExibicaoCardEmbalagem,
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

describe('pedidoUsaCaixasOuPacotes', () => {
  it('retorna true quando há caixas ou pacotes', () => {
    expect(pedidoUsaCaixasOuPacotes({ caixas: 10, pacotes: 0, unidades: 0, kg: 0 })).toBe(true);
    expect(pedidoUsaCaixasOuPacotes({ caixas: 0, pacotes: 5, unidades: 0, kg: 0 })).toBe(true);
  });

  it('retorna false para pedidos só em unidades ou kg', () => {
    expect(pedidoUsaCaixasOuPacotes({ caixas: 0, pacotes: 0, unidades: 500, kg: 0 })).toBe(false);
    expect(pedidoUsaCaixasOuPacotes({ caixas: 0, pacotes: 0, unidades: 0, kg: 12 })).toBe(false);
  });
});

describe('buildEmbalagemCardDisplayEntries', () => {
  it('usa unidades quando unidade principal é un', () => {
    expect(
      buildEmbalagemCardDisplayEntries(
        { caixas: 0, pacotes: 0, unidades: 500, kg: 0 },
        'un',
      ),
    ).toEqual([{ quantidade: 500, unidade: 'un' }]);
  });
});

describe('resolverExibicaoCardEmbalagem', () => {
  it('exibe unidades para pedidos sem conversão em caixas', () => {
    expect(
      resolverExibicaoCardEmbalagem({
        pedido: { caixas: 0, pacotes: 0, unidades: 1000, kg: 0 },
        produzido: { caixas: 0, pacotes: 0, unidades: 250, kg: 0 },
        unidadePrincipal: 'un',
        produzidoScalar: 250,
        aProduzir: 1000,
      }),
    ).toEqual({
      unidade: 'un',
      produzido: 250,
      meta: 1000,
      detalhesProduzido: [{ quantidade: 250, unidade: 'un' }],
      detalhesMeta: [{ quantidade: 1000, unidade: 'un' }],
    });
  });

  it('mantém cx/pct para pedidos com caixas', () => {
    expect(
      resolverExibicaoCardEmbalagem({
        pedido: { caixas: 100, pacotes: 0, unidades: 0, kg: 0 },
        produzido: { caixas: 50, pacotes: 0, unidades: 0, kg: 0 },
        unidadePrincipal: 'cx',
        produzidoScalar: 50,
        aProduzir: 100,
      }).unidade,
    ).toBe('cx');
  });
});

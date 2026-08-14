import { describe, expect, it } from 'vitest';
import { InsumoConsumoProdutividadeFator } from './insumo-consumo-produtividade-change';
import { InsumoConsumoProdutividadeEtapaMapper } from './insumo-consumo-produtividade-etapa-mapper';

describe('InsumoConsumoProdutividadeFator', () => {
  it('calcula fator como quantidadeAntes / quantidadeDepois', () => {
    expect(InsumoConsumoProdutividadeFator.calcular(12500, 25000)).toBe(0.5);
    expect(InsumoConsumoProdutividadeFator.calcular(100, 100)).toBe(1);
  });

  it('retorna null para valores inválidos', () => {
    expect(InsumoConsumoProdutividadeFator.calcular(0, 10)).toBeNull();
    expect(InsumoConsumoProdutividadeFator.calcular(10, 0)).toBeNull();
  });
});

describe('InsumoConsumoProdutividadeFator.deveBackfill', () => {
  const base = {
    produtoId: 'p1',
    produtoNome: 'HB Brioche 65g',
    tipo: 'embalagem' as const,
    receitaId: 'r-nova',
    quantidadeAntes: 4,
    quantidadeDepois: 4,
  };

  it('retorna true quando quantidade muda', () => {
    expect(
      InsumoConsumoProdutividadeFator.deveBackfill({
        ...base,
        quantidadeAntes: 4,
        quantidadeDepois: 6,
      }),
    ).toBe(true);
  });

  it('retorna true quando receita muda com qpp igual', () => {
    expect(
      InsumoConsumoProdutividadeFator.deveBackfill({
        ...base,
        receitaAntesId: 'r-antiga',
      }),
    ).toBe(true);
  });

  it('retorna true com forcarReconciliar', () => {
    expect(
      InsumoConsumoProdutividadeFator.deveBackfill({
        ...base,
        forcarReconciliar: true,
      }),
    ).toBe(true);
  });

  it('retorna false sem mudança nem forçar', () => {
    expect(InsumoConsumoProdutividadeFator.deveBackfill(base)).toBe(false);
  });
});

describe('InsumoConsumoProdutividadeEtapaMapper', () => {
  it('mapeia antimofo para embalagem com fator seguro', () => {
    expect(InsumoConsumoProdutividadeEtapaMapper.fromTipo('antimofo')).toEqual({
      coluna: 'embalagem_lote_id',
      origem: 'producao_embalagem',
      usaFatorSeguro: true,
    });
  });

  it('mapeia embalagem/caixa sem fator seguro', () => {
    expect(InsumoConsumoProdutividadeEtapaMapper.fromTipo('embalagem')?.usaFatorSeguro).toBe(
      false,
    );
    expect(InsumoConsumoProdutividadeEtapaMapper.fromTipo('caixa')?.usaFatorSeguro).toBe(false);
  });
});

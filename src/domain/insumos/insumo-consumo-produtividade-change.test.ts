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

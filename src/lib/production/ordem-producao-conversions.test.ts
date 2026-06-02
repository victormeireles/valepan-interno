import { describe, expect, it } from 'vitest';
import {
  estimateCaixasFromLatas,
  estimateLatasFromCaixas,
  planejadoUnidadesConsumoFromOp,
  unidadesPorLataResolvidaParaOp,
} from './ordem-producao-conversions';
import type { ProductConversionInfo } from '@/lib/utils/production-conversions';

const produtoCaixa48: ProductConversionInfo = {
  unidadeNomeResumido: 'cx',
  box_units: 48,
};

describe('planejadoUnidadesConsumoFromOp', () => {
  it('OP com lata: 200 latas × 20 buracos = 4000 un (não 200×box_units)', () => {
    const un = planejadoUnidadesConsumoFromOp(
      {
        qtd_planejada: 200,
        assadeira_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        numeroBuracosAssadeira: 20,
      },
      produtoCaixa48,
    );
    expect(un).toBe(4000);
    expect(un).not.toBe(9600);
  });

  it('OP sem assadeira_id: usa conversão cx × box_units', () => {
    expect(planejadoUnidadesConsumoFromOp({ qtd_planejada: 200 }, produtoCaixa48)).toBe(9600);
  });

  it('unidadesPorLataResolvidaParaOp usa buracos quando OP tem assadeira_id', () => {
    expect(
      unidadesPorLataResolvidaParaOp(
        {
          qtd_planejada: 200,
          assadeira_id: 'x',
          numeroBuracosAssadeira: 20,
          unidadesPorAssadeiraCadastro: 48,
        },
        produtoCaixa48,
      ),
    ).toBe(20);
  });

  it('prioriza buracos sobre cadastro produto×assadeira', () => {
    const un = planejadoUnidadesConsumoFromOp(
      {
        qtd_planejada: 10,
        assadeira_id: 'x',
        numeroBuracosAssadeira: 20,
        unidadesPorAssadeiraCadastro: 48,
      },
      produtoCaixa48,
    );
    expect(un).toBe(200);
  });
});

describe('estimateLatasFromCaixas', () => {
  it('inverte caixas → latas (20 buracos, 48 un/caixa)', () => {
    // 84 caixas × 48 un = 4032 un; ÷ 20 buracos = 201,6 → arredonda para cima.
    expect(
      estimateLatasFromCaixas({
        caixas: 84,
        numeroBuracosAssadeira: 20,
        unidadesPorCaixa: 48,
      }),
    ).toBe(202);
  });

  it('200 latas → 84 caixas (cenário brioche)', () => {
    expect(
      estimateCaixasFromLatas({
        latas: 200,
        numeroBuracosAssadeira: 20,
        unidadesPorCaixa: 48,
      }),
    ).toBe(84);
  });

  it('usa boxUnits quando não há unidadesPorCaixa', () => {
    expect(
      estimateLatasFromCaixas({ caixas: 10, numeroBuracosAssadeira: 20, boxUnits: 40 }),
    ).toBe(20);
  });

  it('sem caixa configurada trata caixas como unidades totais', () => {
    expect(estimateLatasFromCaixas({ caixas: 100, numeroBuracosAssadeira: 20 })).toBe(5);
  });

  it('caixas 0 → 0 latas', () => {
    expect(estimateLatasFromCaixas({ caixas: 0, numeroBuracosAssadeira: 20, unidadesPorCaixa: 48 })).toBe(0);
  });
});

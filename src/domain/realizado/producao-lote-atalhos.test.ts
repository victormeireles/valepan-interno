import { describe, expect, it } from 'vitest';
import {
  aplicarAtalhoLotePadrao,
  aplicarAtalhoLoteValor,
  calcularSaldoLoteRestante,
  deveExibirAtalhoSaldoRestante,
  formatarRotuloAtalhoLote,
  LOTE_PADRAO_CAIXAS_EMBALAGEM,
  LOTE_PADRAO_LATAS_ETAPA,
} from './producao-lote-atalhos';
import type { ProducaoData } from '@/domain/types';

const base: ProducaoData = {
  caixas: 3,
  pacotes: 4,
  unidades: 5,
  kg: 6,
  obsEmbalagem: 'observacao atual',
};

describe('calcularSaldoLoteRestante', () => {
  it('retorna meta menos realizado', () => {
    expect(calcularSaldoLoteRestante(47, 38)).toBe(9);
  });

  it('nao retorna valor negativo', () => {
    expect(calcularSaldoLoteRestante(38, 47)).toBe(0);
  });
});

describe('deveExibirAtalhoSaldoRestante', () => {
  it('exibe quando saldo e menor que o lote padrao', () => {
    expect(deveExibirAtalhoSaldoRestante(9, LOTE_PADRAO_LATAS_ETAPA)).toBe(true);
    expect(deveExibirAtalhoSaldoRestante(32, LOTE_PADRAO_CAIXAS_EMBALAGEM)).toBe(true);
  });

  it('nao exibe quando saldo e zero ou maior/igual ao padrao', () => {
    expect(deveExibirAtalhoSaldoRestante(0, LOTE_PADRAO_LATAS_ETAPA)).toBe(false);
    expect(deveExibirAtalhoSaldoRestante(20, LOTE_PADRAO_LATAS_ETAPA)).toBe(false);
    expect(deveExibirAtalhoSaldoRestante(50, LOTE_PADRAO_CAIXAS_EMBALAGEM)).toBe(false);
  });
});

describe('formatarRotuloAtalhoLote', () => {
  it('formata rotulos curtos por unidade', () => {
    expect(formatarRotuloAtalhoLote(20, 'LT')).toBe('20 LT');
    expect(formatarRotuloAtalhoLote(9, 'LT')).toBe('9 LT');
    expect(formatarRotuloAtalhoLote(50, 'cx')).toBe('50 cx');
  });
});

describe('aplicarAtalhoLotePadrao', () => {
  it('preenche 20 latas para fermentacao e forno mantendo os outros campos', () => {
    expect(aplicarAtalhoLotePadrao(base, 'etapa-latas')).toEqual({
      ...base,
      caixas: LOTE_PADRAO_LATAS_ETAPA,
    });
  });

  it('preenche 50 caixas para embalagem mantendo os outros campos', () => {
    expect(aplicarAtalhoLotePadrao(base, 'embalagem-caixas')).toEqual({
      ...base,
      caixas: LOTE_PADRAO_CAIXAS_EMBALAGEM,
    });
  });
});

describe('aplicarAtalhoLoteValor', () => {
  it('preenche o campo informado com o saldo restante', () => {
    expect(aplicarAtalhoLoteValor(base, 'caixas', 9)).toEqual({
      ...base,
      caixas: 9,
    });
  });
});

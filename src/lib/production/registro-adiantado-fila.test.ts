import { describe, expect, it } from 'vitest';
import {
  PRODUCAO_FILA_SYNC_FLAG,
  isNomeCarrinhoAdiantadoPadrao,
  isRegistroAdiantadoFila,
  isRegistroAdiantadoFilaComCarrinho,
  rotuloExibicaoRegistroFila,
  temNumeroCarrinhoInformado,
} from './registro-adiantado-fila';

describe('registro-adiantado-fila', () => {
  it('detecta flag e carrinho SYNC-', () => {
    expect(isRegistroAdiantadoFila({ [PRODUCAO_FILA_SYNC_FLAG]: true })).toBe(true);
    expect(isRegistroAdiantadoFilaComCarrinho(null, 'SYNC-abc-xyz')).toBe(true);
    expect(isRegistroAdiantadoFila({ motivo: 'Sincronização pré-requisitos (massa)' })).toBe(true);
  });

  it('usa rótulo amigável em vez do número do carrinho', () => {
    const dq = { [PRODUCAO_FILA_SYNC_FLAG]: true, numero_carrinho: 'SYNC-ordem-1' };
    expect(
      rotuloExibicaoRegistroFila('fermentacao', dq, 'SYNC-ordem-1', { latas: 18 }),
    ).toBe('Fermentação adiantada · 18 LT');
    expect(rotuloExibicaoRegistroFila('fermentacao', null, '42', { latas: 10 })).toBe('Carrinho 42');
  });

  it('reconhece nome automático «Adiantado N» como não informado', () => {
    expect(isNomeCarrinhoAdiantadoPadrao('Adiantado 1')).toBe(true);
    expect(isNomeCarrinhoAdiantadoPadrao('adiantado 12')).toBe(true);
    expect(isNomeCarrinhoAdiantadoPadrao('97')).toBe(false);
    expect(temNumeroCarrinhoInformado('97')).toBe(true);
    expect(temNumeroCarrinhoInformado('Adiantado 2')).toBe(false);
    expect(temNumeroCarrinhoInformado('SYNC-x')).toBe(false);
    expect(temNumeroCarrinhoInformado('—')).toBe(false);
  });

  it('mostra o número do carrinho informado pelo operador em registos adiantados', () => {
    const dq = { [PRODUCAO_FILA_SYNC_FLAG]: true, numero_carrinho: '97', bandejas: 20 };
    expect(rotuloExibicaoRegistroFila('saida_forno', dq, '97', { bandejas: 20 })).toBe(
      'Carrinho 97 (adiantado)',
    );
  });

  it('mantém rótulo genérico quando o carrinho adiantado não foi nomeado', () => {
    const dq = { [PRODUCAO_FILA_SYNC_FLAG]: true, numero_carrinho: 'Adiantado 1', bandejas: 20 };
    expect(rotuloExibicaoRegistroFila('saida_forno', dq, 'Adiantado 1', { bandejas: 20 })).toBe(
      'Saída do forno adiantada · 20 LT',
    );
  });
});

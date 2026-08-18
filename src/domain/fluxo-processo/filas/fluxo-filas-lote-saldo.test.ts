import { describe, expect, it } from 'vitest';
import { FluxoFilasLoteSaldo } from './fluxo-filas-lote-saldo';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

const saldo = new FluxoFilasLoteSaldo();

function lote(un: number, hhmm: string): FluxoControleEventoInput {
  return {
    ordemProducaoId: 'op-1',
    produtoNome: 'HB',
    assadeiraNome: 'X',
    unidades: un,
    produzidoEm: `2026-08-12T${hhmm}:00-03:00`,
    dataOp: '2026-08-12',
  };
}

describe('FluxoFilasLoteSaldo', () => {
  it('consome o lote mais antigo primeiro', () => {
    const rest = saldo.restantes([lote(100, '06:00'), lote(100, '11:00')], 50);
    expect(rest).toEqual([
      { produzidoEm: '2026-08-12T06:00:00-03:00', volumeUn: 50 },
      { produzidoEm: '2026-08-12T11:00:00-03:00', volumeUn: 100 },
    ]);
  });

  it('esgota lotes quando o consumo cobre tudo', () => {
    expect(saldo.restantes([lote(40, '06:00')], 40)).toEqual([]);
  });

  it('esgota o lote antigo e deixa o novo intacto', () => {
    const rest = saldo.restantes([lote(50, '06:00'), lote(100, '11:00')], 50);
    expect(rest).toEqual([
      { produzidoEm: '2026-08-12T11:00:00-03:00', volumeUn: 100 },
    ]);
  });
});

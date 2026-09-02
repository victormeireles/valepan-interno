import { describe, expect, it } from 'vitest';
import { JanelaOperacionalResolver } from '@/domain/producao-turno/janela-operacional';
import { PainelEtapaTvUltimoLotePicker } from './painel-etapa-tv-ultimo-lote-picker';
import type { PainelEtapaTvLoteFonte } from './painel-etapa-tv-types';

function lote(over: Partial<PainelEtapaTvLoteFonte>): PainelEtapaTvLoteFonte {
  return {
    loteId: 'l1',
    ordemId: 'op1',
    produtoNome: 'Brioche',
    produzidoEm: '2026-09-01T12:00:00-03:00',
    quantidade: 10,
    ...over,
  };
}

describe('PainelEtapaTvUltimoLotePicker', () => {
  it('retorna null se não há lotes', () => {
    expect(PainelEtapaTvUltimoLotePicker.fromLotes([])).toBeNull();
  });

  it('fromLotesPorOp: até 3 OPs, a mais recente de cada, ordenadas pelo último lote', () => {
    const got = PainelEtapaTvUltimoLotePicker.fromLotesPorOp([
      lote({
        loteId: 'op1-old',
        ordemId: 'op1',
        produzidoEm: '2026-09-02T10:00:00-03:00',
        quantidade: 5,
      }),
      lote({
        loteId: 'op1-new',
        ordemId: 'op1',
        produtoNome: 'Brioche 65g',
        produzidoEm: '2026-09-02T14:00:00-03:00',
        quantidade: 12,
      }),
      lote({
        loteId: 'op2',
        ordemId: 'op2',
        produtoNome: 'Hot Dog',
        produzidoEm: '2026-09-02T13:00:00-03:00',
        quantidade: 8,
      }),
      lote({
        loteId: 'op3',
        ordemId: 'op3',
        produtoNome: 'Mini',
        produzidoEm: '2026-09-02T12:00:00-03:00',
        quantidade: 30,
      }),
      lote({
        loteId: 'op4',
        ordemId: 'op4',
        produzidoEm: '2026-09-02T11:00:00-03:00',
        quantidade: 99,
      }),
    ]);
    expect(got.map((item) => item.ordemId)).toEqual(['op1', 'op2', 'op3']);
    expect(got[0]?.loteId).toBe('op1-new');
    expect(got[0]?.quantidade).toBe(12);
    expect(got[1]?.quantidade).toBe(8);
    expect(got[2]?.quantidade).toBe(30);
  });

  it('fromLotesPorOp ignora lote sem ordem e respeita a janela', () => {
    const janela = new JanelaOperacionalResolver().forDate('2026-09-02', '22:00');
    const got = PainelEtapaTvUltimoLotePicker.fromLotesPorOp(
      [
        lote({
          loteId: 'sem-op',
          ordemId: '',
          produzidoEm: '2026-09-01T23:00:00-03:00',
          quantidade: 1,
        }),
        lote({
          loteId: 'fora',
          ordemId: 'op-fora',
          produzidoEm: '2026-09-01T21:00:00-03:00',
        }),
        lote({
          loteId: 'ok',
          ordemId: 'op-ok',
          produzidoEm: '2026-09-01T22:30:00-03:00',
          quantidade: 7,
        }),
      ],
      { iniMs: janela.iniMs, fimMs: janela.fimMs },
    );
    expect(got).toHaveLength(1);
    expect(got[0]?.loteId).toBe('ok');
  });

  it('escolhe o produzidoEm mais recente', () => {
    const got = PainelEtapaTvUltimoLotePicker.fromLotes([
      lote({ loteId: 'a', produzidoEm: '2026-09-01T10:00:00-03:00' }),
      lote({ loteId: 'b', produzidoEm: '2026-09-01T14:00:00-03:00', quantidade: 48 }),
    ]);
    expect(got?.loteId).toBe('b');
    expect(got?.quantidade).toBe(48);
  });

  it('empate de timestamp: loteId descendente', () => {
    const ts = '2026-09-01T14:00:00-03:00';
    const got = PainelEtapaTvUltimoLotePicker.fromLotes([
      lote({ loteId: 'aaa', produzidoEm: ts }),
      lote({ loteId: 'zzz', produzidoEm: ts }),
    ]);
    expect(got?.loteId).toBe('zzz');
  });

  it('com janela T1 22h: lote 21h de 01/09 fica fora; 22:30 vence', () => {
    const janela = new JanelaOperacionalResolver().forDate('2026-09-02', '22:00');
    const got = PainelEtapaTvUltimoLotePicker.fromLotes(
      [
        lote({
          loteId: 'fora-21h',
          produzidoEm: '2026-09-01T21:00:00-03:00',
          quantidade: 5,
        }),
        lote({
          loteId: 'dentro',
          produzidoEm: '2026-09-01T22:30:00-03:00',
          quantidade: 12,
        }),
        lote({
          loteId: 'fora-depois',
          produzidoEm: '2026-09-02T22:30:00-03:00',
          quantidade: 99,
        }),
      ],
      { iniMs: janela.iniMs, fimMs: janela.fimMs },
    );
    expect(got?.loteId).toBe('dentro');
    expect(got?.quantidade).toBe(12);
  });
});

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

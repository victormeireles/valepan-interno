import { describe, expect, it } from 'vitest';
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
});

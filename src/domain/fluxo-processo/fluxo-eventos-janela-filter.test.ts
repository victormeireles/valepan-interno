import { describe, expect, it } from 'vitest';

import { JanelaOperacionalResolver } from '@/domain/producao-turno/janela-operacional';

import { FluxoEventosJanelaFilter } from './fluxo-eventos-janela-filter';

const resolver = new JanelaOperacionalResolver();
const filter = new FluxoEventosJanelaFilter(resolver);

describe('FluxoEventosJanelaFilter', () => {
  it('T1 04h: lote das 02h desta madrugada fica fora — não vai para o fim do eixo', () => {
    const janela = resolver.forDate('2026-09-02', '04:00');
    const kept = filter.filter(
      [
        { produzidoEm: '2026-09-02T02:00:00-03:00', id: 'antes' },
        { produzidoEm: '2026-09-02T05:00:00-03:00', id: 'dentro' },
        { produzidoEm: '2026-09-03T02:00:00-03:00', id: 'cauda' },
      ],
      janela,
    );
    expect(kept.map((e) => e.id)).toEqual(['dentro', 'cauda']);
  });

  it('T1 22h: lote 22h30 da véspera entra na janela da OP 02/09', () => {
    const janela = resolver.forDate('2026-09-02', '22:00');
    const kept = filter.filter(
      [
        { produzidoEm: '2026-09-01T21:30:00-03:00', id: 'antes-t1' },
        { produzidoEm: '2026-09-01T22:30:00-03:00', id: 'vespera' },
        { produzidoEm: '2026-09-02T10:00:00-03:00', id: 'manha' },
      ],
      janela,
    );
    expect(kept.map((e) => e.id)).toEqual(['vespera', 'manha']);
  });
});

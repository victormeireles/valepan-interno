import { describe, expect, it } from 'vitest';
import { FaltaDatasRotulo } from './falta-datas-rotulo';

describe('FaltaDatasRotulo', () => {
  const rotulo = new FaltaDatasRotulo();

  it('junta dias seguidos e separa quando há dia útil no meio', () => {
    expect(rotulo.resumir([
      '2026-11-01',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-09',
      '2026-11-10',
    ])).toBe('01/11 · 04–10/11');
  });

  it('mostra o intervalo e separa quando há dia útil no meio', () => {
    expect(rotulo.resumir(['2026-11-03'])).toBe('03/11');
    expect(rotulo.resumir(['2026-10-30', '2026-10-31', '2026-11-02'])).toBe('30/10–02/11');
    expect(rotulo.listar(['2026-11-03', '2026-11-04', '2026-11-07'])).toEqual([
      '03–04/11',
      '07/11',
    ]);
  });
});

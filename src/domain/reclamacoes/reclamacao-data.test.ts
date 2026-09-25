import { describe, expect, it } from 'vitest';
import {
  dataCombinaFiltroExato,
  formatarDataIsoPtBr,
} from './reclamacao-data';

describe('reclamacao-data', () => {
  it('filtro de data é dia exato e vazio libera', () => {
    expect(dataCombinaFiltroExato('2026-08-21', '2026-08-21')).toBe(true);
    expect(dataCombinaFiltroExato('2026-08-21T00:00:00', '2026-08-21')).toBe(true);
    expect(dataCombinaFiltroExato('2026-08-20', '2026-08-21')).toBe(false);
    expect(dataCombinaFiltroExato('2026-08-21', null)).toBe(true);
  });

  it('formata ISO sem fuso', () => {
    expect(formatarDataIsoPtBr('2026-08-12')).toBe('12/08/2026');
  });
});

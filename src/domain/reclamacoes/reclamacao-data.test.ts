import { describe, expect, it } from 'vitest';
import {
  formatarDataIsoPtBr,
  reclamacaoNoPeriodo,
} from './reclamacao-data';

describe('reclamacao-data', () => {
  it('período é inclusivo nas pontas', () => {
    expect(reclamacaoNoPeriodo('2026-08-21', '2026-08-21', '2026-08-21')).toBe(true);
    expect(reclamacaoNoPeriodo('2026-08-20', '2026-08-21', null)).toBe(false);
    expect(reclamacaoNoPeriodo('2026-08-22', null, '2026-08-21')).toBe(false);
    expect(reclamacaoNoPeriodo('2026-08-21', null, null)).toBe(true);
  });

  it('formata ISO sem fuso', () => {
    expect(formatarDataIsoPtBr('2026-08-12')).toBe('12/08/2026');
  });
});

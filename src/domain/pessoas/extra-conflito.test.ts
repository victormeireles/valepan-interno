import { describe, expect, it } from 'vitest';
import { ExtraConflito } from './extra-conflito';

describe('ExtraConflito', () => {
  const conflito = new ExtraConflito();
  const existente = { inicio: '2026-09-25T22:00', fim: '2026-09-26T06:00' };

  it('bloqueia o mesmo período e só avisa sobreposição diferente', () => {
    expect(conflito.classificar([existente], existente.inicio, existente.fim)).toBe('exato');
    expect(conflito.classificar([existente], '2026-09-26T01:00', '2026-09-26T08:00')).toBe('sobreposicao');
    expect(conflito.classificar([existente], '2026-09-26T18:00', '2026-09-27T00:00')).toBe('livre');
  });
});

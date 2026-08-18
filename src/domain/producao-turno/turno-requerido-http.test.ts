import { describe, expect, it } from 'vitest';
import { isTurnoRequeridoHttp } from './turno-requerido-http';

describe('isTurnoRequeridoHttp', () => {
  it('409 + code turno_requerido → true', () => {
    expect(isTurnoRequeridoHttp(409, { code: 'turno_requerido', error: 'x' })).toBe(
      true,
    );
  });

  it('409 genérico → false', () => {
    expect(isTurnoRequeridoHttp(409, { error: 'conflito' })).toBe(false);
  });

  it('outro status com o mesmo code → false', () => {
    expect(isTurnoRequeridoHttp(400, { code: 'turno_requerido' })).toBe(false);
  });

  it('body nulo → false', () => {
    expect(isTurnoRequeridoHttp(409, null)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { FeriasPeriodo } from './ferias-periodo';

describe('FeriasPeriodo', () => {
  const periodo = new FeriasPeriodo();
  const ferias = { inicio: '2026-12-01', volta: '2026-12-31' };

  it('define o estado pelas datas', () => {
    expect(periodo.estado(ferias, '2026-11-26')).toBe('programada');
    expect(periodo.estado(ferias, '2026-12-01')).toBe('em_gozo');
    expect(periodo.estado(ferias, '2026-12-30')).toBe('em_gozo');
    expect(periodo.estado(ferias, '2026-12-31')).toBe('encerrada');
    expect(periodo.estado({ ...ferias, canceladaEm: '2026-11-27' }, '2026-12-10')).toBe('cancelada');
  });

  it('monta o selo com a véspera da volta', () => {
    expect(periodo.selo(ferias)).toBe('Férias 01/12–30/12');
    expect(periodo.selo({ inicio: '2026-12-01', volta: '2026-12-02' })).toBe('Férias 01/12');
  });

  it('cobre só os dias fora e ignora período cancelado', () => {
    expect(periodo.cobre(ferias, '2026-12-01')).toBe(true);
    expect(periodo.cobre(ferias, '2026-12-30')).toBe(true);
    expect(periodo.cobre(ferias, '2026-12-31')).toBe(false);
    expect(periodo.cobre({ ...ferias, canceladaEm: '2026-12-02' }, '2026-12-10')).toBe(false);
  });
});

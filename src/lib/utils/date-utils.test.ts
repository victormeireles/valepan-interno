import { describe, expect, it } from 'vitest';
import {
  brazilClockMinutes,
  brazilClockUtcMs,
  brazilDayEndUtcMs,
  brazilSevenAmUtcMs,
  extractCalendarDate,
  formatISODateBr,
  normalizeToISODate,
  toClockHHmm,
} from './date-utils';

describe('extractCalendarDate', () => {
  it('extrai YYYY-MM-DD de string ISO date-only', () => {
    expect(extractCalendarDate('2026-06-11')).toBe('2026-06-11');
  });

  it('extrai data de timestamp ISO sem deslocar dia', () => {
    expect(extractCalendarDate('2026-06-11T00:00:00.000Z')).toBe('2026-06-11');
    expect(extractCalendarDate('2026-06-11T00:00:00+00:00')).toBe('2026-06-11');
  });

  it('extrai data de formato brasileiro', () => {
    expect(extractCalendarDate('11/06/2026')).toBe('2026-06-11');
  });

  it('usa componentes UTC em Date (evita 10/06 para meia-noite UTC)', () => {
    const utcMidnight = new Date('2026-06-11');
    expect(extractCalendarDate(utcMidnight)).toBe('2026-06-11');
  });
});

describe('formatISODateBr', () => {
  it('formata 2026-06-11 como 11/06/2026', () => {
    expect(formatISODateBr('2026-06-11')).toBe('11/06/2026');
  });

  it('formata timestamp ISO sem deslocar dia', () => {
    expect(formatISODateBr('2026-06-11T00:00:00.000Z')).toBe('11/06/2026');
  });
});

describe('normalizeToISODate', () => {
  it('não desloca Date criado de ISO date-only', () => {
    expect(normalizeToISODate(new Date('2026-06-11'))).toBe('2026-06-11');
  });
});

describe('toClockHHmm', () => {
  it('normaliza time do Postgres e hora curta', () => {
    expect(toClockHHmm('07:00:00')).toBe('07:00');
    expect(toClockHHmm('7:00')).toBe('07:00');
    expect(toClockHHmm('21:50')).toBe('21:50');
  });

  it('rejeita relógio inválido', () => {
    expect(toClockHHmm('24:00')).toBeNull();
    expect(toClockHHmm('07')).toBeNull();
    expect(toClockHHmm('')).toBeNull();
  });
});

describe('brazilDayEndUtcMs', () => {
  it('brazilDayEndUtcMs retorna 23:59:59.999 no fuso BR', () => {
    const ms = brazilDayEndUtcMs('2026-08-12');
    expect(new Date(ms).toISOString()).toBe('2026-08-13T02:59:59.999Z');
  });
});

describe('brazilClockMinutes', () => {
  it('retorna minutos desde meia-noite no fuso BR', () => {
    expect(brazilClockMinutes(new Date('2026-08-18T18:00:00.000Z'))).toBe(15 * 60);
  });
});

describe('brazilClockUtcMs', () => {
  it('usa offset -03:00 no relógio informado', () => {
    expect(brazilClockUtcMs('2026-08-17', '06:30')).toBe(
      new Date('2026-08-17T06:30:00-03:00').getTime(),
    );
  });

  it('mantém 07:00 no wrapper legado', () => {
    expect(brazilSevenAmUtcMs('2026-08-17')).toBe(
      brazilClockUtcMs('2026-08-17', '07:00'),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractCalendarDate,
  formatISODateBr,
  normalizeToISODate,
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

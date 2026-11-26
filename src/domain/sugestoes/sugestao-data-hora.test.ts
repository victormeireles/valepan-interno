import { describe, expect, it } from 'vitest';
import { SugestaoDataHora } from './sugestao-data-hora';

describe('SugestaoDataHora', () => {
  it('formata no fuso de São Paulo', () => {
    expect(new SugestaoDataHora().formatar('2026-11-24T13:08:00.000Z')).toBe('24/11/2026 10:08');
  });
});

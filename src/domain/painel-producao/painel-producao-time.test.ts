import { describe, expect, it } from 'vitest';
import {
  formatJanelaClockLabel,
  formatJanelaRange,
  janelaDurationMinutes,
  janelaElapsedMinutes,
  toMinutesFromClock,
} from './painel-producao-time';

describe('formatJanelaClockLabel', () => {
  it('omite minutos em hora cheia e mantém minutos no resto', () => {
    expect(formatJanelaClockLabel('07:00')).toBe('7h');
    expect(formatJanelaClockLabel('18:00')).toBe('18h');
    expect(formatJanelaClockLabel('21:50')).toBe('21h50');
  });
});

describe('formatJanelaRange', () => {
  it('reproduz o rótulo operacional atual', () => {
    expect(formatJanelaRange('07:00', '18:00')).toBe('7h → 18h');
    expect(formatJanelaRange('07:00', '21:50')).toBe('7h → 21h50');
    expect(formatJanelaRange('07:00', '05:00')).toBe('7h → 5h');
  });
});

describe('toMinutesFromClock', () => {
  it('converte HH:mm em minutos desde meia-noite', () => {
    expect(toMinutesFromClock('07:00')).toBe(420);
    expect(toMinutesFromClock('21:50')).toBe(21 * 60 + 50);
  });
});

describe('janelaDurationMinutes', () => {
  it('soma 24h quando o fim é no dia seguinte', () => {
    expect(janelaDurationMinutes('07:00', '18:00')).toBe(11 * 60);
    expect(janelaDurationMinutes('07:00', '05:00')).toBe(22 * 60);
  });
});

describe('janelaElapsedMinutes', () => {
  it('mede o progresso na madrugada da janela que atravessa meia-noite', () => {
    expect(janelaElapsedMinutes(10 * 60, '07:00', '05:00')).toBe(3 * 60);
    expect(janelaElapsedMinutes(2 * 60, '07:00', '05:00')).toBe(19 * 60);
    expect(janelaElapsedMinutes(6 * 60, '07:00', '05:00')).toBe(22 * 60);
    expect(janelaElapsedMinutes(6 * 60, '07:00', '18:00')).toBe(0);
  });
});

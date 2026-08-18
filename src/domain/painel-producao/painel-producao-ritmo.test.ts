import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import {
  buildRitmoComparisons,
  calcularRitmoMedio,
  resolveRitmoJanelaMs,
} from './painel-producao-ritmo';
import type { PainelProducaoRitmoEntry } from './painel-producao-types';

const HOJE = '2026-08-17';
const ONTEM = '2026-08-16';
const SEMANA = '2026-08-10';

function isoAt(dateISO: string, clock: string): string {
  return new Date(brazilClockUtcMs(dateISO, clock)).toISOString();
}

function entry(quantity: number, dateISO: string, clock: string): PainelProducaoRitmoEntry {
  return { quantity, timestamp: isoAt(dateISO, clock) };
}

describe('calcularRitmoMedio', () => {
  it('mede a partir do primeiro lote, não do horário de config', () => {
    const entries = [entry(80, HOJE, '06:30'), entry(80, HOJE, '08:30')];
    expect(calcularRitmoMedio(entries, brazilClockUtcMs(HOJE, '08:30'))).toBe(80);
  });

  it('inclui lote apontado antes do início de turno da config', () => {
    const entries = [entry(80, HOJE, '06:30'), entry(80, HOJE, '08:30')];
    expect(calcularRitmoMedio(entries, null)).toBe(80);
  });

  it('mantém buracos no denominador, como as barras hora a hora', () => {
    const entries = [
      entry(50, HOJE, '08:00'),
      entry(50, HOJE, '08:20'),
      entry(50, HOJE, '10:20'),
      entry(50, HOJE, '10:40'),
    ];
    // 200 CX em 2h40 → 75 CX/h (não 300 concentrando só os 40 min ativos)
    expect(calcularRitmoMedio(entries, null)).toBe(75);
  });

  it('inclui o tempo até agora, mesmo ocioso no final', () => {
    const entries = [entry(50, HOJE, '08:00'), entry(50, HOJE, '08:15')];
    expect(calcularRitmoMedio(entries, brazilClockUtcMs(HOJE, '10:00'))).toBe(50);
  });

  it('com um lote e teto de agora, mede primeiro lote → agora', () => {
    const entries = [entry(200, HOJE, '09:00')];
    expect(calcularRitmoMedio(entries, brazilClockUtcMs(HOJE, '10:00'))).toBe(200);
  });

  it('não infla a taxa quando há madrugada + pausa + pico à tarde', () => {
    const entries = [
      entry(50, HOJE, '02:24'),
      entry(50, HOJE, '03:00'),
      entry(80, HOJE, '07:00'),
      entry(127, HOJE, '13:00'),
      entry(146, HOJE, '13:40'),
    ];
    const ritmo = calcularRitmoMedio(entries, brazilClockUtcMs(HOJE, '14:15'));
    // 453 CX em 11h51 → ~38 CX/h; descontar buracos daria ~150
    expect(ritmo).toBeCloseTo(38.2, 0);
    expect(ritmo).toBeLessThan(80);
  });

  it('sem lançamentos retorna 0', () => {
    expect(calcularRitmoMedio([], brazilClockUtcMs(HOJE, '10:00'))).toBe(0);
  });
});

describe('buildRitmoComparisons', () => {
  it('calcula ontem e D-7 na própria janela, sem copiar a duração de hoje', () => {
    const hoje = [entry(100, HOJE, '08:00'), entry(100, HOJE, '10:00')];
    const ontem = [entry(50, ONTEM, '07:00'), entry(50, ONTEM, '08:00')];
    const semana = [entry(80, SEMANA, '09:00'), entry(80, SEMANA, '09:30')];

    const result = buildRitmoComparisons(
      hoje,
      ontem,
      semana,
      ONTEM,
      brazilClockUtcMs(HOJE, '10:00'),
    );

    expect(result.ritmo).toBe(100);
    expect(result.ritmoOntem).toBe(100);
    expect(result.ritmoSemana).toBe(320);
  });

  it('zera ontem quando não há data anterior', () => {
    const result = buildRitmoComparisons(
      [entry(40, HOJE, '08:00'), entry(40, HOJE, '08:20')],
      [],
      [],
      null,
      brazilClockUtcMs(HOJE, '08:20'),
    );
    expect(result.ritmo).toBe(240);
    expect(result.ritmoOntem).toBe(0);
    expect(result.ritmoSemana).toBe(0);
  });
});

describe('resolveRitmoJanelaMs', () => {
  it('usa o primeiro lote e o teto quando o teto é depois do último', () => {
    const entries = [entry(10, HOJE, '02:24'), entry(10, HOJE, '13:20')];
    const bounds = resolveRitmoJanelaMs(entries, brazilClockUtcMs(HOJE, '13:29'));
    expect(bounds?.firstMs).toBe(brazilClockUtcMs(HOJE, '02:24'));
    expect(bounds?.endMs).toBe(brazilClockUtcMs(HOJE, '13:29'));
  });

  it('fecha no último lote quando não há teto', () => {
    const entries = [entry(10, HOJE, '08:00'), entry(10, HOJE, '11:00')];
    const bounds = resolveRitmoJanelaMs(entries, null);
    expect(bounds?.endMs).toBe(brazilClockUtcMs(HOJE, '11:00'));
  });
});

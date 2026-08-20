import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';
import { ProducaoTurnoPrompt } from './producao-turno-prompt';
import type { ProducaoTurnoAtivo, ProducaoTurnoCadastrado } from './producao-turno-types';

function min(hm: string): number {
  return toMinutesFromClock(hm);
}

const turnosPadrao: ProducaoTurnoCadastrado[] = [
  { numero: 1, inicio: '07:00', fim: '14:00' },
  { numero: 2, inicio: '14:00', fim: '22:00' },
];

const prompt = new ProducaoTurnoPrompt();

describe('ProducaoTurnoPrompt.decide', () => {
  it('sem ativo às 10:00 → definir', () => {
    const nowMs = brazilClockUtcMs('2026-08-18', '10:00');
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('10:00'),
      turnos: turnosPadrao,
      ativo: null,
    });
    expect(decision.kind).toBe('definir');
    expect(decision.ativoValido).toBe(false);
    expect(decision.turnoVigente).toBe(1);
  });

  it('ativo T1 confirmado hoje às 10:00 → nenhum', () => {
    const nowMs = brazilClockUtcMs('2026-08-18', '10:00');
    const ativo: ProducaoTurnoAtivo = {
      numero: 1,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-18', '08:00')).toISOString(),
    };
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('10:00'),
      turnos: turnosPadrao,
      ativo,
    });
    expect(decision.kind).toBe('nenhum');
    expect(decision.ativoValido).toBe(true);
    expect(decision.turnoVigente).toBe(1);
    expect(decision.numeroAtivo).toBe(1);
  });

  it('ativo T1 às 15:00 → confirmar_fora com vigente 2', () => {
    const nowMs = brazilClockUtcMs('2026-08-18', '15:00');
    const ativo: ProducaoTurnoAtivo = {
      numero: 1,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-18', '08:00')).toISOString(),
    };
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('15:00'),
      turnos: turnosPadrao,
      ativo,
    });
    expect(decision.kind).toBe('confirmar_fora');
    expect(decision.ativoValido).toBe(true);
    expect(decision.turnoVigente).toBe(2);
    expect(decision.numeroAtivo).toBe(1);
  });

  it('ativo T1 às 14:10 com T2 em 14:30 → confirmar_fora sem vigente', () => {
    const turnosComVao: ProducaoTurnoCadastrado[] = [
      { numero: 1, inicio: '07:00', fim: '14:00' },
      { numero: 2, inicio: '14:30', fim: '22:00' },
    ];
    const nowMs = brazilClockUtcMs('2026-08-18', '14:10');
    const ativo: ProducaoTurnoAtivo = {
      numero: 1,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-18', '08:00')).toISOString(),
    };
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('14:10'),
      turnos: turnosComVao,
      ativo,
    });
    expect(decision.kind).toBe('confirmar_fora');
    expect(decision.turnoVigente).toBeNull();
  });

  it('ativo T2 confirmado ontem, agora 10:00 (novo dia) → definir', () => {
    const nowMs = brazilClockUtcMs('2026-08-18', '10:00');
    const ativo: ProducaoTurnoAtivo = {
      numero: 2,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-17', '15:00')).toISOString(),
    };
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('10:00'),
      turnos: turnosPadrao,
      ativo,
    });
    expect(decision.kind).toBe('definir');
    expect(decision.ativoValido).toBe(false);
  });

  it('config desligou T3 e ativo era 3 → definir', () => {
    const nowMs = brazilClockUtcMs('2026-08-18', '10:00');
    const ativo: ProducaoTurnoAtivo = {
      numero: 3,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-18', '08:00')).toISOString(),
    };
    const decision = prompt.decide({
      nowMs,
      agoraMin: min('10:00'),
      turnos: turnosPadrao,
      ativo,
    });
    expect(decision.kind).toBe('definir');
    expect(decision.ativoValido).toBe(false);
  });
});

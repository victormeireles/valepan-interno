import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { TURNO_TROCA_ERRO } from './etapa-turno-ativo-client';
import { EtapaTurnoGate, preferTurnoAtivoCarga } from './etapa-turno-gate';
import { readTurnoCarga, type ProducaoTurnoCargaAtivo } from './producao-turno-carga';
import type { ProducaoTurnoCadastrado } from './producao-turno-types';

const turnos: ProducaoTurnoCadastrado[] = [
  { numero: 1, inicio: '07:00', fim: '14:00' },
  { numero: 2, inicio: '14:00', fim: '22:00' },
];

const gate = new EtapaTurnoGate();

function nowAt(clock: string): Date {
  return new Date(brazilClockUtcMs('2026-08-18', clock));
}

function ativoHoje(numero: 1 | 2 | 3, clock = '08:00'): ProducaoTurnoCargaAtivo {
  return {
    numero,
    confirmadoEm: new Date(brazilClockUtcMs('2026-08-18', clock)).toISOString(),
    valido: true,
  };
}

describe('EtapaTurnoGate.resolveChip', () => {
  it('sem ativo → Definir turno (stone)', () => {
    expect(gate.resolveChip(null)).toEqual({
      label: 'Definir turno',
      ariaLabel: 'Definir turno',
      tone: 'stone',
    });
  });

  it('ativo inválido na carga → Definir turno (stone)', () => {
    const ativo: ProducaoTurnoCargaAtivo = {
      numero: 1,
      confirmadoEm: new Date(brazilClockUtcMs('2026-08-17', '15:00')).toISOString(),
      valido: false,
    };
    expect(gate.resolveChip(ativo)).toEqual({
      label: 'Definir turno',
      ariaLabel: 'Definir turno',
      tone: 'stone',
    });
  });

  it('ativo válido → Turno N (amber)', () => {
    expect(gate.resolveChip(ativoHoje(2))).toEqual({
      label: 'Turno 2',
      ariaLabel: 'Turno 2',
      tone: 'amber',
    });
  });
});

describe('EtapaTurnoGate.planEnsure', () => {
  it('ativo válido dentro da janela → proceed sem sheet', () => {
    const plan = gate.planEnsure({
      turnos,
      ativo: ativoHoje(1),
      now: nowAt('10:00'),
    });
    expect(plan).toEqual({ action: 'proceed' });
  });

  it('sem ativo → sheet Qual turno? e não proceed', () => {
    const plan = gate.planEnsure({
      turnos,
      ativo: null,
      now: nowAt('10:00'),
    });
    expect(plan.action).toBe('open');
    if (plan.action !== 'open') return;
    expect(plan.sheet.title).toBe('Qual turno?');
    expect(plan.sheet.actions.map((a) => a.numero)).toEqual([1, 2]);
  });

  it('não confia no valido stale: T1 válido na carga às 15:00 → confirmar_fora', () => {
    const staleValido = ativoHoje(1);
    expect(staleValido.valido).toBe(true);

    const plan = gate.planEnsure({
      turnos,
      ativo: staleValido,
      now: nowAt('15:00'),
    });

    expect(plan.action).toBe('open');
    if (plan.action !== 'open') return;
    expect(plan.sheet.title).toBe('Ainda é o 1º turno?');
    expect(plan.sheet.actions).toEqual([
      { numero: 1, label: 'Continuar no 1º', primary: false },
      { numero: 2, label: 'Trocar para o 2º', primary: true },
    ]);
  });
});

describe('EtapaTurnoGate.planChipSheet', () => {
  it('sempre lista os turnos ligados (definir), sem proceed', () => {
    const sheet = gate.planChipSheet(turnos);
    expect(sheet.title).toBe('Qual turno?');
    expect(sheet.actions).toEqual([
      { numero: 1, label: 'Turno 1', primary: false },
      { numero: 2, label: 'Turno 2', primary: false },
    ]);
  });
});

describe('preferTurnoAtivoCarga', () => {
  const localRecente = ativoHoje(2, '15:05');
  const cargaStale = ativoHoje(1, '08:00');
  const cargaMaisNova = ativoHoje(2, '15:10');

  it('local nulo → usa carga (primeiro load, inclusive nula)', () => {
    expect(preferTurnoAtivoCarga(null, cargaStale)).toEqual(cargaStale);
    expect(preferTurnoAtivoCarga(null, null)).toBeNull();
  });

  it('carga nula com local set → mantém local (poll sem row não apaga PUT)', () => {
    expect(preferTurnoAtivoCarga(localRecente, null)).toEqual(localRecente);
  });

  it('carga com confirmadoEm mais antigo → mantém local', () => {
    expect(preferTurnoAtivoCarga(localRecente, cargaStale)).toEqual(localRecente);
  });

  it('carga com confirmadoEm igual ou mais novo → usa carga', () => {
    expect(preferTurnoAtivoCarga(localRecente, localRecente)).toEqual(localRecente);
    expect(preferTurnoAtivoCarga(localRecente, cargaMaisNova)).toEqual(cargaMaisNova);
  });
});

describe('EtapaTurnoGate.ativoAposConfirmacao', () => {
  it('grava numero + confirmadoEm ISO + valido', () => {
    const now = nowAt('15:05');
    expect(gate.ativoAposConfirmacao(2, now)).toEqual({
      numero: 2,
      confirmadoEm: now.toISOString(),
      valido: true,
    });
  });
});

describe('readTurnoCarga', () => {
  it('lê só turnos do payload da carga', () => {
    expect(
      readTurnoCarga({
        turnos,
        ordens: [],
      }),
    ).toEqual({ turnos });
  });

  it('ausentes → turnos vazios', () => {
    expect(readTurnoCarga({})).toEqual({ turnos: [] });
  });
});

describe('TURNO_TROCA_ERRO', () => {
  it('copy fixa do PUT', () => {
    expect(TURNO_TROCA_ERRO).toBe('Não foi possível trocar o turno.');
  });
});

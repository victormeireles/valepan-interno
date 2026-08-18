import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProducaoTurnoEstado } from './producao-turno-service';

const mockGetEstado = vi.fn();

vi.mock('./producao-turno-service', () => ({
  producaoTurnoService: {
    getEstado: (...args: unknown[]) => mockGetEstado(...args),
  },
}));

const { attachTurnoCarga } = await import('./producao-turno-carga-attach');

const turnos = [{ numero: 1 as const, inicio: '07:00', fim: '18:00' }];

function estado(overrides: Partial<ProducaoTurnoEstado> = {}): ProducaoTurnoEstado {
  return {
    ativo: null,
    decision: {
      kind: 'definir',
      ativoValido: false,
      numeroAtivo: null,
      turnoVigente: 1,
    },
    turnos,
    ...overrides,
  };
}

describe('attachTurnoCarga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('anexa turnos cadastrados e turnoAtivo nulo quando não há linha', async () => {
    mockGetEstado.mockResolvedValue(estado());

    const result = await attachTurnoCarga('fermentacao', { date: '2026-08-18' });

    expect(mockGetEstado).toHaveBeenCalledWith('fermentacao', expect.any(Date));
    expect(result.date).toBe('2026-08-18');
    expect(result.turnos).toEqual(turnos);
    expect(result.turnoAtivo).toBeNull();
  });

  it('anexa turnoAtivo com valido true quando o ativo do dia é válido', async () => {
    mockGetEstado.mockResolvedValue(
      estado({
        ativo: { numero: 1, confirmadoEm: '2026-08-18T11:00:00.000Z' },
        decision: {
          kind: 'nenhum',
          ativoValido: true,
          numeroAtivo: 1,
          turnoVigente: 1,
        },
      }),
    );

    const result = await attachTurnoCarga('forno', { date: '2026-08-18' });

    expect(result.turnoAtivo).toEqual({
      numero: 1,
      confirmadoEm: '2026-08-18T11:00:00.000Z',
      valido: true,
    });
  });

  it('anexa turnoAtivo com valido false quando há linha mas o ativo é inválido', async () => {
    mockGetEstado.mockResolvedValue(
      estado({
        ativo: { numero: 2, confirmadoEm: '2026-08-17T11:00:00.000Z' },
        decision: {
          kind: 'definir',
          ativoValido: false,
          numeroAtivo: null,
          turnoVigente: 1,
        },
      }),
    );

    const result = await attachTurnoCarga('embalagem', { date: '2026-08-18' });

    expect(result.turnoAtivo).toEqual({
      numero: 2,
      confirmadoEm: '2026-08-17T11:00:00.000Z',
      valido: false,
    });
  });

  it('preserva horarioInicioEmbalagem no payload original', async () => {
    mockGetEstado.mockResolvedValue(estado());

    const result = await attachTurnoCarga('embalagem', {
      date: '2026-08-18',
      horarioInicioEmbalagem: '07:00',
    });

    expect(result.horarioInicioEmbalagem).toBe('07:00');
    expect(result.turnos).toEqual(turnos);
    expect(result.turnoAtivo).toBeNull();
  });
});

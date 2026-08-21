import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configOperacaoMapper,
  DEFAULT_CONFIG_OPERACAO,
} from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';

const mockGetConfig = vi.fn();

vi.mock('./config-operacao-service', () => ({
  configOperacaoService: {
    getConfig: (...args: unknown[]) => mockGetConfig(...args),
  },
}));

const { attachTurnoCarga } = await import('./producao-turno-carga-attach');

const snapshotComDoisTurnos: ConfigOperacaoSnapshot = {
  ...DEFAULT_CONFIG_OPERACAO,
  turnos: [
    { etapa: 'fermentacao', numero: 1, inicio: '06:00', fim: '14:00' },
    { etapa: 'fermentacao', numero: 2, inicio: '14:00', fim: '22:00' },
    { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
    { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
  ],
};

describe('attachTurnoCarga', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue(snapshotComDoisTurnos);
  });

  it('anexa só turnos da etapa e não inclui turnoAtivo', async () => {
    const result = await attachTurnoCarga('fermentacao', { date: '2026-08-18' });

    expect(mockGetConfig).toHaveBeenCalled();
    expect(result.date).toBe('2026-08-18');
    expect(result.turnos).toEqual(
      configOperacaoMapper.turnosDaEtapa(snapshotComDoisTurnos, 'fermentacao'),
    );
    expect(result).not.toHaveProperty('turnoAtivo');
  });

  it('preserva horarioInicioEmbalagem no payload original', async () => {
    const result = await attachTurnoCarga('embalagem', {
      date: '2026-08-18',
      horarioInicioEmbalagem: '07:00',
    });

    expect(result.horarioInicioEmbalagem).toBe('07:00');
    expect(result.turnos).toEqual(
      configOperacaoMapper.turnosDaEtapa(snapshotComDoisTurnos, 'embalagem'),
    );
    expect(result).not.toHaveProperty('turnoAtivo');
  });
});

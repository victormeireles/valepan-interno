import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoTurno } from '@/domain/config-operacao/config-operacao-types';

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  supabaseClientFactory: {
    createServiceRoleClient: () => ({ from: mockFrom }),
  },
}));

const { configOperacaoService } = await import('./config-operacao-service');

type TurnoRow = { etapa: string; numero: number; inicio: string; fim: string };

type FakeState = {
  config: Record<string, unknown> | null;
  configError: string | null;
  turnos: TurnoRow[];
  turnosError: string | null;
  updates: unknown[];
  inserts: unknown[];
  deletes: number;
  configSelects: string[];
};

const OVERNIGHT_PG: TurnoRow[] = [
  { etapa: 'fermentacao', numero: 1, inicio: '07:00:00', fim: '18:00:00' },
  { etapa: 'forno', numero: 1, inicio: '07:00:00', fim: '18:00:00' },
  { etapa: 'embalagem', numero: 1, inicio: '07:00:00', fim: '22:00:00' },
  { etapa: 'embalagem', numero: 2, inicio: '22:00:00', fim: '05:00:00' },
];

const PATCH_TURNOS: ConfigOperacaoTurno[] = [
  { etapa: 'fermentacao', numero: 1, inicio: '06:00', fim: '14:00' },
  { etapa: 'forno', numero: 1, inicio: '07:00', fim: '15:00' },
  { etapa: 'embalagem', numero: 1, inicio: '08:00', fim: '22:00' },
];

function seedConfig(): Record<string, unknown> {
  return {
    id: 'cfg-1',
    tempo_medio_fermentacao_min: 200,
    tempo_medio_resfriamento_min: 45,
    updated_at: '2026-08-17T12:00:00.000Z',
    horario_inicio_producao: '07:00:00',
    horario_fim_producao: '18:00:00',
    horario_inicio_forno: '07:00:00',
    horario_fim_forno: '18:00:00',
    horario_inicio_embalagem: '07:00:00',
    horario_fim_embalagem: '21:50:00',
  };
}

function createChain(
  getResult: () => { data: unknown; error: { message: string } | null },
  hooks: {
    onSelect?: (columns: string) => void;
    onUpdate?: (payload: unknown) => void;
    onInsert?: (payload: unknown) => void;
    onDelete?: () => void;
  },
) {
  const chain: Record<string, unknown> = {};
  const next = () => chain;
  chain.select = (columns: string) => {
    hooks.onSelect?.(columns);
    return chain;
  };
  chain.limit = next;
  chain.eq = next;
  chain.in = next;
  chain.update = (payload: unknown) => {
    hooks.onUpdate?.(payload);
    return chain;
  };
  chain.insert = (payload: unknown) => {
    hooks.onInsert?.(payload);
    return chain;
  };
  chain.delete = () => {
    hooks.onDelete?.();
    return chain;
  };
  chain.maybeSingle = () => Promise.resolve(getResult());
  chain.single = () => Promise.resolve(getResult());
  chain.then = (
    onFulfilled: (value: unknown) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(getResult()).then(onFulfilled, onRejected);
  return chain;
}

function installFake(state: FakeState): void {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'config_operacao') {
      return createChain(
        () => ({
          data: state.config,
          error: state.configError ? { message: state.configError } : null,
        }),
        {
          onSelect: (columns) => state.configSelects.push(columns),
          onUpdate: (payload) => {
            state.updates.push(payload);
            if (state.config && payload && typeof payload === 'object') {
              Object.assign(state.config, payload);
            }
          },
        },
      );
    }
    return createChain(
      () => ({
        data: state.turnos,
        error: state.turnosError ? { message: state.turnosError } : null,
      }),
      {
        onDelete: () => {
          state.deletes += 1;
          state.turnos = [];
        },
        onInsert: (payload) => {
          state.inserts.push(payload);
          state.turnos = payload as TurnoRow[];
        },
      },
    );
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

function freshState(): FakeState {
  return {
    config: seedConfig(),
    configError: null,
    turnos: [...OVERNIGHT_PG],
    turnosError: null,
    updates: [],
    inserts: [],
    deletes: 0,
    configSelects: [],
  };
}

describe('ConfigOperacaoService.getConfig', () => {
  let state: FakeState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    configOperacaoService.invalidateCache();
    state = freshState();
    installFake(state);
  });

  it('compõe o snapshot a partir dos minutos e das linhas de turnos', async () => {
    const snapshot = await configOperacaoService.getConfig();

    expect(mockFrom).toHaveBeenCalledWith('config_operacao_turnos');
    expect(state.configSelects.join()).not.toContain('horario_inicio_producao');
    expect(snapshot.tempoMedioFermentacaoMin).toBe(200);
    expect(snapshot.tempoMedioResfriamentoMin).toBe(45);
    expect(snapshot.horarioFimEmbalagem).toBe('05:00');
    expect(snapshot.turnos).toEqual([
      { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '22:00' },
      { etapa: 'embalagem', numero: 2, inicio: '22:00', fim: '05:00' },
    ]);
  });

  it('devolve DEFAULT se a leitura de turnos falhar', async () => {
    state.turnosError = 'relation does not exist';
    await expect(configOperacaoService.getConfig()).resolves.toEqual(
      DEFAULT_CONFIG_OPERACAO,
    );
  });

  it('devolve DEFAULT quando não há linha de config', async () => {
    state.config = null;
    await expect(configOperacaoService.getConfig()).resolves.toEqual(
      DEFAULT_CONFIG_OPERACAO,
    );
  });
});

describe('ConfigOperacaoService.updateConfig', () => {
  let state: FakeState;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    configOperacaoService.invalidateCache();
    state = freshState();
    installFake(state);
  });

  it('atualiza só os minutos quando o patch não traz turnos', async () => {
    const snapshot = await configOperacaoService.updateConfig({
      tempoMedioFermentacaoMin: 150,
    });

    expect(state.deletes).toBe(0);
    expect(state.inserts).toHaveLength(0);
    expect(state.updates[0]).toMatchObject({
      tempo_medio_fermentacao_min: 150,
      tempo_medio_resfriamento_min: 45,
    });
    expect(snapshot.tempoMedioFermentacaoMin).toBe(150);
    expect(snapshot.turnos).toHaveLength(4);
  });

  it('substitui todas as linhas de turnos quando o patch traz turnos', async () => {
    const snapshot = await configOperacaoService.updateConfig({
      turnos: PATCH_TURNOS,
    });

    expect(state.deletes).toBe(1);
    expect(state.inserts[0]).toEqual(PATCH_TURNOS);
    expect(snapshot.turnos).toEqual(PATCH_TURNOS);
    expect(snapshot.horarioInicioProducao).toBe('06:00');
    expect(snapshot.horarioInicioForno).toBe('07:00');
    expect(snapshot.horarioInicioEmbalagem).toBe('08:00');
    expect(snapshot.horarioFimEmbalagem).toBe('22:00');
  });

  it('não grava quando a validação recusa os turnos', async () => {
    await expect(
      configOperacaoService.updateConfig({
        turnos: [
          { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '18:00' },
          { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
          { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '14:00' },
          { etapa: 'embalagem', numero: 3, inicio: '22:00', fim: '05:00' },
        ],
      }),
    ).rejects.toThrow('Ligue o 2º turno antes do 3º.');

    expect(state.updates).toHaveLength(0);
    expect(state.deletes).toBe(0);
    expect(state.inserts).toHaveLength(0);
  });
});

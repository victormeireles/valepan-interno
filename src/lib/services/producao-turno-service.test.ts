import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import { TurnoRequeridoError } from '@/domain/producao-turno/turno-requerido-error';
import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { ProducaoTurnoService } from './producao-turno-service';

const at = (clock: string, day = '2026-08-18') =>
  new Date(brazilClockUtcMs(day, clock));

class FakeTurnoAtivoRepository {
  readonly upserts: Array<{
    etapa: ProducaoTurnoEtapaId;
    numero: ProducaoTurnoNumero;
    confirmadoEm: string;
  }> = [];

  constructor(
    private readonly byEtapa: Partial<
      Record<ProducaoTurnoEtapaId, ProducaoTurnoAtivo | null>
    > = {},
  ) {}

  async findByEtapa(etapa: ProducaoTurnoEtapaId): Promise<ProducaoTurnoAtivo | null> {
    return this.byEtapa[etapa] ?? null;
  }

  async upsert(input: {
    etapa: ProducaoTurnoEtapaId;
    numero: ProducaoTurnoNumero;
    confirmadoEm: string;
  }): Promise<void> {
    this.upserts.push(input);
    this.byEtapa[input.etapa] = {
      numero: input.numero,
      confirmadoEm: input.confirmadoEm,
    };
  }
}

function snapshotComTurnos(
  turnos: ConfigOperacaoSnapshot['turnos'],
): ConfigOperacaoSnapshot {
  return { ...DEFAULT_CONFIG_OPERACAO, turnos };
}

function createService(
  repo: FakeTurnoAtivoRepository,
  snapshot: ConfigOperacaoSnapshot = DEFAULT_CONFIG_OPERACAO,
) {
  return new ProducaoTurnoService(repo, {
    getConfig: async () => snapshot,
  });
}

const t1ConfirmadoHoje: ProducaoTurnoAtivo = {
  numero: 1,
  confirmadoEm: at('08:00').toISOString(),
};

describe('ProducaoTurnoService.requireNumero', () => {
  it('com ativo T1 válido às 10:00 retorna 1', async () => {
    const service = createService(
      new FakeTurnoAtivoRepository({ fermentacao: t1ConfirmadoHoje }),
    );

    const numero = await service.requireNumero('fermentacao', at('10:00'));

    expect(numero).toBe(1);
  });

  it('sem ativo lança TurnoRequeridoError', async () => {
    const service = createService(new FakeTurnoAtivoRepository());

    const thrown = service.requireNumero('fermentacao', at('10:00'));

    await expect(thrown).rejects.toBeInstanceOf(TurnoRequeridoError);
    await expect(thrown).rejects.toMatchObject({ code: 'turno_requerido' });
  });

  it('T1 confirmado hoje fora da janela (19:00) ainda retorna 1', async () => {
    const snapshot = snapshotComTurnos([
      { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '14:00' },
      { etapa: 'fermentacao', numero: 2, inicio: '14:00', fim: '22:00' },
      { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
    ]);
    const service = createService(
      new FakeTurnoAtivoRepository({ fermentacao: t1ConfirmadoHoje }),
      snapshot,
    );

    const numero = await service.requireNumero('fermentacao', at('19:00'));

    expect(numero).toBe(1);
  });

  it('T1 07–18 só, confirmado às 08:00, requireNumero às 19:00 retorna 1', async () => {
    const snapshot = snapshotComTurnos([
      { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
    ]);
    const service = createService(
      new FakeTurnoAtivoRepository({ fermentacao: t1ConfirmadoHoje }),
      snapshot,
    );

    const numero = await service.requireNumero('fermentacao', at('19:00'));

    expect(numero).toBe(1);
  });
});

describe('ProducaoTurnoService.confirm', () => {
  it('de numero 3 sem T3 na config lança Error cadastrado', async () => {
    const repo = new FakeTurnoAtivoRepository();
    const service = createService(repo);

    await expect(service.confirm('fermentacao', 3, at('10:00'))).rejects.toThrow(
      'Turno não cadastrado para esta etapa.',
    );
    expect(repo.upserts).toHaveLength(0);
  });

  it('do mesmo número atualiza confirmadoEm (hora extra)', async () => {
    const repo = new FakeTurnoAtivoRepository({ fermentacao: t1ConfirmadoHoje });
    const service = createService(repo);
    const agora = at('19:00');

    await service.confirm('fermentacao', 1, agora);

    expect(repo.upserts).toEqual([
      {
        etapa: 'fermentacao',
        numero: 1,
        confirmadoEm: agora.toISOString(),
      },
    ]);
  });
});

describe('ProducaoTurnoService.getEstado', () => {
  it('fermentação não usa ativo do forno', async () => {
    const repo = new FakeTurnoAtivoRepository({
      fermentacao: t1ConfirmadoHoje,
      forno: {
        numero: 2,
        confirmadoEm: at('08:00').toISOString(),
      },
    });
    const snapshot = snapshotComTurnos([
      { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '18:00' },
      { etapa: 'forno', numero: 1, inicio: '07:00', fim: '14:00' },
      { etapa: 'forno', numero: 2, inicio: '14:00', fim: '22:00' },
      { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
    ]);
    const service = createService(repo, snapshot);

    const estado = await service.getEstado('fermentacao', at('10:00'));

    expect(estado.ativo).toEqual(t1ConfirmadoHoje);
    expect(estado.decision.numeroAtivo).toBe(1);
    expect(estado.decision.kind).toBe('nenhum');
    expect(estado.turnos.map((turno) => turno.numero)).toEqual([1]);
  });
});

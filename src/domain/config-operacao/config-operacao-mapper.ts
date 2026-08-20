import { toClockHHmm } from '@/lib/utils/date-utils';
import { assertTurnosEtapaValidos } from '@/domain/producao-turno/producao-turno-overlap';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoEtapaId,
  ProducaoTurnoNumero,
} from '@/domain/producao-turno/producao-turno-types';
import type {
  ConfigOperacaoPatch,
  ConfigOperacaoRow,
  ConfigOperacaoSnapshot,
  ConfigOperacaoTurno,
  ConfigOperacaoTurnoRow,
} from './config-operacao-types';

const ETAPAS: ProducaoTurnoEtapaId[] = ['fermentacao', 'forno', 'embalagem'];

const MINUTE_FIELDS = [
  'tempoMedioFermentacaoMin',
  'tempoMedioResfriamentoMin',
] as const;

export const DEFAULT_CONFIG_OPERACAO: ConfigOperacaoSnapshot = {
  horarioInicioProducao: '07:00',
  horarioFimProducao: '18:00',
  horarioInicioForno: '07:00',
  horarioFimForno: '18:00',
  horarioInicioEmbalagem: '07:00',
  horarioFimEmbalagem: '21:50',
  tempoMedioFermentacaoMin: 180,
  tempoMedioResfriamentoMin: 60,
  turnos: [
    { etapa: 'fermentacao', numero: 1, inicio: '07:00', fim: '18:00' },
    { etapa: 'forno', numero: 1, inicio: '07:00', fim: '18:00' },
    { etapa: 'embalagem', numero: 1, inicio: '07:00', fim: '21:50' },
  ],
  updatedAt: null,
};

export function deriveEtapaJanela(
  turnosDaEtapa: ProducaoTurnoCadastrado[],
): { inicio: string; fim: string } {
  const sorted = [...turnosDaEtapa].sort((a, b) => a.numero - b.numero);
  const t1 = sorted.find((turno) => turno.numero === 1) ?? sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    inicio: t1?.inicio ?? '07:00',
    fim: last?.fim ?? '07:00',
  };
}

export class ConfigOperacaoMapper {
  composeSnapshot(
    row: ConfigOperacaoRow,
    turnosRows: readonly ConfigOperacaoTurnoRow[],
  ): ConfigOperacaoSnapshot {
    return this.withDerivedJanelas({
      horarioInicioProducao: '07:00',
      horarioFimProducao: '07:00',
      horarioInicioForno: '07:00',
      horarioFimForno: '07:00',
      horarioInicioEmbalagem: '07:00',
      horarioFimEmbalagem: '07:00',
      tempoMedioFermentacaoMin: row.tempo_medio_fermentacao_min,
      tempoMedioResfriamentoMin: row.tempo_medio_resfriamento_min,
      turnos: this.mapTurnoRows(turnosRows),
      updatedAt: row.updated_at,
    });
  }

  turnosDaEtapa(
    snapshot: ConfigOperacaoSnapshot,
    etapa: ProducaoTurnoEtapaId,
  ): ProducaoTurnoCadastrado[] {
    return snapshot.turnos
      .filter((turno) => turno.etapa === etapa)
      .map(({ numero, inicio, fim }) => ({ numero, inicio, fim }))
      .sort((a, b) => a.numero - b.numero);
  }

  parsePatch(body: unknown): ConfigOperacaoPatch | null {
    if (!body || typeof body !== 'object') return null;
    const record = body as Record<string, unknown>;
    const patch: ConfigOperacaoPatch = {};

    if (record.turnos !== undefined) {
      const turnos = this.parseTurnos(record.turnos);
      if (!turnos) return null;
      patch.turnos = turnos;
    }

    for (const key of MINUTE_FIELDS) {
      if (record[key] === undefined) continue;
      if (typeof record[key] !== 'number' || !Number.isInteger(record[key])) {
        return null;
      }
      patch[key] = record[key];
    }

    return Object.keys(patch).length === 0 ? null : patch;
  }

  mergeSnapshot(
    current: ConfigOperacaoSnapshot,
    patch: ConfigOperacaoPatch,
  ): ConfigOperacaoSnapshot {
    const merged = { ...current, ...patch };
    return patch.turnos ? this.withDerivedJanelas(merged) : merged;
  }

  validateSnapshot(snapshot: ConfigOperacaoSnapshot): string | null {
    for (const etapa of ETAPAS) {
      const invalid = assertTurnosEtapaValidos(this.turnosDaEtapa(snapshot, etapa));
      if (invalid) return invalid;
    }
    if (snapshot.tempoMedioFermentacaoMin <= 0) {
      return 'Tempo médio de fermentação deve ser maior que zero';
    }
    if (snapshot.tempoMedioResfriamentoMin <= 0) {
      return 'Tempo médio de resfriamento deve ser maior que zero';
    }
    return null;
  }

  snapshotToRow(snapshot: ConfigOperacaoSnapshot): Omit<ConfigOperacaoRow, 'updated_at'> {
    return {
      tempo_medio_fermentacao_min: snapshot.tempoMedioFermentacaoMin,
      tempo_medio_resfriamento_min: snapshot.tempoMedioResfriamentoMin,
    };
  }

  private withDerivedJanelas(snapshot: ConfigOperacaoSnapshot): ConfigOperacaoSnapshot {
    const ferm = deriveEtapaJanela(this.turnosDaEtapa(snapshot, 'fermentacao'));
    const forno = deriveEtapaJanela(this.turnosDaEtapa(snapshot, 'forno'));
    const emb = deriveEtapaJanela(this.turnosDaEtapa(snapshot, 'embalagem'));
    return {
      ...snapshot,
      horarioInicioProducao: ferm.inicio,
      horarioFimProducao: ferm.fim,
      horarioInicioForno: forno.inicio,
      horarioFimForno: forno.fim,
      horarioInicioEmbalagem: emb.inicio,
      horarioFimEmbalagem: emb.fim,
    };
  }

  private mapTurnoRows(rows: readonly ConfigOperacaoTurnoRow[]): ConfigOperacaoTurno[] {
    const turnos: ConfigOperacaoTurno[] = [];
    for (const row of rows) {
      const mapped = this.mapTurnoRow(row);
      if (mapped) turnos.push(mapped);
    }
    return turnos;
  }

  private mapTurnoRow(row: ConfigOperacaoTurnoRow): ConfigOperacaoTurno | null {
    if (!isEtapaId(row.etapa) || !isTurnoNumero(row.numero)) return null;
    return {
      etapa: row.etapa,
      numero: row.numero,
      inicio: this.requireClock(row.inicio),
      fim: this.requireClock(row.fim),
    };
  }

  private parseTurnos(value: unknown): ConfigOperacaoTurno[] | null {
    if (!Array.isArray(value)) return null;
    const turnos: ConfigOperacaoTurno[] = [];
    for (const item of value) {
      const parsed = this.parseTurnoItem(item);
      if (!parsed) return null;
      turnos.push(parsed);
    }
    return turnos;
  }

  private parseTurnoItem(item: unknown): ConfigOperacaoTurno | null {
    if (!item || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    if (typeof record.etapa !== 'string' || !isEtapaId(record.etapa)) return null;
    if (typeof record.numero !== 'number' || !isTurnoNumero(record.numero)) return null;
    if (typeof record.inicio !== 'string' || typeof record.fim !== 'string') return null;
    const inicio = toClockHHmm(record.inicio);
    const fim = toClockHHmm(record.fim);
    if (!inicio || !fim) return null;
    return { etapa: record.etapa, numero: record.numero, inicio, fim };
  }

  private requireClock(value: string): string {
    return toClockHHmm(value) ?? '07:00';
  }
}

function isEtapaId(value: string): value is ProducaoTurnoEtapaId {
  return ETAPAS.includes(value as ProducaoTurnoEtapaId);
}

function isTurnoNumero(value: number): value is ProducaoTurnoNumero {
  return value === 1 || value === 2 || value === 3;
}

export const configOperacaoMapper = new ConfigOperacaoMapper();

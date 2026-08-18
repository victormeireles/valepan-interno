import { toClockHHmm } from '@/lib/utils/date-utils';
import type {
  ConfigOperacaoPatch,
  ConfigOperacaoRow,
  ConfigOperacaoSnapshot,
} from './config-operacao-types';

export const DEFAULT_CONFIG_OPERACAO: ConfigOperacaoSnapshot = {
  horarioInicioProducao: '07:00',
  horarioFimProducao: '18:00',
  horarioInicioForno: '07:00',
  horarioFimForno: '18:00',
  horarioInicioEmbalagem: '07:00',
  horarioFimEmbalagem: '21:50',
  tempoMedioFermentacaoMin: 180,
  tempoMedioResfriamentoMin: 60,
  updatedAt: null,
};

const CLOCK_FIELDS = [
  'horarioInicioProducao',
  'horarioFimProducao',
  'horarioInicioForno',
  'horarioFimForno',
  'horarioInicioEmbalagem',
  'horarioFimEmbalagem',
] as const;

const MINUTE_FIELDS = [
  'tempoMedioFermentacaoMin',
  'tempoMedioResfriamentoMin',
] as const;

export class ConfigOperacaoMapper {
  mapRowToSnapshot(row: ConfigOperacaoRow): ConfigOperacaoSnapshot {
    return {
      horarioInicioProducao: this.requireClock(row.horario_inicio_producao),
      horarioFimProducao: this.requireClock(row.horario_fim_producao),
      horarioInicioForno: this.requireClock(row.horario_inicio_forno),
      horarioFimForno: this.requireClock(row.horario_fim_forno),
      horarioInicioEmbalagem: this.requireClock(row.horario_inicio_embalagem),
      horarioFimEmbalagem: this.requireClock(row.horario_fim_embalagem),
      tempoMedioFermentacaoMin: row.tempo_medio_fermentacao_min,
      tempoMedioResfriamentoMin: row.tempo_medio_resfriamento_min,
      updatedAt: row.updated_at,
    };
  }

  parsePatch(body: unknown): ConfigOperacaoPatch | null {
    if (!body || typeof body !== 'object') return null;
    const record = body as Record<string, unknown>;
    const patch: ConfigOperacaoPatch = {};

    for (const key of CLOCK_FIELDS) {
      if (record[key] === undefined) continue;
      if (typeof record[key] !== 'string') return null;
      const clock = toClockHHmm(record[key]);
      if (!clock) return null;
      patch[key] = clock;
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
    return { ...current, ...patch };
  }

  validateSnapshot(snapshot: ConfigOperacaoSnapshot): string | null {
    if (!this.isJanelaValid(snapshot.horarioInicioProducao, snapshot.horarioFimProducao)) {
      return 'Início e fim da fermentação não podem ser iguais';
    }
    if (!this.isJanelaValid(snapshot.horarioInicioForno, snapshot.horarioFimForno)) {
      return 'Início e fim do forno não podem ser iguais';
    }
    if (
      !this.isJanelaValid(
        snapshot.horarioInicioEmbalagem,
        snapshot.horarioFimEmbalagem,
      )
    ) {
      return 'Início e fim da embalagem não podem ser iguais';
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
      horario_inicio_producao: snapshot.horarioInicioProducao,
      horario_fim_producao: snapshot.horarioFimProducao,
      horario_inicio_forno: snapshot.horarioInicioForno,
      horario_fim_forno: snapshot.horarioFimForno,
      horario_inicio_embalagem: snapshot.horarioInicioEmbalagem,
      horario_fim_embalagem: snapshot.horarioFimEmbalagem,
      tempo_medio_fermentacao_min: snapshot.tempoMedioFermentacaoMin,
      tempo_medio_resfriamento_min: snapshot.tempoMedioResfriamentoMin,
    };
  }

  private requireClock(value: string): string {
    return toClockHHmm(value) ?? '07:00';
  }

  private isJanelaValid(inicio: string, fim: string): boolean {
    return inicio !== fim;
  }
}

export const configOperacaoMapper = new ConfigOperacaoMapper();

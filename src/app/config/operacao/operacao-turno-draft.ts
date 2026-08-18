import { toMinutesFromClock } from '@/domain/painel-producao/painel-producao-time';
import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type {
  ConfigOperacaoPatch,
  ConfigOperacaoSnapshot,
  ConfigOperacaoTurno,
} from '@/domain/config-operacao/config-operacao-types';
import type { ProducaoTurnoEtapaId } from '@/domain/producao-turno/producao-turno-types';

export type TurnoClockDraft = {
  inicio: string;
  fim: string;
};

export type EtapaDraft = {
  t1: TurnoClockDraft;
  t2?: TurnoClockDraft;
  t3?: TurnoClockDraft;
};

export type OperacaoEtapaDrafts = Record<ProducaoTurnoEtapaId, EtapaDraft>;

export type OperacaoFormDraft = {
  etapas: OperacaoEtapaDrafts;
  tempoMedioFermentacaoMin: number;
  tempoMedioResfriamentoMin: number;
};

export const OPERACAO_ETAPA_IDS: readonly ProducaoTurnoEtapaId[] = [
  'fermentacao',
  'forno',
  'embalagem',
];

export const OPERACAO_ETAPA_LABELS: Record<ProducaoTurnoEtapaId, string> = {
  fermentacao: 'Fermentação',
  forno: 'Forno',
  embalagem: 'Embalagem',
};

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_TURNO_HOURS = 4;

export class OperacaoTurnoDraftManager {
  fromSnapshot(snapshot: ConfigOperacaoSnapshot): OperacaoFormDraft {
    return {
      etapas: this.fromTurnos(snapshot.turnos),
      tempoMedioFermentacaoMin: snapshot.tempoMedioFermentacaoMin,
      tempoMedioResfriamentoMin: snapshot.tempoMedioResfriamentoMin,
    };
  }

  toPatch(draft: OperacaoFormDraft): ConfigOperacaoPatch {
    return {
      turnos: this.toTurnos(draft.etapas),
      tempoMedioFermentacaoMin: draft.tempoMedioFermentacaoMin,
      tempoMedioResfriamentoMin: draft.tempoMedioResfriamentoMin,
    };
  }

  fromTurnos(turnos: readonly ConfigOperacaoTurno[]): OperacaoEtapaDrafts {
    return {
      fermentacao: this.etapaFromTurnos(turnos, 'fermentacao'),
      forno: this.etapaFromTurnos(turnos, 'forno'),
      embalagem: this.etapaFromTurnos(turnos, 'embalagem'),
    };
  }

  toTurnos(drafts: OperacaoEtapaDrafts): ConfigOperacaoTurno[] {
    const turnos: ConfigOperacaoTurno[] = [];
    for (const etapa of OPERACAO_ETAPA_IDS) {
      turnos.push(...this.etapaToTurnos(etapa, drafts[etapa]));
    }
    return turnos;
  }

  setTurnoEnabled(draft: EtapaDraft, numero: 2 | 3, enabled: boolean): EtapaDraft {
    if (numero === 2) return this.setTurno2(draft, enabled);
    return this.setTurno3(draft, enabled);
  }

  private etapaFromTurnos(
    turnos: readonly ConfigOperacaoTurno[],
    etapa: ProducaoTurnoEtapaId,
  ): EtapaDraft {
    const t1 = this.clocksOf(turnos, etapa, 1) ?? this.defaultT1(etapa);
    const t2 = this.clocksOf(turnos, etapa, 2);
    const t3 = t2 ? this.clocksOf(turnos, etapa, 3) : undefined;
    return t3 ? { t1, t2, t3 } : t2 ? { t1, t2 } : { t1 };
  }

  private etapaToTurnos(etapa: ProducaoTurnoEtapaId, draft: EtapaDraft): ConfigOperacaoTurno[] {
    const turnos: ConfigOperacaoTurno[] = [
      { etapa, numero: 1, inicio: draft.t1.inicio, fim: draft.t1.fim },
    ];
    if (draft.t2) {
      turnos.push({ etapa, numero: 2, inicio: draft.t2.inicio, fim: draft.t2.fim });
    }
    if (draft.t2 && draft.t3) {
      turnos.push({ etapa, numero: 3, inicio: draft.t3.inicio, fim: draft.t3.fim });
    }
    return turnos;
  }

  private setTurno2(draft: EtapaDraft, enabled: boolean): EtapaDraft {
    if (!enabled) return { t1: draft.t1 };
    if (draft.t2) return draft;
    return { t1: draft.t1, t2: this.nextTurnoClocks(draft.t1) };
  }

  private setTurno3(draft: EtapaDraft, enabled: boolean): EtapaDraft {
    if (!draft.t2) return { t1: draft.t1 };
    if (!enabled) return { t1: draft.t1, t2: draft.t2 };
    if (draft.t3) return draft;
    return { t1: draft.t1, t2: draft.t2, t3: this.nextTurnoClocks(draft.t2) };
  }

  private clocksOf(
    turnos: readonly ConfigOperacaoTurno[],
    etapa: ProducaoTurnoEtapaId,
    numero: 1 | 2 | 3,
  ): TurnoClockDraft | undefined {
    const found = turnos.find((turno) => turno.etapa === etapa && turno.numero === numero);
    if (!found) return undefined;
    return { inicio: found.inicio, fim: found.fim };
  }

  private defaultT1(etapa: ProducaoTurnoEtapaId): TurnoClockDraft {
    const found = DEFAULT_CONFIG_OPERACAO.turnos.find(
      (turno) => turno.etapa === etapa && turno.numero === 1,
    );
    return { inicio: found?.inicio ?? '07:00', fim: found?.fim ?? '18:00' };
  }

  private nextTurnoClocks(previous: TurnoClockDraft): TurnoClockDraft {
    return {
      inicio: previous.fim,
      fim: this.addClockHours(previous.fim, DEFAULT_TURNO_HOURS),
    };
  }

  private addClockHours(clock: string, hours: number): string {
    const wrapped =
      (((toMinutesFromClock(clock) + hours * 60) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
      MINUTES_PER_DAY;
    const hour = Math.floor(wrapped / 60);
    const minute = wrapped % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}

export const operacaoTurnoDraftManager = new OperacaoTurnoDraftManager();

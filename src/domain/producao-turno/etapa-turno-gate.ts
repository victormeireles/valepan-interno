import { brazilClockMinutes } from '@/lib/utils/date-utils';
import type { ProducaoTurnoCargaAtivo } from './producao-turno-carga';
import { ProducaoTurnoPrompt } from './producao-turno-prompt';
import { buildTurnoSheetModel, type TurnoSheetModel } from './producao-turno-sheet-model';
import type {
  ProducaoTurnoAtivo,
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
} from './producao-turno-types';

export type TurnoChipTone = 'amber' | 'stone';

export type TurnoChipPresentation = {
  label: string;
  ariaLabel: string;
  tone: TurnoChipTone;
};

export type EtapaTurnoEnsurePlan =
  | { action: 'proceed' }
  | { action: 'open'; sheet: TurnoSheetModel };

export function preferTurnoAtivoCarga(
  local: ProducaoTurnoCargaAtivo | null,
  fromCarga: ProducaoTurnoCargaAtivo | null,
): ProducaoTurnoCargaAtivo | null {
  if (!local) return fromCarga;
  if (!fromCarga) return local;
  return fromCarga.confirmadoEm >= local.confirmadoEm ? fromCarga : local;
}

function toPromptAtivo(
  ativo: ProducaoTurnoCargaAtivo | null,
): ProducaoTurnoAtivo | null {
  if (!ativo) return null;
  return { numero: ativo.numero, confirmadoEm: ativo.confirmadoEm };
}

export class EtapaTurnoGate {
  constructor(private readonly prompt = new ProducaoTurnoPrompt()) {}

  resolveChip(turnoAtivo: ProducaoTurnoCargaAtivo | null): TurnoChipPresentation {
    if (!turnoAtivo || !turnoAtivo.valido) {
      return {
        label: 'Definir turno',
        ariaLabel: 'Definir turno',
        tone: 'stone',
      };
    }
    return {
      label: `Turno ${turnoAtivo.numero}`,
      ariaLabel: `Turno ${turnoAtivo.numero}`,
      tone: 'amber',
    };
  }

  planEnsure(input: {
    turnos: ProducaoTurnoCadastrado[];
    ativo: ProducaoTurnoCargaAtivo | null;
    now: Date;
  }): EtapaTurnoEnsurePlan {
    const decision = this.prompt.decide({
      nowMs: input.now.getTime(),
      agoraMin: brazilClockMinutes(input.now),
      turnos: input.turnos,
      ativo: toPromptAtivo(input.ativo),
    });
    if (decision.kind === 'nenhum') return { action: 'proceed' };
    const sheet = buildTurnoSheetModel(decision, input.turnos);
    if (!sheet) return { action: 'proceed' };
    return { action: 'open', sheet };
  }

  planChipSheet(turnos: ProducaoTurnoCadastrado[]): TurnoSheetModel {
    return (
      buildTurnoSheetModel(
        {
          kind: 'definir',
          ativoValido: false,
          numeroAtivo: null,
          turnoVigente: null,
        },
        turnos,
      ) ?? { title: 'Qual turno?', actions: [] }
    );
  }

  ativoAposConfirmacao(
    numero: ProducaoTurnoNumero,
    now: Date,
  ): ProducaoTurnoCargaAtivo {
    return {
      numero,
      confirmadoEm: now.toISOString(),
      valido: true,
    };
  }
}

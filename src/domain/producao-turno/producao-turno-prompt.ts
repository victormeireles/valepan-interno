import { isClockInJanela } from './producao-turno-janela';
import { ProducaoTurnoDiaResolver } from './producao-turno-dia';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
  ProducaoTurnoPromptDecision,
  ProducaoTurnoPromptInput,
} from './producao-turno-types';

export class ProducaoTurnoPrompt {
  constructor(private readonly diaResolver = new ProducaoTurnoDiaResolver()) {}

  decide(input: ProducaoTurnoPromptInput): ProducaoTurnoPromptDecision {
    const { nowMs, agoraMin, turnos, ativo } = input;
    const turnoVigente = this.resolveTurnoVigente(agoraMin, turnos);
    const dia = this.diaResolver.resolve(nowMs, turnos);

    const numeroExiste =
      ativo != null && turnos.some((t) => t.numero === ativo.numero);
    const confirmadoNoDia =
      ativo != null &&
      dia != null &&
      Date.parse(ativo.confirmadoEm) >= dia.startMs;

    const ativoValido =
      dia != null && ativo != null && confirmadoNoDia && numeroExiste;

    if (!ativoValido) {
      return {
        kind: 'definir',
        ativoValido: false,
        numeroAtivo: null,
        turnoVigente,
      };
    }

    const ativoConfig = turnos.find((t) => t.numero === ativo!.numero)!;
    const dentroJanela = isClockInJanela(
      agoraMin,
      ativoConfig.inicio,
      ativoConfig.fim,
    );

    return {
      kind: dentroJanela ? 'nenhum' : 'confirmar_fora',
      ativoValido: true,
      numeroAtivo: ativo!.numero,
      turnoVigente,
    };
  }

  private resolveTurnoVigente(
    agoraMin: number,
    turnos: ProducaoTurnoCadastrado[],
  ): ProducaoTurnoNumero | null {
    const sorted = [...turnos].sort((a, b) => a.numero - b.numero);
    for (const turno of sorted) {
      if (isClockInJanela(agoraMin, turno.inicio, turno.fim)) {
        return turno.numero;
      }
    }
    return null;
  }
}

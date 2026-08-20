import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoNumero,
  ProducaoTurnoPromptDecision,
} from './producao-turno-types';

export type TurnoSheetModel = {
  title: string;
  actions: Array<{ numero: ProducaoTurnoNumero; label: string; primary: boolean }>;
};

export function buildTurnoSheetModel(
  decision: ProducaoTurnoPromptDecision,
  turnos: ProducaoTurnoCadastrado[],
): TurnoSheetModel | null {
  if (decision.kind === 'nenhum') return null;

  if (decision.kind === 'definir') {
    return {
      title: 'Qual turno?',
      actions: turnos.map((t) => ({
        numero: t.numero,
        label: `Turno ${t.numero}`,
        primary: false,
      })),
    };
  }

  const n = decision.numeroAtivo!;
  const actions: TurnoSheetModel['actions'] = [
    { numero: n, label: `Continuar no ${n}º`, primary: false },
  ];

  if (decision.turnoVigente && decision.turnoVigente !== n) {
    actions.push({
      numero: decision.turnoVigente,
      label: `Trocar para o ${decision.turnoVigente}º`,
      primary: true,
    });
  } else {
    for (const t of turnos) {
      if (t.numero === n) continue;
      actions.push({
        numero: t.numero,
        label: `Trocar para o ${t.numero}º`,
        primary: false,
      });
    }
  }

  return { title: `Ainda é o ${n}º turno?`, actions };
}

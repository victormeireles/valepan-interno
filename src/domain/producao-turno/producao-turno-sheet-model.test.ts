import { describe, expect, it } from 'vitest';
import { buildTurnoSheetModel } from './producao-turno-sheet-model';
import type {
  ProducaoTurnoCadastrado,
  ProducaoTurnoPromptDecision,
} from './producao-turno-types';

const turnos: ProducaoTurnoCadastrado[] = [
  { numero: 1, inicio: '07:00', fim: '14:00' },
  { numero: 2, inicio: '14:00', fim: '22:00' },
];

describe('buildTurnoSheetModel', () => {
  it('nenhum → null', () => {
    const decision: ProducaoTurnoPromptDecision = {
      kind: 'nenhum',
      ativoValido: true,
      numeroAtivo: 1,
      turnoVigente: 1,
    };
    expect(buildTurnoSheetModel(decision, turnos)).toBeNull();
  });

  it('definir → Qual turno? com lista dos ligados', () => {
    const decision: ProducaoTurnoPromptDecision = {
      kind: 'definir',
      ativoValido: false,
      numeroAtivo: null,
      turnoVigente: 1,
    };
    expect(buildTurnoSheetModel(decision, turnos)).toEqual({
      title: 'Qual turno?',
      actions: [
        { numero: 1, label: 'Turno 1', primary: false },
        { numero: 2, label: 'Turno 2', primary: false },
      ],
    });
  });

  it('confirmar_fora com vigente → Continuar + Trocar primary', () => {
    const decision: ProducaoTurnoPromptDecision = {
      kind: 'confirmar_fora',
      ativoValido: true,
      numeroAtivo: 1,
      turnoVigente: 2,
    };
    expect(buildTurnoSheetModel(decision, turnos)).toEqual({
      title: 'Ainda é o 1º turno?',
      actions: [
        { numero: 1, label: 'Continuar no 1º', primary: false },
        { numero: 2, label: 'Trocar para o 2º', primary: true },
      ],
    });
  });

  it('confirmar_fora sem vigente → Continuar + lista dos outros', () => {
    const decision: ProducaoTurnoPromptDecision = {
      kind: 'confirmar_fora',
      ativoValido: true,
      numeroAtivo: 1,
      turnoVigente: null,
    };
    expect(buildTurnoSheetModel(decision, turnos)).toEqual({
      title: 'Ainda é o 1º turno?',
      actions: [
        { numero: 1, label: 'Continuar no 1º', primary: false },
        { numero: 2, label: 'Trocar para o 2º', primary: false },
      ],
    });
  });
});

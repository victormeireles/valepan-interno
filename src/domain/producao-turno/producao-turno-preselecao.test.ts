import { describe, expect, it } from 'vitest';
import { resolveTurnoPreselecao } from './producao-turno-preselecao';
import type { ProducaoTurnoCadastrado } from './producao-turno-types';

const fermEncavalo: ProducaoTurnoCadastrado[] = [
  { numero: 1, inicio: '00:00', fim: '09:00' },
  { numero: 2, inicio: '05:00', fim: '14:00' },
];

describe('resolveTurnoPreselecao', () => {
  it('ultimo ligado ganha em overlap e fora de janela', () => {
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 6 * 60, ultimo: 1 }),
    ).toBe(1);
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 15 * 60, ultimo: 2 }),
    ).toBe(2);
  });

  it('sem ultimo, janela única vence', () => {
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 3 * 60, ultimo: null }),
    ).toBe(1);
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 10 * 60, ultimo: null }),
    ).toBe(2);
  });

  it('overlap sem ultimo fica vazio', () => {
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 6 * 60, ultimo: null }),
    ).toBeNull();
  });

  it('hora extra escolhe o fim mais recente', () => {
    expect(
      resolveTurnoPreselecao({ turnos: fermEncavalo, agoraMin: 15 * 60, ultimo: null }),
    ).toBe(2);
  });

  it('hora extra overnight usa T3 que acabou às 05:00', () => {
    const turnos: ProducaoTurnoCadastrado[] = [
      { numero: 1, inicio: '07:00', fim: '14:00' },
      { numero: 2, inicio: '14:00', fim: '22:00' },
      { numero: 3, inicio: '22:00', fim: '05:00' },
    ];
    expect(
      resolveTurnoPreselecao({ turnos, agoraMin: 6 * 60, ultimo: null }),
    ).toBe(3);
  });

  it('ignora ultimo desligado', () => {
    expect(
      resolveTurnoPreselecao({
        turnos: [{ numero: 1, inicio: '07:00', fim: '18:00' }],
        agoraMin: 10 * 60,
        ultimo: 2,
      }),
    ).toBe(1);
  });
});

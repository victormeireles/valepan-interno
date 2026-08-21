import { describe, expect, it } from 'vitest';
import { assertTurnosEtapaValidos } from './producao-turno-overlap';

describe('assertTurnosEtapaValidos', () => {
  it('exige T1', () => {
    expect(assertTurnosEtapaValidos([])).toMatch(/1º turno/i);
  });

  it('rejeita T3 sem T2', () => {
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 3, inicio: '22:00', fim: '05:00' },
      ]),
    ).toBe('Ligue o 2º turno antes do 3º.');
  });

  it('rejeita início = fim', () => {
    expect(
      assertTurnosEtapaValidos([{ numero: 1, inicio: '07:00', fim: '07:00' }]),
    ).toBe('Início e fim do turno não podem ser iguais.');
  });

  it('aceita sobreposição, vão e fronteira', () => {
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '00:00', fim: '09:00' },
        { numero: 2, inicio: '05:00', fim: '14:00' },
      ]),
    ).toBeNull();
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '13:00', fim: '22:00' },
      ]),
    ).toBeNull();
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '14:00', fim: '22:00' },
      ]),
    ).toBeNull();
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '14:30', fim: '22:00' },
      ]),
    ).toBeNull();
  });

  it('aceita overnight que atravessa o T1 do dia seguinte', () => {
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '22:00', fim: '08:00' },
      ]),
    ).toBeNull();
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '14:00', fim: '22:00' },
        { numero: 3, inicio: '22:00', fim: '08:00' },
      ]),
    ).toBeNull();
  });

  it('aceita T3 22–05 (termina antes do próximo T1) e fronteira 07:00', () => {
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '14:00', fim: '22:00' },
        { numero: 3, inicio: '22:00', fim: '05:00' },
      ]),
    ).toBeNull();
    expect(
      assertTurnosEtapaValidos([
        { numero: 1, inicio: '07:00', fim: '14:00' },
        { numero: 2, inicio: '14:00', fim: '22:00' },
        { numero: 3, inicio: '22:00', fim: '07:00' },
      ]),
    ).toBeNull();
  });
});

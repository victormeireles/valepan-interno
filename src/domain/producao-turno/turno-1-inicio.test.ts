import { describe, expect, it } from 'vitest';

import { Turno1Inicio } from './turno-1-inicio';

const picker = new Turno1Inicio();

describe('Turno1Inicio.clock', () => {
  it('usa o inicio do turno numero 1 mesmo quando o T2 contém o meio-dia', () => {
    expect(
      picker.clock([
        { numero: 1, inicio: '22:00', fim: '07:00' },
        { numero: 2, inicio: '07:00', fim: '16:00' },
        { numero: 3, inicio: '13:00', fim: '22:00' },
      ]),
    ).toBe('22:00');
  });

  it('não escolhe o turno que contém 12:00 quando esse não é o numero 1', () => {
    expect(
      picker.clock([
        { numero: 2, inicio: '07:00', fim: '16:00' },
        { numero: 1, inicio: '22:00', fim: '07:00' },
      ]),
    ).toBe('22:00');
  });

  it('sem T1 devolve o fallback, sem chutar 22h', () => {
    expect(picker.clock([{ numero: 2, inicio: '07:00', fim: '16:00' }], '00:00')).toBe(
      '00:00',
    );
  });
});

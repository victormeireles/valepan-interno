import { describe, expect, it } from 'vitest';
import {
  parseProducaoTurnoNumero,
  TURNO_INFORME_MESSAGE,
} from './producao-turno-numero';

describe('parseProducaoTurnoNumero', () => {
  it('aceita 1, 2, 3 em number ou string', () => {
    expect(parseProducaoTurnoNumero(1)).toBe(1);
    expect(parseProducaoTurnoNumero('2')).toBe(2);
    expect(parseProducaoTurnoNumero(3)).toBe(3);
  });

  it('rejeita ausente, 0, 4 e lixo', () => {
    expect(parseProducaoTurnoNumero(undefined)).toBeNull();
    expect(parseProducaoTurnoNumero(0)).toBeNull();
    expect(parseProducaoTurnoNumero(4)).toBeNull();
    expect(parseProducaoTurnoNumero('x')).toBeNull();
  });

  it('expõe a copy de informe', () => {
    expect(TURNO_INFORME_MESSAGE).toBe('Informe o turno.');
  });
});

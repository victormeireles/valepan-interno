import { describe, expect, it } from 'vitest';
import { FluxoControleStatus } from './fluxo-controle-status';

const status = new FluxoControleStatus();

describe('FluxoControleStatus', () => {
  it('±5% é no plano', () => {
    expect(status.resolve(100, 100)).toBe('no plano');
    expect(status.resolve(96, 100)).toBe('no plano');
    expect(status.resolve(105, 100)).toBe('no plano');
  });

  it('abaixo de 95% é atrasado; acima de 105% é adiantado', () => {
    expect(status.resolve(90, 100)).toBe('atrasado');
    expect(status.resolve(110, 100)).toBe('adiantado');
  });

  it('deveria 0 e está 0 = no plano; está > 0 = adiantado', () => {
    expect(status.resolve(0, 0)).toBe('no plano');
    expect(status.resolve(50, 0)).toBe('adiantado');
  });

  it('numeros() calcula deltaUn e status', () => {
    const numeros = status.numeros(200, 100, 90);
    expect(numeros).toEqual({
      objetivoUn: 200,
      deveriaUn: 100,
      estaUn: 90,
      deltaUn: -10,
      status: 'atrasado',
      objetivoLt: 0,
      deveriaLt: 0,
      objetivoCx: 0,
      deveriaCx: 0,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { ProximoVencimentoExperiencia } from './proximo-vencimento-experiencia';

const hoje = '2026-11-24';
const experiencia = new ProximoVencimentoExperiencia();

describe('ProximoVencimentoExperiencia', () => {
  it('mostra o vencimento de 30 dias enquanto ele não passou', () => {
    expect(experiencia.proximo('2026-11-01', hoje)).toEqual({
      prazo: 30,
      iso: '2026-12-01',
      data: '01/12/2026',
      diasRestantes: 7,
    });
    expect(experiencia.pertoDeVencer('2026-11-01', hoje)).toBe(true);
  });

  it('passa para 60 dias depois que o de 30 vence', () => {
    expect(experiencia.proximo('2026-09-26', hoje)).toMatchObject({
      prazo: 60,
      iso: '2026-11-25',
      data: '25/11/2026',
      diasRestantes: 1,
    });
    expect(experiencia.pertoDeVencer('2026-10-10', hoje)).toBe(false);
    expect(experiencia.proximo('2026-10-10', hoje)?.prazo).toBe(60);
  });

  it('trata o dia do vencimento como a vencer e esconde quando os dois já passaram', () => {
    expect(experiencia.proximo('2026-10-25', hoje)?.diasRestantes).toBe(0);
    expect(experiencia.pertoDeVencer('2026-10-25', hoje)).toBe(true);
    expect(experiencia.proximo('2026-09-20', hoje)).toBeNull();
    expect(experiencia.proximo(null, hoje)).toBeNull();
    expect(experiencia.pertoDeVencer('2026-11-02', hoje)).toBe(false);
  });

  it('explica qual vencimento está chegando', () => {
    const hojeMarco = experiencia.proximo('2026-10-25', hoje);
    const amanha = experiencia.proximo('2026-09-26', hoje);
    expect(hojeMarco ? experiencia.legenda(hojeMarco) : '').toBe('Vencimento de 30 dias é hoje');
    expect(amanha ? experiencia.legenda(amanha) : '').toBe('Vencimento de 60 dias é amanhã');
  });
});

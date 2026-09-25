import { describe, expect, it } from 'vitest';
import { ExtraServico } from './extra-servico';

describe('ExtraServico', () => {
  const extra = new ExtraServico();
  const base = {
    valorExtraCentavos: 15000,
    precisaPassagem: true,
    valorPassagemCentavos: null as number | null,
    inicio: '2026-09-25T22:00:00-03:00',
    fim: '2026-09-26T06:00:00-03:00',
    estado: 'realizado' as const,
  };

  it('deixa o total pendente quando a passagem é desconhecida', () => {
    expect(extra.totalCentavos(base)).toBeNull();
    expect(extra.podePagar(base)).toBe(false);
  });

  it('soma a passagem e não paga serviço programado', () => {
    const completo = { ...base, valorPassagemCentavos: 1200, estado: 'programado' as const };
    expect(extra.totalCentavos(completo)).toBe(16200);
    expect(extra.podePagar(completo)).toBe(false);
    expect(extra.podePagar({ ...completo, estado: 'realizado' })).toBe(true);
  });

  it('aceita término no dia seguinte', () => {
    expect(extra.horarioValido(base.inicio, base.fim)).toBe(true);
  });
});

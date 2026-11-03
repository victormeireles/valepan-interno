import { describe, expect, it } from 'vitest';
import { RemuneracaoLinhaGravacao, RemuneracaoVigenciaParser } from './remuneracao-linha';

const pacote = {
  inicio: '2026-03-01',
  salarioCentavos: 123456,
  valeTransporteCentavos: 0,
  valeAlimentacaoCentavos: 150,
  planoSaude: false,
};

describe('RemuneracaoLinhaGravacao', () => {
  it('grava os quatro valores na mesma data, sem regime', () => {
    const row = new RemuneracaoLinhaGravacao().montar('col-1', pacote, '2026-11-03T12:00:00.000Z');
    expect(row).toEqual({
      colaborador_id: 'col-1',
      inicio: '2026-03-01',
      salario_centavos: 123456,
      vale_transporte_centavos: 0,
      vale_alimentacao_centavos: 150,
      plano_saude: false,
      updated_at: '2026-11-03T12:00:00.000Z',
    });
    expect(row).not.toHaveProperty('regime');
  });
});

describe('RemuneracaoVigenciaParser', () => {
  it('lê a linha e corta a data no dia civil', () => {
    const vigencia = new RemuneracaoVigenciaParser().parse({
      id: 'vig-1',
      inicio: '2026-03-01',
      salario_centavos: 123456,
      vale_transporte_centavos: 0,
      vale_alimentacao_centavos: 150,
      plano_saude: false,
    });
    expect(vigencia).toEqual({ id: 'vig-1', ...pacote });
  });
});

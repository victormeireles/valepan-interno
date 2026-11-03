import { describe, expect, it } from 'vitest';
import { RemuneracaoPacoteNormalizador } from './remuneracao-pacote';

const completo: Record<string, string> = {
  inicio: '2026-03-01',
  salario: '1.234,56',
  valeTransporteValor: '0',
  valeAlimentacao: '1,5',
  planoSaude: '0',
};

describe('RemuneracaoPacoteNormalizador', () => {
  const normalizador = new RemuneracaoPacoteNormalizador();

  it('monta o pacote e grava plano desligado como não', () => {
    expect(normalizador.normalizar(completo)).toEqual({
      inicio: '2026-03-01',
      salarioCentavos: 123456,
      valeTransporteCentavos: 0,
      valeAlimentacaoCentavos: 150,
      planoSaude: false,
    });
    expect(normalizador.normalizar({ ...completo, planoSaude: '1' }).planoSaude).toBe(true);
  });

  it('recusa data vazia, malformada e inexistente', () => {
    expect(() => normalizador.normalizar({ ...completo, inicio: '' })).toThrow('Informe a data de início.');
    expect(() => normalizador.normalizar({ ...completo, inicio: '01/03/2026' })).toThrow('Informe a data de início.');
    expect(() => normalizador.normalizar({ ...completo, inicio: '2026-02-31' })).toThrow('Informe a data de início.');
  });

  it('aceita data passada e futura', () => {
    expect(normalizador.normalizar({ ...completo, inicio: '2020-01-15' }).inicio).toBe('2020-01-15');
    expect(normalizador.normalizar({ ...completo, inicio: '2030-12-01' }).inicio).toBe('2030-12-01');
  });

  it('cita o campo do valor e do plano', () => {
    expect(() => normalizador.normalizar({ ...completo, salario: '' })).toThrow('Informe o salário.');
    expect(() => normalizador.normalizar({ ...completo, valeTransporteValor: '-1' })).toThrow('Informe o valor do vale transporte.');
    expect(() => normalizador.normalizar({ ...completo, valeAlimentacao: '1,234' })).toThrow('Informe o vale alimentação/refeição.');
    expect(() => normalizador.normalizar({ ...completo, salario: '21474836,48' })).toThrow('Salário alto demais.');
    expect(() => normalizador.normalizar({ ...completo, planoSaude: '' })).toThrow('Informe o plano de saúde.');
    expect(() => normalizador.normalizar({ ...completo, planoSaude: 'sim' })).toThrow('Informe o plano de saúde.');
  });
});

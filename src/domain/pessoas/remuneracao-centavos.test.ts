import { describe, expect, it } from 'vitest';
import { RemuneracaoCentavos } from './remuneracao-centavos';

describe('RemuneracaoCentavos', () => {
  const centavos = new RemuneracaoCentavos();
  const invalido = 'Informe o salário.';
  const alto = 'Salário alto demais.';

  it('converte reais brasileiros em centavos', () => {
    expect(centavos.interpretar('1.234,56', invalido, alto)).toBe(123456);
    expect(centavos.interpretar('1234,56', invalido, alto)).toBe(123456);
    expect(centavos.interpretar('1,5', invalido, alto)).toBe(150);
    expect(centavos.interpretar('0', invalido, alto)).toBe(0);
    expect(centavos.interpretar('0,00', invalido, alto)).toBe(0);
    expect(centavos.interpretar(' 1.234 ', invalido, alto)).toBe(123400);
  });

  it('recusa vazio, texto, negativo, centavos a mais e milhar quebrado', () => {
    expect(() => centavos.interpretar('', invalido, alto)).toThrow(invalido);
    expect(() => centavos.interpretar('abc', invalido, alto)).toThrow(invalido);
    expect(() => centavos.interpretar('-1', invalido, alto)).toThrow(invalido);
    expect(() => centavos.interpretar('1,234', invalido, alto)).toThrow(invalido);
    expect(() => centavos.interpretar('1.23', invalido, alto)).toThrow(invalido);
    expect(() => centavos.interpretar('1.234,567', invalido, alto)).toThrow(invalido);
  });

  it('recusa valor acima do inteiro de 32 bits', () => {
    expect(() => centavos.interpretar('21474836,48', invalido, alto)).toThrow(alto);
  });

  it('formata exibição e o valor editável', () => {
    expect(centavos.formatar(123456)).toBe('R$ 1.234,56');
    expect(centavos.formatar(150)).toBe('R$ 1,50');
    expect(centavos.formatar(0)).toBe('R$ 0,00');
    expect(centavos.digitar(123456)).toBe('1.234,56');
  });
});

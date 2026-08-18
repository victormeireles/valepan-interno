import { describe, expect, it } from 'vitest';
import { ProdutoCustoMargemCalculo } from './produto-custo-margem-calculo';

const calc = new ProdutoCustoMargemCalculo();

describe('ProdutoCustoMargemCalculo', () => {
  it('margem bruta = (preço - custo) / preço', () => {
    const resultado = calc.calcular(1, 0.54);
    expect(resultado).not.toBeNull();
    expect(resultado!.margemReais).toBeCloseTo(0.46, 10);
    expect(resultado!.margemPercentual).toBeCloseTo(46, 10);
  });

  it('sem preço válido retorna nulo', () => {
    expect(calc.calcular(undefined, 0.54)).toBeNull();
    expect(calc.calcular(0, 0.54)).toBeNull();
    expect(calc.calcular(-1, 0.54)).toBeNull();
  });

  it('custo maior que o preço gera margem negativa', () => {
    const resultado = calc.calcular(1, 1.2);
    expect(resultado!.margemReais).toBeCloseTo(-0.2, 10);
    expect(resultado!.margemPercentual).toBeCloseTo(-20, 10);
  });
});

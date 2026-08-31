import { describe, expect, it } from 'vitest';
import { insumoCompraDiaOperacional } from './insumo-compra-dia-operacional';
import { InsumoCompraProjecaoCalculator } from './insumo-compra-projecao-calculator';

const calc = new InsumoCompraProjecaoCalculator();
const r = 100;
const H = 7;
const demanda = insumoCompraDiaOperacional.demandaHorizonte(r, 1, H); // 550

function base(
  overrides: Partial<Parameters<InsumoCompraProjecaoCalculator['calculate']>[0]> = {},
) {
  return {
    estoque: 20,
    consumoDiario: r,
    dayOfWeek: 1,
    leadTimeDias: 7,
    horizonteDias: H,
    dataReferencia: '2026-08-31',
    recebimentos: [] as { quantidade: number; dataEfetiva: string }[],
    ...overrides,
  };
}

describe('InsumoCompraProjecaoCalculator', () => {
  it('sem recebimento: projetado = saldo − demanda(H)', () => {
    const result = calc.calculate(base({ estoque: 20 }));
    expect(result.demandaH).toBeCloseTo(demanda, 5);
    expect(result.projetadoEmH).toBeCloseTo(20 - demanda, 5);
    expect(result.recebimentosAteH).toBe(0);
  });

  it('recebimento amanhã entra no projetado (spec: 20 − 70 + 100, com pesos reais)', () => {
    const result = calc.calculate(
      base({
        estoque: 20,
        recebimentos: [{ quantidade: 100, dataEfetiva: '2026-09-01' }],
      }),
    );
    expect(result.recebimentosAteH).toBe(100);
    expect(result.projetadoEmH).toBeCloseTo(20 - demanda + 100, 5);
  });

  it('recebimento depois de H não conta', () => {
    const result = calc.calculate(
      base({
        recebimentos: [{ quantidade: 999, dataEfetiva: '2026-09-08' }], // offset 8 > 7
      }),
    );
    expect(result.recebimentosAteH).toBe(0);
  });

  it('atrasado (efetiva = hoje) conta no dia 0', () => {
    const result = calc.calculate(
      base({
        estoque: 20,
        recebimentos: [{ quantidade: 50, dataEfetiva: '2026-08-31' }],
      }),
    );
    expect(result.recebimentosAteH).toBe(50);
    expect(result.projetadoEmH).toBeCloseTo(20 - demanda + 50, 5);
  });

  it('dois recebimentos somam nos offsets ≤ H', () => {
    const result = calc.calculate(
      base({
        recebimentos: [
          { quantidade: 40, dataEfetiva: '2026-09-01' },
          { quantidade: 60, dataEfetiva: '2026-09-03' },
        ],
      }),
    );
    expect(result.recebimentosAteH).toBe(100);
  });

  it('ruptura no caminho mesmo se lumped em H for positivo', () => {
    const result = calc.calculate(
      base({
        estoque: 50,
        consumoDiario: 100,
        recebimentos: [{ quantidade: 1000, dataEfetiva: '2026-09-06' }],
      }),
    );
    expect(result.projetadoEmH).toBeGreaterThan(0);
    expect(result.rupturaAntesLeadTime).toBe(true);
  });

  it('chegada amanhã evita ruptura no dia 0', () => {
    const result = calc.calculate(
      base({
        estoque: 50,
        consumoDiario: 100,
        recebimentos: [{ quantidade: 1000, dataEfetiva: '2026-09-01' }],
      }),
    );
    expect(result.rupturaAntesLeadTime).toBe(false);
  });
});

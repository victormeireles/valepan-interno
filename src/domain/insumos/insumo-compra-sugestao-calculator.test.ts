import { describe, expect, it } from 'vitest';
import { DIAS_UTEIS_POR_SEMANA } from './insumo-compra-dia-operacional';
import { InsumoCompraSugestaoCalculator } from './insumo-compra-sugestao-calculator';

describe('InsumoCompraSugestaoCalculator', () => {
  const calc = new InsumoCompraSugestaoCalculator();

  function base(overrides: Partial<Parameters<InsumoCompraSugestaoCalculator['calculate']>[0]> = {}) {
    return {
      estoque: 0,
      consumoDiario: 100, // dia útil
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer' as const,
      diasSemana: null,
      dayOfWeek: 1, // segunda
      temRegraAtiva: true,
      ...overrides,
    };
  }

  it('lead 7d: demanda = media semanal (equiv. modelo antigo media/7 * 7)', () => {
    const r = 100;
    const media = r * DIAS_UTEIS_POR_SEMANA; // 550
    const result = calc.calculate(base({ consumoDiario: r, estoque: 0, leadTimeDias: 7 }));
    expect(result.metaEstoque).toBeCloseTo(media * 1.5, 5);
    expect(result.quantidadeSugerida).toBeCloseTo(media * 1.5, 5);
    expect(result.status).toBe('urgente');
  });

  it('lead 3d quinta demanda > lead 3d sexta', () => {
    const r = 100;
    const qui = calc.calculate(base({ consumoDiario: r, leadTimeDias: 3, dayOfWeek: 4, estoque: 0 }));
    const sex = calc.calculate(base({ consumoDiario: r, leadTimeDias: 3, dayOfWeek: 5, estoque: 0 }));
    // qui: 2.5 * r * 1.5 = 375; sex: 1.5 * r * 1.5 = 225
    expect(qui.metaEstoque!).toBeGreaterThan(sex.metaEstoque!);
    expect(qui.metaEstoque).toBeCloseTo(375, 5);
    expect(sex.metaEstoque).toBeCloseTo(225, 5);
    // ambos > media/7 * 3 * 1.5 se comparássemos quinta com calendário puro
    const antigo3 = (r * DIAS_UTEIS_POR_SEMANA) / 7 * 3 * 1.5;
    expect(qui.metaEstoque!).toBeGreaterThan(antigo3);
  });

  it('cobertura calendário < L → urgente', () => {
    // r=100, estoque=200 a partir de seg → 2,0 d < L=7
    const result = calc.calculate(base({ estoque: 200, consumoDiario: 100, leadTimeDias: 7 }));
    expect(result.status).toBe('urgente');
    expect(result.coberturaAtualDias).toBeCloseTo(2, 5);
  });

  it('cobertura >= L com reposição → pedir_hoje', () => {
    // estoque alto o bastante para >=7d calendário; meta = 550*1.5=825
    const result = calc.calculate(
      base({ estoque: 700, consumoDiario: 100, leadTimeDias: 7, dayOfWeek: 1 }),
    );
    expect(result.coberturaAtualDias!).toBeGreaterThanOrEqual(7);
    expect(result.status).toBe('pedir_hoje');
    expect(result.quantidadeSugerida).toBeCloseTo(825 - 700, 5);
  });

  it('estoque na meta → ok', () => {
    const meta = 100 * DIAS_UTEIS_POR_SEMANA * 1.5;
    const result = calc.calculate(base({ estoque: meta, consumoDiario: 100 }));
    expect(result.status).toBe('ok');
    expect(result.quantidadeSugerida).toBeNull();
  });

  it('fora da janela com cobertura suficiente → ok', () => {
    const result = calc.calculate(
      base({
        estoque: 5000,
        consumoDiario: 100,
        leadTimeDias: 7,
        janelaTipo: 'dias_semana',
        diasSemana: [1],
        dayOfWeek: 2,
      }),
    );
    expect(result.status).toBe('ok');
  });

  it('fora da janela e cobertura < W+L → pedir_fora_janela', () => {
    // estoque=400 a partir de terça → cobertura=4 (>= L=3 e < W+L=9)
    const result = calc.calculate(
      base({
        estoque: 400,
        consumoDiario: 100,
        leadTimeDias: 3,
        janelaTipo: 'dias_semana',
        diasSemana: [1],
        dayOfWeek: 2,
      }),
    );
    expect(result.status).toBe('pedir_fora_janela');
  });

  it('adiar quando qtd < min e cobertura aguenta esperar o lote', () => {
    // L=3 → meta=450; estoque=400 → bruta=50 < min 100
    // cobertura=4; diasAteLote(50)=0.5; necessário=3.5 → adiar
    const result = calc.calculate(
      base({
        estoque: 400,
        consumoDiario: 100,
        leadTimeDias: 3,
        quantidadeMinima: 100,
        dayOfWeek: 1,
      }),
    );
    expect(result.status).toBe('adiar_lote_minimo');
    expect(result.quantidadeSugerida).toBeCloseTo(50, 5);
  });

  it('aplica máximo como teto', () => {
    const result = calc.calculate(
      base({ estoque: 0, consumoDiario: 100, leadTimeDias: 7, quantidadeMaxima: 200 }),
    );
    expect(result.status).toBe('urgente');
    expect(result.quantidadeSugerida).toBe(200);
  });

  it('sem consumo → sem_consumo', () => {
    const result = calc.calculate(base({ consumoDiario: 0, estoque: 100 }));
    expect(result.status).toBe('sem_consumo');
  });

  it('sem regra → sem_regra', () => {
    const result = calc.calculate(base({ temRegraAtiva: false }));
    expect(result.status).toBe('sem_regra');
  });
});

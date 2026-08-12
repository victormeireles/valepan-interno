import { describe, expect, it } from 'vitest';
import { InsumoCompraSugestaoCalculator } from './insumo-compra-sugestao-calculator';

describe('InsumoCompraSugestaoCalculator', () => {
  const calc = new InsumoCompraSugestaoCalculator();

  it('kanban: L=7, estoque=3.5*consumo → qtd ≈ 7*consumo e urgente', () => {
    const consumo = 100;
    const result = calc.calculate({
      estoque: 3.5 * consumo,
      consumoDiario: consumo,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('urgente');
    expect(result.quantidadeSugerida).toBeCloseTo(7 * consumo, 5);
  });

  it('cobertura >= L com reposição necessária → pedir_hoje', () => {
    const result = calc.calculate({
      estoque: 800,
      consumoDiario: 100,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('pedir_hoje');
    expect(result.coberturaAtualDias).toBeCloseTo(8, 5);
    expect(result.quantidadeSugerida).toBeCloseTo(250, 5);
  });

  it('kanban: estoque na meta → ok', () => {
    const consumo = 100;
    const result = calc.calculate({
      estoque: 10.5 * consumo,
      consumoDiario: consumo,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('ok');
    expect(result.quantidadeSugerida).toBeNull();
  });

  it('cobertura < L → urgente', () => {
    const result = calc.calculate({
      estoque: 200,
      consumoDiario: 100,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('urgente');
    expect(result.coberturaAtualDias).toBeCloseTo(2, 5);
  });

  it('fora da janela com cobertura suficiente → ok (não pedir)', () => {
    const consumo = 100;
    const result = calc.calculate({
      estoque: 20 * consumo,
      consumoDiario: consumo,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'dias_semana',
      diasSemana: [1],
      dayOfWeek: 2,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('ok');
  });

  it('fora da janela e cobertura < W+L → pedir_fora_janela', () => {
    const result = calc.calculate({
      estoque: 800,
      consumoDiario: 100,
      leadTimeDias: 3,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'dias_semana',
      diasSemana: [1],
      dayOfWeek: 2,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('pedir_fora_janela');
  });

  it('adiar quando qtd < min e cobertura >= L', () => {
    const result = calc.calculate({
      estoque: 900,
      consumoDiario: 100,
      leadTimeDias: 7,
      quantidadeMinima: 300,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('adiar_lote_minimo');
    expect(result.quantidadeSugerida).toBeCloseTo(150, 5);
  });

  it('aplica máximo como teto', () => {
    const result = calc.calculate({
      estoque: 0,
      consumoDiario: 100,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: 200,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('urgente');
    expect(result.quantidadeSugerida).toBe(200);
  });

  it('sem consumo → sem_consumo', () => {
    const result = calc.calculate({
      estoque: 100,
      consumoDiario: 0,
      leadTimeDias: 7,
      quantidadeMinima: null,
      quantidadeMaxima: null,
      janelaTipo: 'qualquer',
      diasSemana: null,
      dayOfWeek: 1,
      temRegraAtiva: true,
    });
    expect(result.status).toBe('sem_consumo');
  });
});

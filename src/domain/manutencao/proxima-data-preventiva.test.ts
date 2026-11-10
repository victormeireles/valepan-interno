import { describe, expect, it } from 'vitest';
import { ProximaDataPreventiva } from './proxima-data-preventiva';

describe('ProximaDataPreventiva', () => {
  const proxima = new ProximaDataPreventiva();

  it('avança a cada N dias até o menor múltiplo depois de hoje', () => {
    expect(
      proxima.depoisDeHoje(
        { tipo: 'a_cada_n_dias', intervalo: 7, ancora: '2026-11-01' },
        '2026-11-09',
      ),
    ).toBe('2026-11-15');
  });

  it('pula a âncora quando hoje cai exatamente nela', () => {
    expect(
      proxima.depoisDeHoje(
        { tipo: 'a_cada_n_dias', intervalo: 7, ancora: '2026-11-01' },
        '2026-11-08',
      ),
    ).toBe('2026-11-15');
  });

  it('atravessa o fim do mês ao somar o intervalo', () => {
    expect(
      proxima.depoisDeHoje(
        { tipo: 'a_cada_n_dias', intervalo: 1, ancora: '2026-01-31' },
        '2026-01-31',
      ),
    ).toBe('2026-02-01');
  });

  it('mantém a âncora futura como próximo encaixe', () => {
    expect(
      proxima.depoisDeHoje(
        { tipo: 'a_cada_n_dias', intervalo: 7, ancora: '2026-11-20' },
        '2026-11-09',
      ),
    ).toBe('2026-11-20');
  });

  it('escolhe a próxima segunda quando hoje é domingo', () => {
    expect(
      proxima.depoisDeHoje({ tipo: 'semanal', diaSemana: 1 }, '2026-11-08'),
    ).toBe('2026-11-09');
  });

  it('empurra a semana quando hoje já é o dia escolhido', () => {
    expect(
      proxima.depoisDeHoje({ tipo: 'semanal', diaSemana: 1 }, '2026-11-09'),
    ).toBe('2026-11-16');
  });

  it('empurra o dia do mês para o mês seguinte quando hoje já é esse dia', () => {
    expect(
      proxima.depoisDeHoje({ tipo: 'mensal', diaMes: 10 }, '2026-11-10'),
    ).toBe('2026-12-10');
  });

  it('mantém o dia do mês neste mês quando ele ainda não chegou', () => {
    expect(
      proxima.depoisDeHoje({ tipo: 'mensal', diaMes: 10 }, '2026-11-09'),
    ).toBe('2026-11-10');
  });

  it('vira o ano no mensal de dezembro', () => {
    expect(
      proxima.depoisDeHoje({ tipo: 'mensal', diaMes: 10 }, '2026-12-10'),
    ).toBe('2027-01-10');
  });

  it('reconhece datas da grade a cada N dias, inclusive a âncora', () => {
    const freq = { tipo: 'a_cada_n_dias' as const, intervalo: 7, ancora: '2026-11-01' };
    expect(proxima.encaixa(freq, '2026-11-01')).toBe(true);
    expect(proxima.encaixa(freq, '2026-11-15')).toBe(true);
    expect(proxima.encaixa(freq, '2026-11-09')).toBe(false);
    expect(proxima.encaixa(freq, '2026-10-25')).toBe(false);
  });

  it('reconhece o dia da semana de segunda a domingo', () => {
    const segunda = { tipo: 'semanal' as const, diaSemana: 1 };
    const domingo = { tipo: 'semanal' as const, diaSemana: 7 };
    expect(proxima.encaixa(segunda, '2026-11-09')).toBe(true);
    expect(proxima.encaixa(segunda, '2026-11-08')).toBe(false);
    expect(proxima.encaixa(domingo, '2026-11-08')).toBe(true);
  });

  it('reconhece o dia do mês', () => {
    const freq = { tipo: 'mensal' as const, diaMes: 10 };
    expect(proxima.encaixa(freq, '2026-12-10')).toBe(true);
    expect(proxima.encaixa(freq, '2026-11-11')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { FluxoPrevistoHora } from './fluxo-previsto-hora';
import type { FluxoControleOpInput } from './fluxo-controle-types';

const DATE = '2026-08-17';
const hora = new FluxoPrevistoHora();

function iso(clock: string): string {
  return new Date(brazilClockUtcMs(DATE, clock)).toISOString();
}

function op(): FluxoControleOpInput {
  return {
    id: 'op-1',
    ordemPlanejamento: 1,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    unidades: 200,
    assadeiras: 200,
    caixas: 20,
    fermentacaoInicioPrevisto: iso('10:00'),
    fermentacaoFimPrevisto: iso('12:00'),
    fornoInicioPrevisto: iso('13:00'),
    fornoFimPrevisto: iso('14:00'),
    camaraFimPrevisto: iso('13:00'),
    resfriamentoFimPrevisto: iso('15:00'),
    embalagemInicioPrevisto: iso('15:00'),
    embalagemFimPrevisto: iso('16:00'),
  };
}

describe('FluxoPrevistoHora', () => {
  it('OP 10:00–12:00 com 200 un → 100 na hora 10 e 100 na 11', () => {
    const row = op();
    expect(hora.rateioOpHora(row, 'ferm', DATE, 10)).toBe(100);
    expect(hora.rateioOpHora(row, 'ferm', DATE, 11)).toBe(100);
    expect(hora.rateioOpHora(row, 'ferm', DATE, 9)).toBe(0);
    expect(hora.rateioOpHora(row, 'ferm', DATE, 12)).toBe(0);
  });

  it('preenche matrizPrevisto na assadeira da OP', () => {
    const matriz = hora.buildMatriz([op()], ['Bun'], DATE);
    expect(matriz.ferm.Bun[10]).toBe(100);
    expect(matriz.ferm.Bun[11]).toBe(100);
  });
});

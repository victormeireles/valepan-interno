import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { FluxoPrevistoAcumulado } from './fluxo-previsto-acumulado';
import type { FluxoControleOpInput } from './fluxo-controle-types';

const DATE = '2026-08-17';
const acc = new FluxoPrevistoAcumulado();

function iso(clock: string): string {
  return new Date(brazilClockUtcMs(DATE, clock)).toISOString();
}

function op(over: Partial<FluxoControleOpInput> = {}): FluxoControleOpInput {
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
    ...over,
  };
}

describe('FluxoPrevistoAcumulado', () => {
  it('antes do início = 0; depois do fim = volume; no meio interpola', () => {
    const row = op();
    expect(acc.volumeOp(row, 'ferm', brazilClockUtcMs(DATE, '09:00'), 'lt')).toBe(0);
    expect(acc.volumeOp(row, 'ferm', brazilClockUtcMs(DATE, '12:00'), 'lt')).toBe(200);
    expect(acc.volumeOp(row, 'ferm', brazilClockUtcMs(DATE, '11:00'), 'lt')).toBe(100);
  });

  it('duração 0 entrega o volume no instante do início', () => {
    const row = op({
      fermentacaoInicioPrevisto: iso('10:00'),
      fermentacaoFimPrevisto: iso('10:00'),
    });
    expect(acc.volumeOp(row, 'ferm', brazilClockUtcMs(DATE, '09:59'), 'lt')).toBe(0);
    expect(acc.volumeOp(row, 'ferm', brazilClockUtcMs(DATE, '10:00'), 'lt')).toBe(200);
  });

  it('soma várias OPs no asOf', () => {
    const a = op({ id: 'a', unidades: 200 });
    const b = op({
      id: 'b',
      unidades: 100,
      fermentacaoInicioPrevisto: iso('11:00'),
      fermentacaoFimPrevisto: iso('12:00'),
    });
    expect(acc.somaEtapa([a, b], 'ferm', brazilClockUtcMs(DATE, '11:00'), 'lt')).toBe(100);
  });

  it('embalagem: mesma fração em LT e CX (100 LT / 33 CX no meio da janela)', () => {
    const row = op({ assadeiras: 100, caixas: 33 });
    const asOf = brazilClockUtcMs(DATE, '15:30');
    expect(acc.volumeOp(row, 'emb', asOf, 'lt')).toBe(50);
    expect(acc.volumeOp(row, 'emb', asOf, 'cx')).toBe(16.5);
  });
});

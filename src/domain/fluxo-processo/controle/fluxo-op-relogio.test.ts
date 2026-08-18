import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { FluxoOpRelogio } from './fluxo-op-relogio';
import type { FluxoControleOpInput } from './fluxo-controle-types';

const DATE = '2026-08-17';
const relogio = new FluxoOpRelogio();

function iso(clock: string): string {
  return new Date(brazilClockUtcMs(DATE, clock)).toISOString();
}

function baseOp(id: string, ordem: number, un: number): FluxoControleOpInput {
  return {
    id,
    ordemPlanejamento: ordem,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    unidades: un,
    assadeiras: un,
    caixas: Math.max(1, Math.round(un / 24)),
    fermentacaoInicioPrevisto: iso('08:00'),
    fermentacaoFimPrevisto: iso('09:00'),
    fornoInicioPrevisto: iso('10:00'),
    fornoFimPrevisto: iso('11:00'),
    camaraFimPrevisto: iso('10:00'),
    resfriamentoFimPrevisto: iso('12:00'),
    embalagemInicioPrevisto: iso('13:00'),
    embalagemFimPrevisto: iso('14:00'),
  };
}

describe('FluxoOpRelogio', () => {
  it('ferm usa max(produzidoEm) do lote da OP', () => {
    const ops = [baseOp('a', 1, 200)];
    const items = relogio.porLote(ops, [
      { ordemProducaoId: 'a', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('08:10'), dataOp: DATE },
      { ordemProducaoId: 'a', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 120, produzidoEm: iso('08:55'), dataOp: DATE },
    ], 'ferm');
    expect(items[0].realizadoFimIso).toBe(iso('08:55'));
    expect(items[0].status).toBe('ok');
  });

  it('FIFO emb: primeira OP fecha no evento que completa o volume', () => {
    const ops = [baseOp('a', 1, 100), baseOp('b', 2, 100)];
    const items = relogio.porFifoEmbalagem(ops, [
      { produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 60, produzidoEm: iso('15:00'), dataOp: DATE },
      { produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('15:10'), dataOp: DATE },
      { produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 90, produzidoEm: iso('15:40'), dataOp: DATE },
    ]);
    expect(items[0].realizadoFimIso).toBe(iso('15:10'));
    expect(items[1].realizadoFimIso).toBe(iso('15:40'));
  });
});

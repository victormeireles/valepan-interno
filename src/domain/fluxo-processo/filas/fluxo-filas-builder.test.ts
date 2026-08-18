import { describe, expect, it } from 'vitest';
import { brazilDayEndUtcMs } from '@/lib/utils/date-utils';
import { FluxoFilasBuilder } from './fluxo-filas-builder';
import type { FluxoFilasBuilderInput, FluxoFilasOpInput } from './fluxo-filas-types';

const DATE = '2026-08-12';
const builder = new FluxoFilasBuilder();

function iso(hhmm: string): string {
  return `${DATE}T${hhmm}:00-03:00`;
}

function op(partial: Partial<FluxoFilasOpInput> & Pick<FluxoFilasOpInput, 'id'>): FluxoFilasOpInput {
  return {
    ordemPlanejamento: 1,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    unidades: 100,
    ...partial,
  };
}

function baseInput(overrides: Partial<FluxoFilasBuilderInput> = {}): FluxoFilasBuilderInput {
  return {
    ops: [op({ id: 'op-1' })],
    eventosFerm: [],
    eventosForno: [],
    eventosEmb: [],
    camaraMin: 180,
    resfrioMin: 60,
    asOfMs: Date.parse(iso('12:00')),
    ...overrides,
  };
}

describe('FluxoFilasBuilder', () => {
  it('OP sem fermentação entra em a produzir', () => {
    const result = builder.build(baseInput());
    expect(result?.aProduzir.totalUn).toBe(100);
    expect(result?.aProduzir.items).toHaveLength(1);
    expect(result?.fermentando.totalUn).toBe(0);
    expect(result?.resfriando.totalUn).toBe(0);
  });

  it('fermentando = ferm - forno', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 40, produzidoEm: iso('09:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(0);
    expect(result?.fermentando.totalUn).toBe(60);
  });

  it('marca preso quando último lote ferm + camaraMin < asOf', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')), // 6h depois > 180min
      }),
    );
    expect(result?.fermentando.presoUn).toBe(100);
    expect(result?.fermentando.items[0].presoMin).toBe(180);
  });

  it('não marca preso dentro do prazo de câmara', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 100, produzidoEm: iso('11:30'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.fermentando.presoUn).toBe(0);
    expect(result?.fermentando.items[0].preso).toBe(false);
  });

  it('novo lote ferm zera preso', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('06:00'), dataOp: DATE },
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 50, produzidoEm: iso('11:50'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.fermentando.presoUn).toBe(0);
  });

  it('resfriando = forno - emb FIFO', () => {
    const result = builder.build(
      baseInput({
        ops: [
          op({ id: 'op-1', unidades: 100, ordemPlanejamento: 1 }),
          op({ id: 'op-2', unidades: 50, ordemPlanejamento: 2, produtoNome: 'HB' }),
        ],
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('10:00'), dataOp: DATE },
        ],
        eventosEmb: [
          { produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 30, produzidoEm: iso('11:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.resfriando.items.find((i) => i.ordemProducaoId === 'op-1')?.volumeUn).toBe(50);
  });

  it('marca preso em resfriando', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        eventosForno: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 80, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
        asOfMs: Date.parse(iso('12:00')),
      }),
    );
    expect(result?.resfriando.presoUn).toBe(80);
  });

  it('OP iniciada não entra em a produzir com saldo restante', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 100 })],
        eventosFerm: [
          { ordemProducaoId: 'op-1', produtoNome: 'Bun', assadeiraNome: 'Bun', unidades: 20, produzidoEm: iso('06:00'), dataOp: DATE },
        ],
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(0);
  });

  it('retorna null sem OPs', () => {
    expect(builder.build(baseInput({ ops: [] }))).toBeNull();
  });

  it('dia passado: asOf no fim do dia civil marca preso se limite já passou', () => {
    const eventosFerm = [
      {
        ordemProducaoId: 'op-1',
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 100,
        produzidoEm: iso('20:00'),
        dataOp: DATE,
      },
    ];
    const noFim = builder.build(
      baseInput({ eventosFerm, asOfMs: brazilDayEndUtcMs(DATE) }),
    );
    expect(noFim?.fermentando.items[0].preso).toBe(true);

    const antesDoLimite = builder.build(
      baseInput({ eventosFerm, asOfMs: Date.parse(iso('22:00')) }),
    );
    expect(antesDoLimite?.fermentando.items[0].preso).toBe(false);
  });
});

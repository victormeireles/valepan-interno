import { describe, expect, it } from 'vitest';
import { brazilDayEndUtcMs } from '@/lib/utils/date-utils';
import { FluxoFilasBuilder } from './fluxo-filas-builder';
import type { FluxoFilaItem, FluxoFilasBuilderInput, FluxoFilasOpInput } from './fluxo-filas-types';

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
    observacao: '',
    unidades: 100,
    latas: 0,
    caixas: 0,
    dataProducao: DATE,
    fermentacaoFinalizada: false,
    fornoFinalizada: false,
    embalagemFinalizada: false,
    ...partial,
  };
}

function ev(opId: string, unidades: number, hhmm: string) {
  return {
    ordemProducaoId: opId,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    unidades,
    produzidoEm: iso(hhmm),
    dataOp: DATE,
  };
}

function baseInput(overrides: Partial<FluxoFilasBuilderInput> = {}): FluxoFilasBuilderInput {
  return {
    ops: [op({ id: 'op-1' })],
    opsAnteriores: [],
    eventosFerm: [],
    eventosForno: [],
    eventosEmb: [],
    camaraMin: 180,
    resfrioMin: 60,
    asOfMs: Date.parse(iso('12:00')),
    ...overrides,
  };
}

/** 100 planejado, 80 ferm, 60 forno, 50 emb. */
function parcialFechavel(flags: Partial<FluxoFilasOpInput> = {}): FluxoFilasBuilderInput {
  return baseInput({
    ops: [op({ id: 'op-1', unidades: 100, ...flags })],
    eventosFerm: [ev('op-1', 80, '06:00')],
    eventosForno: [ev('op-1', 60, '10:00')],
    eventosEmb: [ev('op-1', 50, '11:00')],
  });
}

function somaUn(items: FluxoFilaItem[]): number {
  return items.reduce((t, i) => t + i.volumeUn, 0);
}

function perdasPorOrigem(items: FluxoFilaItem[]) {
  return {
    fermentacao: somaUn(items.filter((i) => i.perdaOrigem === 'fermentacao')),
    forno: somaUn(items.filter((i) => i.perdaOrigem === 'forno')),
    embalagem: somaUn(items.filter((i) => i.perdaOrigem === 'embalagem')),
  };
}

describe('FluxoFilasBuilder perdas por etapa fechada', () => {
  it('etapas abertas não geram perdas', () => {
    const result = builder.build(parcialFechavel());
    expect(result?.aProduzir.totalUn).toBe(20);
    expect(result?.fermentando.totalUn).toBe(20);
    expect(result?.resfriando.totalUn).toBe(10);
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.perdas.totalUn).toBe(0);
  });

  it('embalagem fechada tira o saldo de resfriando e manda para perdas', () => {
    const result = builder.build(parcialFechavel({ embalagemFinalizada: true }));
    expect(result?.resfriando.totalUn).toBe(0);
    expect(result?.fermentando.totalUn).toBe(20);
    expect(result?.aProduzir.totalUn).toBe(20);
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.perdas.totalUn).toBe(10);
    expect(perdasPorOrigem(result?.perdas.items ?? [])).toEqual({
      fermentacao: 0,
      forno: 0,
      embalagem: 10,
    });
  });

  it('forno fechado tira o saldo de fermentando e manda para perdas', () => {
    const result = builder.build(parcialFechavel({ fornoFinalizada: true }));
    expect(result?.fermentando.totalUn).toBe(0);
    expect(result?.resfriando.totalUn).toBe(10);
    expect(result?.aProduzir.totalUn).toBe(20);
    expect(result?.perdas.totalUn).toBe(20);
    expect(perdasPorOrigem(result?.perdas.items ?? []).forno).toBe(20);
  });

  it('fermentação fechada tira o saldo a produzir e manda para perdas', () => {
    const result = builder.build(parcialFechavel({ fermentacaoFinalizada: true }));
    expect(result?.aProduzir.totalUn).toBe(0);
    expect(result?.fermentando.totalUn).toBe(20);
    expect(result?.resfriando.totalUn).toBe(10);
    expect(result?.perdas.totalUn).toBe(20);
    expect(perdasPorOrigem(result?.perdas.items ?? []).fermentacao).toBe(20);
  });

  it('três etapas fechadas não contam o mesmo volume duas vezes', () => {
    const result = builder.build(
      parcialFechavel({
        fermentacaoFinalizada: true,
        fornoFinalizada: true,
        embalagemFinalizada: true,
      }),
    );
    expect(result?.aProduzir.totalUn).toBe(0);
    expect(result?.fermentando.totalUn).toBe(0);
    expect(result?.resfriando.totalUn).toBe(0);
    expect(result?.embalado.totalUn).toBe(50);
    expect(result?.perdas.totalUn).toBe(50);
    expect(perdasPorOrigem(result?.perdas.items ?? [])).toEqual({
      fermentacao: 20,
      forno: 20,
      embalagem: 10,
    });
    const total =
      (result?.aProduzir.totalUn ?? 0) +
      (result?.fermentando.totalUn ?? 0) +
      (result?.resfriando.totalUn ?? 0) +
      (result?.embalado.totalUn ?? 0) +
      (result?.perdas.totalUn ?? 0);
    expect(total).toBe(100);
  });

  it('etapa fechada sem sobra não cria item de perda', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 80, embalagemFinalizada: true })],
        eventosFerm: [ev('op-1', 80, '06:00')],
        eventosForno: [ev('op-1', 80, '10:00')],
        eventosEmb: [ev('op-1', 80, '11:00')],
      }),
    );
    expect(result?.perdas.totalUn).toBe(0);
    expect(result?.perdas.items).toHaveLength(0);
    expect(result?.embalado.totalUn).toBe(80);
  });

  it('perda de embalagem não marca preso na fila de perdas', () => {
    const result = builder.build(
      baseInput({
        ops: [op({ id: 'op-1', unidades: 80, embalagemFinalizada: true })],
        eventosFerm: [ev('op-1', 80, '06:00')],
        eventosForno: [ev('op-1', 80, '06:00')],
        asOfMs: brazilDayEndUtcMs(DATE),
      }),
    );
    expect(result?.resfriando.totalUn).toBe(0);
    expect(result?.perdas.totalUn).toBe(80);
    expect(result?.perdas.presoUn).toBe(0);
    expect(result?.perdas.items[0]?.preso).toBe(false);
    expect(result?.perdas.items[0]?.perdaOrigem).toBe('embalagem');
  });
});

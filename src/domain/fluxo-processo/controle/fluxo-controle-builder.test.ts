import { describe, expect, it } from 'vitest';
import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import { FluxoControleBuilder } from './fluxo-controle-builder';
import type {
  FluxoControleBuilderInput,
  FluxoControleOpInput,
} from './fluxo-controle-types';

const DATE = '2026-08-17';
const PAST = '2026-08-16';
const builder = new FluxoControleBuilder();

function iso(dateISO: string, clock: string): string {
  return new Date(brazilClockUtcMs(dateISO, clock)).toISOString();
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
    fermentacaoInicioPrevisto: iso(DATE, '10:00'),
    fermentacaoFimPrevisto: iso(DATE, '12:00'),
    fornoInicioPrevisto: iso(DATE, '13:00'),
    fornoFimPrevisto: iso(DATE, '14:00'),
    camaraFimPrevisto: iso(DATE, '13:00'),
    resfriamentoFimPrevisto: iso(DATE, '15:00'),
    embalagemInicioPrevisto: iso(DATE, '15:00'),
    embalagemFimPrevisto: iso(DATE, '16:00'),
    ...over,
  };
}

function baseInput(
  over: Partial<FluxoControleBuilderInput> = {},
): FluxoControleBuilderInput {
  return {
    dateISO: DATE,
    todayISO: DATE,
    asOfMs: brazilClockUtcMs(DATE, '11:00'),
    ops: [op()],
    etapasVol: { ferm: 80, forno: 0, emb: 150 },
    opAnteriorVol: 50,
    ordemAss: ['Bun'],
    eventos: { ferm: [], forno: [], emb: [] },
    gapTotMin: { ferm: 0, forno: 0, emb: 0 },
    ativoMin: { ferm: 60, forno: 0, emb: 0 },
    produtividade: null,
    capacidadeContext: { avgUnPorLata: 24, avgUnPorCaixa: 48 },
    ...over,
  };
}

describe('FluxoControleBuilder', () => {
  it('dia passado força deveria = objetivo mesmo com asOf no meio do dia', () => {
    const result = builder.build(
      baseInput({
        dateISO: PAST,
        todayISO: DATE,
        asOfMs: brazilClockUtcMs(PAST, '11:00'),
        ops: [
          op({
            fermentacaoInicioPrevisto: iso(PAST, '10:00'),
            fermentacaoFimPrevisto: iso(PAST, '12:00'),
            fornoInicioPrevisto: iso(PAST, '13:00'),
            fornoFimPrevisto: iso(PAST, '14:00'),
            camaraFimPrevisto: iso(PAST, '13:00'),
            resfriamentoFimPrevisto: iso(PAST, '15:00'),
            embalagemInicioPrevisto: iso(PAST, '15:00'),
            embalagemFimPrevisto: iso(PAST, '16:00'),
          }),
        ],
      }),
    );

    expect(result.disponivel).toBe(true);
    expect(result.etapas.ferm.objetivoUn).toBe(200);
    expect(result.etapas.ferm.deveriaUn).toBe(200);
    expect(result.etapas.forno.deveriaUn).toBe(200);
    expect(result.etapas.emb.deveriaUn).toBe(20);
    expect(result.etapas.emb.deveriaLt).toBe(200);
    expect(result.etapas.emb.objetivoLt).toBe(200);
  });

  it('hoje interpola deveria no asOf', () => {
    const result = builder.build(baseInput());

    expect(result.etapas.ferm.objetivoUn).toBe(200);
    expect(result.etapas.ferm.deveriaUn).toBe(100);
    expect(result.etapas.ferm.estaUn).toBe(80);
  });

  it('emb desconta opAnterior do está', () => {
    const result = builder.build(baseInput());

    expect(result.etapas.emb.estaUn).toBe(100);
    expect(result.etapas.ferm.estaUn).toBe(80);
  });

  it('sem ops → indisponível', () => {
    const result = builder.build(
      baseInput({
        ops: [],
        etapasVol: { ferm: 0, forno: 0, emb: 0 },
        opAnteriorVol: 0,
      }),
    );

    expect(result.disponivel).toBe(false);
    expect(result.etapas.ferm.objetivoUn).toBe(0);
    expect(result.etapas.ferm.deveriaUn).toBe(0);
    expect(result.etapas.ferm.estaUn).toBe(0);
    expect(result.relogio.ferm).toEqual([]);
    expect(result.relogio.forno).toEqual([]);
    expect(result.relogio.emb).toEqual([]);
    expect(result.embalagemFifo).toBe(true);
  });
});

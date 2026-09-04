import { describe, expect, it } from 'vitest';
import type {
  FluxoFilaItem,
  FluxoFilaResumo,
  FluxoFilasDia,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import { PainelEtapaTvFilaAggregator } from './painel-etapa-tv-fila-aggregator';
import { PainelEtapaTvFilaPicker } from './painel-etapa-tv-fila-picker';
import type {
  PainelEtapaTvFilaLtConverter,
  PainelEtapaTvFilaOp,
} from './painel-etapa-tv-fila-op';

const UN_POR_LATA = 24;

const converter: PainelEtapaTvFilaLtConverter = {
  unToLt(unidades: number) {
    return unidades / UN_POR_LATA;
  },
};

function item(over: Partial<FluxoFilaItem> & Pick<FluxoFilaItem, 'ordemProducaoId'>): FluxoFilaItem {
  return {
    ordemPlanejamento: 1,
    produtoNome: 'Brioche 90g',
    assadeiraNome: '65g verde',
    observacao: '',
    volumeUn: 240,
    preso: false,
    presoMin: null,
    naFilaMin: 30,
    ultimoLoteEm: '2026-09-04T10:00:00.000Z',
    dataOp: '2026-09-04',
    origem: 'op_do_dia',
    perdaOrigem: null,
    ...over,
  };
}

function resumo(items: FluxoFilaItem[]): FluxoFilaResumo {
  return {
    totalUn: items.reduce((t, i) => t + i.volumeUn, 0),
    anteriorUn: 0,
    presoUn: items.filter((i) => i.preso).reduce((t, i) => t + i.volumeUn, 0),
    items,
    ultimoLote: null,
  };
}

function filas(partial: Partial<FluxoFilasDia>): FluxoFilasDia {
  const empty = resumo([]);
  return {
    aProduzir: empty,
    fermentando: empty,
    resfriando: empty,
    embalado: empty,
    perdas: empty,
    ...partial,
  };
}

function opFila(over: Partial<PainelEtapaTvFilaOp>): PainelEtapaTvFilaOp {
  return {
    ordemId: 'a',
    produtoNome: 'Pão',
    assadeiraNome: 'Verde',
    observacao: '',
    prontoLt: 10,
    vindoLt: 0,
    feitoLt: 0,
    metaLt: null,
    oldestLoteEm: '2026-09-04T10:00:00.000Z',
    oldestNaFilaMin: 60,
    ...over,
  };
}

describe('PainelEtapaTvFilaAggregator', () => {
  it('forno: pronto = preso; vindo = relógio + a produzir; gate exige fermentando', () => {
    const dia = filas({
      fermentando: resumo([
        item({
          ordemProducaoId: 'op1',
          volumeUn: 480,
          preso: true,
          naFilaMin: 240,
          ultimoLoteEm: '2026-09-04T08:00:00.000Z',
        }),
        item({
          ordemProducaoId: 'op1',
          volumeUn: 240,
          preso: false,
          naFilaMin: 30,
          ultimoLoteEm: '2026-09-04T11:00:00.000Z',
        }),
      ]),
      aProduzir: resumo([
        item({
          ordemProducaoId: 'op1',
          volumeUn: 240,
          preso: false,
          ultimoLoteEm: null,
        }),
      ]),
    });
    const progresso = new Map([
      ['op1', { feitoLt: 30, metaLt: 100 }],
    ]);
    const got = PainelEtapaTvFilaAggregator.build(dia, 'forno', converter, progresso);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({
      ordemId: 'op1',
      prontoLt: 20,
      vindoLt: 20,
      feitoLt: 30,
      metaLt: 100,
      oldestLoteEm: '2026-09-04T08:00:00.000Z',
      oldestNaFilaMin: 240,
    });
  });

  it('forno: OP só em aProduzir (sem câmara) não entra', () => {
    const dia = filas({
      aProduzir: resumo([item({ ordemProducaoId: 'so-plano', volumeUn: 480 })]),
    });
    expect(PainelEtapaTvFilaAggregator.build(dia, 'forno', converter)).toEqual([]);
  });

  it('forno: pronto 0 com relógio ainda aparece', () => {
    const dia = filas({
      fermentando: resumo([
        item({
          ordemProducaoId: 'op2',
          volumeUn: 240,
          preso: false,
          ultimoLoteEm: '2026-09-04T12:00:00.000Z',
        }),
      ]),
    });
    const got = PainelEtapaTvFilaAggregator.build(dia, 'forno', converter);
    expect(got).toHaveLength(1);
    expect(got[0].prontoLt).toBe(0);
    expect(got[0].vindoLt).toBe(10);
  });

  it('embalagem: vindo inclui fermentando + aProduzir; feito vem do embalado', () => {
    const dia = filas({
      resfriando: resumo([
        item({
          ordemProducaoId: 'op3',
          volumeUn: 480,
          preso: true,
          ultimoLoteEm: '2026-09-04T09:00:00.000Z',
        }),
        item({
          ordemProducaoId: 'op3',
          volumeUn: 120,
          preso: false,
          ultimoLoteEm: '2026-09-04T11:30:00.000Z',
        }),
      ]),
      fermentando: resumo([
        item({ ordemProducaoId: 'op3', volumeUn: 240, preso: true }),
      ]),
      aProduzir: resumo([
        item({ ordemProducaoId: 'op3', volumeUn: 240 }),
      ]),
      embalado: resumo([
        item({ ordemProducaoId: 'op3', volumeUn: 720 }),
      ]),
    });
    const got = PainelEtapaTvFilaAggregator.build(
      dia,
      'embalagem',
      converter,
      new Map([['op3', { feitoLt: 0, metaLt: 50 }]]),
    );
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({
      ordemId: 'op3',
      prontoLt: 20,
      // relógio 120 + ferm 240 + aProduzir 240 = 600 un = 25 LT
      vindoLt: 25,
      feitoLt: 30,
      metaLt: 50,
    });
  });

  it('embalagem: sem resfriando não entra mesmo com fermentando', () => {
    const dia = filas({
      fermentando: resumo([item({ ordemProducaoId: 'op4', volumeUn: 480, preso: true })]),
    });
    expect(PainelEtapaTvFilaAggregator.build(dia, 'embalagem', converter)).toEqual([]);
  });

  it('inclui OP anterior e usa identidade do item da fila', () => {
    const dia = filas({
      fermentando: resumo([
        item({
          ordemProducaoId: 'op-ant',
          produtoNome: 'Hot Dog',
          assadeiraNome: '90g azul',
          origem: 'op_anterior',
          dataOp: '2026-09-03',
          volumeUn: 240,
          preso: true,
          ultimoLoteEm: '2026-09-03T20:00:00.000Z',
        }),
      ]),
    });
    const got = PainelEtapaTvFilaAggregator.build(dia, 'forno', converter);
    expect(got[0]).toMatchObject({
      ordemId: 'op-ant',
      produtoNome: 'Hot Dog',
      assadeiraNome: '90g azul',
      metaLt: null,
      feitoLt: 0,
    });
  });
});

describe('PainelEtapaTvFilaPicker', () => {
  it('ordena por lote mais antigo e corta em 3', () => {
    const got = PainelEtapaTvFilaPicker.pick([
      opFila({ ordemId: 'c', oldestLoteEm: '2026-09-04T12:00:00.000Z' }),
      opFila({ ordemId: 'a', oldestLoteEm: '2026-09-04T08:00:00.000Z' }),
      opFila({ ordemId: 'b', oldestLoteEm: '2026-09-04T09:00:00.000Z' }),
      opFila({ ordemId: 'd', oldestLoteEm: '2026-09-04T07:00:00.000Z' }),
    ]);
    expect(got.map((o) => o.ordemId)).toEqual(['d', 'a', 'b']);
  });

  it('vazio permanece vazio', () => {
    expect(PainelEtapaTvFilaPicker.pick([])).toEqual([]);
  });
});

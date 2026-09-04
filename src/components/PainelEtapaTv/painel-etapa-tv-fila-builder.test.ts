import { describe, expect, it } from 'vitest';
import { emptyMatrizEtapas } from '@/domain/fluxo-processo/fluxo-matriz-horaria';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';
import type {
  FluxoFilaItem,
  FluxoFilaResumo,
  FluxoFilasDia,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import { PainelEtapaTvFilaBuilder } from './painel-etapa-tv-fila-builder';

function item(over: Partial<FluxoFilaItem> & Pick<FluxoFilaItem, 'ordemProducaoId'>): FluxoFilaItem {
  return {
    ordemPlanejamento: 1,
    produtoNome: 'Brioche',
    assadeiraNome: '65g verde',
    observacao: '',
    volumeUn: 240,
    preso: true,
    presoMin: 10,
    naFilaMin: 190,
    ultimoLoteEm: '2026-09-04T08:00:00.000Z',
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

function miniFluxo(filas: FluxoFilasDia): VpFluxoPayload {
  const empty = emptyMatrizEtapas(['65g verde']);
  return {
    dia: '04/09/2026',
    diaLabel: 'sex 04/09',
    planoUn: 2400,
    etapas: [],
    padrao: { camaraMin: 180, resfrioMin: 60 },
    ordemAss: ['65g verde'],
    cores: { '65g verde': '#6B7233' },
    matriz: empty,
    matrizAnt: empty,
    assadeiras: [
      {
        nome: '65g verde',
        ferm: 240,
        forno: 0,
        emb: 0,
        embAnt: 0,
        unPorLata: 24,
        produtos: [],
        ondas: [],
      },
    ],
    lead: {
      fermForno: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
      fornoEmb: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
    },
    opAnterior: { un: 0, eventos: 0, volOperacional: 0 },
    trocas: { forno: 0 },
    unPorCaixaByProduto: {},
    produtividade: null,
    ritmoPorEtapa: null,
    controle: null,
    filas,
  };
}

describe('PainelEtapaTvFilaBuilder', () => {
  it('forno: top 3 FIFO com feito/meta das ordens em LT', () => {
    const filas: FluxoFilasDia = {
      aProduzir: resumo([]),
      fermentando: resumo([
        item({
          ordemProducaoId: 'op-b',
          ultimoLoteEm: '2026-09-04T10:00:00.000Z',
          volumeUn: 240,
        }),
        item({
          ordemProducaoId: 'op-a',
          ultimoLoteEm: '2026-09-04T07:00:00.000Z',
          volumeUn: 480,
        }),
        item({
          ordemProducaoId: 'op-c',
          ultimoLoteEm: '2026-09-04T11:00:00.000Z',
          volumeUn: 120,
        }),
        item({
          ordemProducaoId: 'op-d',
          ultimoLoteEm: '2026-09-04T12:00:00.000Z',
          volumeUn: 120,
        }),
      ]),
      resfriando: resumo([]),
      embalado: resumo([]),
      perdas: resumo([]),
    };
    const ordens = [
      {
        ordemProducaoId: 'op-a',
        produzido: 12,
        metaEfetiva: 40,
      },
    ] as PainelOrdemEtapa[];

    const got = PainelEtapaTvFilaBuilder.fromFluxo(
      'forno',
      miniFluxo(filas),
      filas,
      ordens,
      [],
    );
    expect(got.map((o) => o.ordemId)).toEqual(['op-a', 'op-b', 'op-c']);
    expect(got[0]).toMatchObject({
      prontoLt: 20,
      feitoLt: 12,
      metaLt: 40,
    });
  });
});

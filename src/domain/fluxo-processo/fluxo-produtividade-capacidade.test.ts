import { describe, expect, it } from 'vitest';

import {
  buildCapacidadeContext,
  fluxoProdutividadeCapacidade,
  type FluxoProdutividadeMeta,
} from './fluxo-produtividade-capacidade';
import type { VpFluxoPayload } from './fluxo-processo-types';

const META: FluxoProdutividadeMeta = {
  taxaAssadeirasHoraProducao: 200,
  taxaAssadeirasHoraForno: 200,
  taxaCaixasHoraEmbalagem: 80,
};

function fluxoBase(): VpFluxoPayload {
  return {
    dia: '17/08/2026',
    diaLabel: 'seg 17/08',
    planoUn: 2400,
    etapas: [],
    padrao: { camaraMin: 180, resfrioMin: 60 },
    ordemAss: ['65g verde'],
    cores: {},
    matriz: { ferm: {}, forno: {}, emb: {} },
    matrizAnt: { ferm: {}, forno: {}, emb: {} },
    assadeiras: [
      {
        nome: '65g verde',
        ferm: 2400,
        forno: 0,
        emb: 0,
        embAnt: 0,
        unPorLata: 24,
        produtos: [],
        ondas: [],
      },
    ],
    lead: {
      fermForno: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: [] },
      fornoEmb: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: [] },
    },
    opAnterior: { un: 0, eventos: 0, volOperacional: 0 },
    trocas: { forno: 0 },
    unPorCaixaByProduto: {},
    produtividade: META,
    ritmoPorEtapa: null,
    controle: null,
    filas: null,
  };
}

describe('FluxoProdutividadeCapacidade', () => {
  it('meta em LT usa taxa de assadeiras da planilha (200, não 400 fixo)', () => {
    const ctx = buildCapacidadeContext(fluxoBase());
    expect(
      fluxoProdutividadeCapacidade.displayCapacidade('ferm', 'lt', META, ctx),
    ).toBe(200);
    expect(
      fluxoProdutividadeCapacidade.displayCapacidade('forno', 'lt', META, ctx),
    ).toBe(200);
  });

  it('meta emb em CX usa taxa de caixas', () => {
    const ctx = buildCapacidadeContext(fluxoBase());
    expect(
      fluxoProdutividadeCapacidade.displayCapacidade('emb', 'cx', META, ctx),
    ).toBe(80);
  });

  it('capacidadeUnHora converte ass/h e cx/h para un/h', () => {
    const ctx = buildCapacidadeContext(fluxoBase());
    expect(
      fluxoProdutividadeCapacidade.capacidadeUnHora('ferm', META, ctx),
    ).toBe(200 * 24);
    expect(
      fluxoProdutividadeCapacidade.capacidadeUnHora('emb', META, ctx),
    ).toBe(80 * 48);
  });
});

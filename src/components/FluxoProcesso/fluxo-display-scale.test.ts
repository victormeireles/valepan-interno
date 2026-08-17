import { describe, expect, it } from 'vitest';

import {
  FluxoDisplayScale,
  fmtQtyExact,
} from '@/components/FluxoProcesso/fluxo-display-scale';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

function miniFluxo(): VpFluxoPayload {
  return {
    dia: '12/08/2026',
    diaLabel: 'qua 12/08',
    planoUn: 2400,
    etapas: [
      {
        key: 'ferm',
        nome: 'Fermentação',
        un: 2400,
        ini: 60,
        fim: 120,
        span: 60,
        gaps: [],
        gapTot: 0,
        ativo: 60,
        eventos: 2,
        blocoPct: 0,
        blocoLancamentos: [],
      },
      {
        key: 'forno',
        nome: 'Forno',
        un: 1200,
        ini: 0,
        fim: 0,
        span: 0,
        gaps: [],
        gapTot: 0,
        ativo: 0,
        eventos: 0,
        blocoPct: 0,
        blocoLancamentos: [],
      },
      {
        key: 'emb',
        nome: 'Embalagem',
        un: 480,
        ini: 0,
        fim: 0,
        span: 0,
        gaps: [],
        gapTot: 0,
        ativo: 0,
        eventos: 0,
        blocoPct: 0,
        blocoLancamentos: [],
      },
    ],
    padrao: { camaraMin: 180, resfrioMin: 60 },
    ordemAss: ['65g verde'],
    cores: { '65g verde': '#6B7233' },
    matriz: {
      ferm: { '65g verde': [0, 2400, ...Array(22).fill(0)] },
      forno: { '65g verde': [0, 0, 0, 1200, ...Array(20).fill(0)] },
      emb: { '65g verde': [480, ...Array(23).fill(0)] },
    },
    matrizAnt: {
      ferm: { '65g verde': Array(24).fill(0) },
      forno: { '65g verde': Array(24).fill(0) },
      emb: { '65g verde': [480, ...Array(23).fill(0)] },
    },
    assadeiras: [
      {
        nome: '65g verde',
        ferm: 2400,
        forno: 1200,
        emb: 480,
        embAnt: 480,
        unPorLata: 24,
        produtos: [],
        ondas: [],
      },
    ],
    lead: {
      fermForno: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
      fornoEmb: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
    },
    opAnterior: { un: 480, eventos: 1 },
    trocas: { forno: 0 },
    unPorCaixaByProduto: {},
  };
}

describe('FluxoDisplayScale', () => {
  it('converte unidades para LT pela assadeira', () => {
    const scale = new FluxoDisplayScale(miniFluxo(), 'lt');
    expect(scale.etapaTotal('ferm')).toBe(100);
    expect(scale.opAnteriorTotal()).toBe(20);
    expect(scale.celula('ferm', '65g verde', 1)).toBe(100);
    expect(scale.unitLabel).toBe('LT');
  });

  it('960 un ÷ 24 un/LT da assadeira da OP = 40 LT (não usa média do dia)', () => {
    const fluxo = miniFluxo();
    // Outra assadeira puxa a média para longe de 24
    fluxo.ordemAss = ['65g verde', '50g'];
    fluxo.assadeiras.push({
      nome: '50g',
      ferm: 5000,
      forno: 0,
      emb: 0,
      embAnt: 0,
      unPorLata: 20,
      produtos: [],
      ondas: [],
    });
    fluxo.matriz.ferm['50g'] = [5000, ...Array(23).fill(0)];
    fluxo.matriz.forno['50g'] = Array(24).fill(0);
    fluxo.matriz.emb['50g'] = Array(24).fill(0);
    fluxo.matrizAnt.ferm['50g'] = Array(24).fill(0);
    fluxo.matrizAnt.forno['50g'] = Array(24).fill(0);
    fluxo.matrizAnt.emb['50g'] = Array(24).fill(0);

    const scale = new FluxoDisplayScale(fluxo, 'lt');
    expect(scale.fromUn(960)).toBeGreaterThan(40); // média do dia ≠ 24
    expect(scale.fromUn(960, '65g verde')).toBe(40);
  });

  it('mantém unidades no modo un', () => {
    const scale = new FluxoDisplayScale(miniFluxo(), 'un');
    expect(scale.etapaTotal('ferm')).toBe(2400);
    expect(scale.unitLabel).toBe('un');
  });

  it('converte para CX só produtos com fator; ignora os demais', () => {
    const fluxo = miniFluxo();
    fluxo.unPorCaixaByProduto = { 'HB Brioche 65g': 48 };
    const horas = Array.from({ length: 24 }, () => 0);
    horas[1] = 2400;
    fluxo.assadeiras[0].produtos = [
      {
        nome: 'HB Brioche 65g',
        ferm: 2400,
        forno: 0,
        emb: 0,
        embAnt: 0,
        fermHoras: horas,
        fornoHoras: Array(24).fill(0),
        embHoras: Array(24).fill(0),
      },
      {
        nome: 'Sem caixa',
        ferm: 960,
        forno: 0,
        emb: 0,
        embAnt: 0,
        fermHoras: (() => {
          const h = Array.from({ length: 24 }, () => 0);
          h[1] = 960;
          return h;
        })(),
        fornoHoras: Array(24).fill(0),
        embHoras: Array(24).fill(0),
      },
    ];
    const scale = new FluxoDisplayScale(fluxo, 'cx');
    expect(scale.unitLabel).toBe('CX');
    expect(scale.celula('ferm', '65g verde', 1)).toBe(50);
    expect(scale.temConversaoCaixa('Sem caixa')).toBe(false);
    expect(scale.fromUn(960, '65g verde', 'Sem caixa')).toBe(0);
  });
});

describe('fmtQtyExact', () => {
  it('mostra o volume completo em pt-BR, sem sufixo k', () => {
    expect(fmtQtyExact(2_347)).toBe('2.347');
    expect(fmtQtyExact(1_000)).toBe('1.000');
    expect(fmtQtyExact(42)).toBe('42');
  });
});

import { describe, expect, it } from 'vitest';

import { FluxoEtapaRitmoDisplay } from './fluxo-etapa-ritmo-display';
import { FluxoDisplayScale } from './fluxo-display-scale';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

const display = new FluxoEtapaRitmoDisplay();

function fluxoLt(): VpFluxoPayload {
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
    produtividade: null,
    controle: null,
    filas: null,
    ritmoPorEtapa: {
      ferm: { atual: 120, ontem: 120, semana: 148 },
      forno: { atual: 0, ontem: 0, semana: 0 },
      emb: { atual: 80, ontem: 100, semana: 80 },
    },
  };
}

describe('FluxoEtapaRitmoDisplay', () => {
  it('mostra LT/h em ferm e os deltas ontem/semana do painel', () => {
    const fluxo = fluxoLt();
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    const view = display.build(scale, fluxo, 'ferm');
    expect(view).toEqual({
      atual: 120,
      rateLabel: 'LT/h',
      deltaOntemPct: 0,
      deltaSemanaPct: -19,
    });
  });

  it('emb em CX/h: queda vs ontem, estável vs semana', () => {
    const fluxo = fluxoLt();
    const scale = new FluxoDisplayScale(fluxo, 'cx');
    const view = display.build(scale, fluxo, 'emb');
    expect(view.atual).toBe(80);
    expect(view.rateLabel).toBe('CX/h');
    expect(view.deltaOntemPct).toBe(-20);
    expect(view.deltaSemanaPct).toBe(0);
  });

  it('sem ritmo no payload não renderiza', () => {
    const fluxo = fluxoLt();
    fluxo.ritmoPorEtapa = null;
    const scale = new FluxoDisplayScale(fluxo, 'lt');
    expect(display.build(scale, fluxo, 'ferm')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
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
      },
    ],
    lead: {
      fermForno: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
      fornoEmb: { media: 0, mediana: 0, p90: 0, negativoUn: 0, bins: Array(12).fill(0) },
    },
    opAnterior: { un: 480, eventos: 1 },
    trocas: { forno: 0 },
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

  it('mantém unidades no modo un', () => {
    const scale = new FluxoDisplayScale(miniFluxo(), 'un');
    expect(scale.etapaTotal('ferm')).toBe(2400);
    expect(scale.unitLabel).toBe('un');
  });
});

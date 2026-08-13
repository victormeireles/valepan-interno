import { describe, expect, it } from 'vitest';

import { FluxoHoraLegendaBuilder } from '@/components/FluxoProcesso/FluxoHoraLegendaBuilder';
import { FluxoDisplayScale } from '@/components/FluxoProcesso/fluxo-display-scale';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

function emptyHoras(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

describe('FluxoHoraLegendaBuilder', () => {
  it('lista só assadeiras com volume na hora, ordenadas por volume', () => {
    const ferm = {
      '65g verde': emptyHoras(),
      '50g': emptyHoras(),
      Bun: emptyHoras(),
    };
    ferm['65g verde'][1] = 9600;
    ferm['50g'][1] = 2400;
    ferm.Bun[2] = 100;

    const fluxo = {
      ordemAss: ['65g verde', '50g', 'Bun'],
      cores: { '65g verde': '#a', '50g': '#b', Bun: '#c' },
      assadeiras: [],
      matriz: {
        ferm,
        forno: {
          '65g verde': emptyHoras(),
          '50g': emptyHoras(),
          Bun: emptyHoras(),
        },
        emb: {
          '65g verde': emptyHoras(),
          '50g': emptyHoras(),
          Bun: emptyHoras(),
        },
      },
      matrizAnt: {
        ferm: {
          '65g verde': emptyHoras(),
          '50g': emptyHoras(),
          Bun: emptyHoras(),
        },
        forno: {
          '65g verde': emptyHoras(),
          '50g': emptyHoras(),
          Bun: emptyHoras(),
        },
        emb: {
          '65g verde': emptyHoras(),
          '50g': emptyHoras(),
          Bun: emptyHoras(),
        },
      },
    } as unknown as VpFluxoPayload;

    const scale = new FluxoDisplayScale(fluxo, 'un');
    const itens = new FluxoHoraLegendaBuilder().build(
      fluxo.cores,
      fluxo.ordemAss,
      scale,
      'ferm',
      1,
    );

    expect(itens.map((i) => i.assadeira)).toEqual(['65g verde', '50g']);
    expect(itens[0].valor).toBe(9600);
  });
});

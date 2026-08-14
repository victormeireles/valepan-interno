import { describe, expect, it } from 'vitest';

import {
  FluxoOndaSelecaoDefault,
  FluxoOndaSegmentoOpAnteriorSplitter,
  FluxoOndasContextoBuilder,
} from '@/domain/fluxo-processo/fluxo-ondas-contexto';
import type { FluxoOndaAssadeira } from '@/domain/fluxo-processo/fluxo-processo-types';

function ondaBase(
  partial: Partial<FluxoOndaAssadeira> & Pick<FluxoOndaAssadeira, 'id'>,
): FluxoOndaAssadeira {
  return {
    opKey: '2026-08-13',
    opLabel: '13/08',
    volumeUn: 1000,
    volumeFornoUn: 0,
    volumeEmbUn: 0,
    fermIniHora: 0,
    fermFimHora: 3,
    fornoIniHora: null,
    fornoFimHora: null,
    embIniHora: null,
    embFimHora: null,
    fornoSegmentos: [],
    embSegmentos: [],
    lagFermFornoMedMin: null,
    lagFornoEmbMedMin: null,
    embOpAnterior: false,
    produtos: [],
    ...partial,
  };
}

describe('FluxoOndasContextoBuilder', () => {
  const builder = new FluxoOndasContextoBuilder();

  it('expõe horas da matriz fora das ondas como segmentos', () => {
    const matriz = Array.from({ length: 24 }, () => 0);
    matriz[0] = 100;
    matriz[1] = 200;
    matriz[5] = 50;
    matriz[6] = 40;

    const ondas = [
      ondaBase({
        id: 'a',
        fermIniHora: 0,
        fermFimHora: 3,
        volumeUn: 700,
      }),
    ];

    const segs = builder.build('ferm', matriz, ondas);
    expect(segs).toEqual([{ ini: 5, fim: 6, volumeUn: 90 }]);
  });

  it('usa segmentos de emb para cobrir horas', () => {
    const matriz = Array.from({ length: 24 }, () => 0);
    matriz[6] = 100;
    matriz[7] = 80;
    matriz[8] = 80;
    matriz[9] = 200;

    const ondas = [
      ondaBase({
        id: 'a',
        embSegmentos: [
          { ini: 6, fim: 6, volumeUn: 100 },
          { ini: 9, fim: 11, volumeUn: 500 },
        ],
      }),
    ];

    const segs = builder.build('emb', matriz, ondas);
    expect(segs).toEqual([{ ini: 7, fim: 8, volumeUn: 160 }]);
  });
});

describe('FluxoOndaSegmentoOpAnteriorSplitter', () => {
  const splitter = new FluxoOndaSegmentoOpAnteriorSplitter();

  it('parte trecho contínuo em dia e OP anterior', () => {
    const ant = Array.from({ length: 24 }, () => 0);
    ant[6] = 100;
    ant[7] = 50;

    const parts = splitter.split({ ini: 6, fim: 9, volumeUn: 400 }, ant);
    expect(parts).toEqual([
      { segmento: { ini: 6, fim: 7, volumeUn: 200 }, opAnterior: true },
      { segmento: { ini: 8, fim: 9, volumeUn: 200 }, opAnterior: false },
    ]);
  });
});

describe('FluxoOndaSelecaoDefault', () => {
  it('escolhe a onda de maior volume Ferm', () => {
    const ondas = [
      ondaBase({ id: 'p', volumeUn: 100 }),
      ondaBase({ id: 'g', volumeUn: 700 }),
      ondaBase({ id: 'm', volumeUn: 300 }),
    ];
    expect(FluxoOndaSelecaoDefault.id(ondas)).toBe('g');
  });
});

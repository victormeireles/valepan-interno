import { describe, expect, it } from 'vitest';

import { FluxoOndasAssadeiraCalculator } from '@/domain/fluxo-processo/fluxo-ondas-assadeira';

function iso(date: string, h: number, m = 0): string {
  return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`;
}

describe('FluxoOndasAssadeiraCalculator', () => {
  const calc = new FluxoOndasAssadeiraCalculator();

  it('usa volume do bloco de ferm e corta rabo FIFO do forno (04–06, não 04–11)', () => {
    const op = '2026-08-13';
    const ass = '65g verde';
    const prod = 'HB Brioche 65g';

    // 700 LT @ 24 un/LT = 16800 un (00–03)
    const ferm = [
      { h: 0, un: 1440 },
      { h: 1, un: 7680 },
      { h: 2, un: 7200 },
      { h: 3, un: 480 },
    ].map(({ h, un }) => ({
      produzidoEm: iso(op, h, 10),
      produtoNome: prod,
      assadeiraNome: ass,
      unidades: un,
      dataOp: op,
      opAnterior: false,
    }));

    // miolo 04–06 = 16320 (680 LT); sobra 480 casa às 11h — janela deve ficar 04–06
    const forno = [
      { h: 4, un: 7200 },
      { h: 5, un: 4800 },
      { h: 6, un: 4320 },
      { h: 11, un: 2400 },
    ].map(({ h, un }) => ({
      produzidoEm: iso(op, h, 10),
      produtoNome: prod,
      assadeiraNome: ass,
      unidades: un,
      dataOp: op,
      opAnterior: false,
    }));

    const emb = [
      { h: 6, un: 2400 },
      { h: 9, un: 5280 },
      { h: 10, un: 2400 },
      { h: 11, un: 5376 },
      { h: 16, un: 100 }, // rabo
    ].map(({ h, un }) => ({
      produzidoEm: iso(op, h, 10),
      produtoNome: prod,
      assadeiraNome: ass,
      unidades: un,
      dataOp: op,
      opAnterior: false,
    }));

    const ondas = calc.computeForAssadeira(ass, ferm, forno, emb);
    expect(ondas.length).toBeGreaterThanOrEqual(1);
    const o1 = ondas[0];
    expect(o1.volumeUn).toBe(16800);
    expect(o1.fermIniHora).toBe(0);
    expect(o1.fermFimHora).toBe(3);
    expect(o1.fornoIniHora).toBe(4);
    expect(o1.fornoFimHora).toBe(6);
    expect(o1.volumeFornoUn).toBe(16320);
    expect(o1.embIniHora).toBe(6);
    expect(o1.embFimHora).toBe(11);
    expect(o1.volumeEmbUn).toBeGreaterThan(0);
    // gap 07–08: dois segmentos (06 e 09–11), não uma barra contínua
    expect(o1.embSegmentos).toEqual([
      { ini: 6, fim: 6, volumeUn: 2400 },
      { ini: 9, fim: 11, volumeUn: 2400 + 5280 + 5376 },
    ]);
  });

  it('não mistura duas OPs do mesmo produto na mesma assadeira', () => {
    const ass = '65g verde';
    const prod = 'HB Brioche 65g';

    const ferm = [
      {
        produzidoEm: iso('2026-08-12', 1),
        produtoNome: prod,
        assadeiraNome: ass,
        unidades: 2400,
        dataOp: '2026-08-12',
        opAnterior: false,
      },
      {
        produzidoEm: iso('2026-08-13', 2),
        produtoNome: prod,
        assadeiraNome: ass,
        unidades: 4800,
        dataOp: '2026-08-13',
        opAnterior: false,
      },
    ];

    const forno = [
      {
        produzidoEm: iso('2026-08-12', 5),
        produtoNome: prod,
        assadeiraNome: ass,
        unidades: 2400,
        dataOp: '2026-08-12',
        opAnterior: false,
      },
      {
        produzidoEm: iso('2026-08-13', 8),
        produtoNome: prod,
        assadeiraNome: ass,
        unidades: 4800,
        dataOp: '2026-08-13',
        opAnterior: false,
      },
    ];

    const ondas = calc.computeForAssadeira(ass, ferm, forno, []);
    expect(ondas).toHaveLength(2);
    expect(ondas.map((o) => o.opKey).sort()).toEqual(['2026-08-12', '2026-08-13']);
    expect(ondas.find((o) => o.opKey === '2026-08-12')!.volumeUn).toBe(2400);
    expect(ondas.find((o) => o.opKey === '2026-08-13')!.volumeUn).toBe(4800);
    expect(ondas.find((o) => o.opKey === '2026-08-12')!.fornoIniHora).toBe(5);
    expect(ondas.find((o) => o.opKey === '2026-08-13')!.fornoIniHora).toBe(8);
  });
});

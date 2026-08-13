import { describe, expect, it } from 'vitest';

import {
  assertMatrizFechaComEtapas,
  FluxoProcessoBuilder,
} from './fluxo-processo-builder';
import { FluxoLeadTimeCalculator } from './fluxo-lead-time';
import { sumMatrizEtapa } from './fluxo-matriz-horaria';
import { FluxoParadasCalculator } from './fluxo-paradas';
import { FluxoQualidadeBlocoCalculator } from './fluxo-qualidade-bloco';
import { FluxoUnidadesConverter } from './fluxo-unidades-converter';
import type { FluxoBuilderInput, VpFluxoPayload } from './fluxo-processo-types';

function isoAt(dateISO: string, hour: number, minute: number): string {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${dateISO}T${hh}:${mm}:00-03:00`;
}

describe('FluxoUnidadesConverter', () => {
  it('deriva fator por produto e usa unidades diretas quando > 0', () => {
    const c = new FluxoUnidadesConverter([
      {
        produtoNome: 'HB Brioche 65g',
        assadeiraNome: '65g verde',
        unidades: 2400,
        latas: 100,
        caixas: 50,
      },
    ]);
    expect(c.unPorLata('HB Brioche 65g', '65g verde')).toBe(24);
    expect(c.unPorCaixa('HB Brioche 65g', '65g verde')).toBe(48);
    expect(
      c.resolveUnidades({
        unidades: 2308,
        latas: 0,
        produtoNome: 'Broa',
        assadeiraNome: 'N/A',
        etapa: 'ferm',
      }),
    ).toBe(2308);
    expect(
      c.resolveUnidades({
        unidades: 0,
        latas: 10,
        produtoNome: 'HB Brioche 65g',
        assadeiraNome: '65g verde',
        etapa: 'ferm',
      }),
    ).toBe(240);
  });

  it('cai para fallback 24/48 sem fator', () => {
    const c = new FluxoUnidadesConverter([]);
    expect(
      c.resolveUnidades({
        unidades: 0,
        latas: 2,
        produtoNome: 'X',
        assadeiraNome: 'Y',
        etapa: 'forno',
      }),
    ).toBe(48);
    expect(
      c.resolveUnidades({
        unidades: 0,
        caixas: 2,
        produtoNome: 'X',
        assadeiraNome: 'Y',
        etapa: 'emb',
      }),
    ).toBe(96);
  });
});

describe('FluxoParadasCalculator', () => {
  it('detecta gap ≥ 45 min e calcula ativo', () => {
    const calc = new FluxoParadasCalculator(45);
    const r = calc.compute([
      isoAt('2026-08-12', 1, 0),
      isoAt('2026-08-12', 1, 10),
      isoAt('2026-08-12', 2, 0),
    ]);
    expect(r).not.toBeNull();
    expect(r!.ini).toBe(60);
    expect(r!.fim).toBe(120);
    expect(r!.span).toBe(60);
    expect(r!.gaps).toHaveLength(1);
    expect(r!.gaps[0].dur).toBe(50);
    expect(r!.ativo).toBe(10);
  });

  it('não conta intervalo de 30 min como parada', () => {
    const calc = new FluxoParadasCalculator(45);
    const r = calc.compute([
      isoAt('2026-08-12', 1, 0),
      isoAt('2026-08-12', 1, 30),
    ]);
    expect(r!.gaps).toHaveLength(0);
    expect(r!.ativo).toBe(30);
  });
});

describe('FluxoQualidadeBlocoCalculator', () => {
  it('conta intervalos ≤ 1 min', () => {
    const calc = new FluxoQualidadeBlocoCalculator(1);
    const pct = calc.computePct([
      isoAt('2026-08-12', 1, 0),
      isoAt('2026-08-12', 1, 0),
      isoAt('2026-08-12', 1, 1),
      isoAt('2026-08-12', 1, 30),
    ]);
    // 3 intervalos: 0, 1, 29 → 2/3 ≈ 67%
    expect(pct).toBe(67);
  });

  it('lista principais rajadas por volume', () => {
    const calc = new FluxoQualidadeBlocoCalculator(1);
    const result = calc.compute([
      {
        produzidoEm: isoAt('2026-08-12', 8, 0),
        produtoNome: 'A',
        unidades: 100,
      },
      {
        produzidoEm: isoAt('2026-08-12', 8, 0),
        produtoNome: 'A',
        unidades: 200,
      },
      {
        produzidoEm: isoAt('2026-08-12', 8, 1),
        produtoNome: 'B',
        unidades: 50,
      },
      {
        produzidoEm: isoAt('2026-08-12', 10, 0),
        produtoNome: 'C',
        unidades: 10,
      },
      {
        produzidoEm: isoAt('2026-08-12', 10, 0),
        produtoNome: 'C',
        unidades: 10,
      },
    ]);
    expect(result.lancamentos.length).toBeGreaterThanOrEqual(2);
    expect(result.lancamentos[0].un).toBe(350);
    expect(result.lancamentos[0].eventos).toBe(3);
    expect(result.lancamentos[0].produtos[0].nome).toBe('A');
  });
});

describe('FluxoLeadTimeCalculator', () => {
  it('casa FIFO e reporta lags negativos', () => {
    const calc = new FluxoLeadTimeCalculator();
    const stats = calc.compute(
      [
        {
          produtoNome: 'A',
          produzidoEm: isoAt('2026-08-12', 4, 0),
          unidades: 100,
        },
      ],
      [
        {
          produtoNome: 'A',
          produzidoEm: isoAt('2026-08-12', 3, 0),
          unidades: 40,
        },
        {
          produtoNome: 'A',
          produzidoEm: isoAt('2026-08-12', 7, 0),
          unidades: 60,
        },
      ],
    );
    expect(stats.negativoUn).toBe(40);
    expect(stats.mediana).toBeGreaterThan(0);
    expect(stats.bins.reduce((t, v) => t + v, 0)).toBe(60);
  });
});

describe('FluxoProcessoBuilder', () => {
  it('matriz soma fecha com etapa.un e matrizAnt com opAnterior', () => {
    const input: FluxoBuilderInput = {
      dateISO: '2026-08-12',
      planoUn: 2400,
      ordensDia: [
        {
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 2400,
          latas: 100,
          caixas: 50,
        },
      ],
      fermentacao: [
        {
          produzidoEm: isoAt('2026-08-12', 1, 0),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 0,
          latas: 50,
        },
        {
          produzidoEm: isoAt('2026-08-12', 2, 0),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 0,
          latas: 50,
        },
      ],
      forno: [
        {
          produzidoEm: isoAt('2026-08-12', 4, 0),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 0,
          latas: 40,
        },
      ],
      embalagem: [
        {
          produzidoEm: isoAt('2026-08-12', 0, 50),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 0,
          caixas: 10,
          dataOp: '2026-08-11',
        },
        {
          produzidoEm: isoAt('2026-08-12', 8, 0),
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: '65g verde',
          unidades: 0,
          caixas: 20,
          dataOp: '2026-08-12',
        },
      ],
    };

    const payload = new FluxoProcessoBuilder().build(input);
    expect(payload.etapas.find((e) => e.key === 'ferm')!.un).toBe(2400);
    expect(payload.etapas.find((e) => e.key === 'forno')!.un).toBe(960);
    expect(payload.etapas.find((e) => e.key === 'emb')!.un).toBe(1440);
    expect(payload.opAnterior.un).toBe(480);
    expect(sumMatrizEtapa(payload.matriz, 'ferm')).toBe(2400);
    expect(sumMatrizEtapa(payload.matrizAnt, 'emb')).toBe(480);
    expect(() => assertMatrizFechaComEtapas(payload)).not.toThrow();
  });

  it('invariante matriz×card em payload sintético completo', () => {
    const payload: VpFluxoPayload = new FluxoProcessoBuilder().build({
      dateISO: '2026-08-12',
      planoUn: 100,
      ordensDia: [
        {
          produtoNome: 'Broa',
          assadeiraNome: 'N/A',
          unidades: 100,
          latas: 0,
          caixas: 0,
        },
      ],
      fermentacao: [
        {
          produzidoEm: isoAt('2026-08-12', 10, 0),
          produtoNome: 'Broa',
          assadeiraNome: 'N/A',
          unidades: 100,
        },
      ],
      forno: [
        {
          produzidoEm: isoAt('2026-08-12', 13, 0),
          produtoNome: 'Broa',
          assadeiraNome: 'N/A',
          unidades: 100,
        },
      ],
      embalagem: [],
    });
    for (const e of payload.etapas) {
      expect(sumMatrizEtapa(payload.matriz, e.key)).toBe(e.un);
    }
  });
});

import { describe, expect, it } from 'vitest';

import {
  FluxoHorasBaseResolver,
  FluxoHorasComLancamentoCounter,
} from '@/domain/fluxo-processo/fluxo-horas-com-lancamento';
import type { VpFluxoPayload } from '@/domain/fluxo-processo/fluxo-processo-types';

function emptyHoras(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

/** Instantâneo com data/hora civil BR via offset fixo -03:00. */
function atBr(isoLocal: string): Date {
  return new Date(`${isoLocal}-03:00`);
}

describe('FluxoHorasBaseResolver', () => {
  const resolver = new FluxoHorasBaseResolver();

  it('usa 24 em dias passados', () => {
    expect(resolver.resolve('2026-08-12', atBr('2026-08-13T16:07:00'))).toBe(24);
  });

  it('usa a hora atual quando o dia é hoje (ISO)', () => {
    expect(resolver.resolve('2026-08-13', atBr('2026-08-13T16:07:00'))).toBe(16);
  });

  it('usa a hora atual quando o dia é hoje (BR dd/mm/yyyy)', () => {
    expect(resolver.resolve('13/08/2026', atBr('2026-08-13T16:07:00'))).toBe(16);
  });

  it('não zera à meia-noite', () => {
    expect(resolver.resolve('13/08/2026', atBr('2026-08-13T00:20:00'))).toBe(1);
  });
});

describe('FluxoHorasComLancamentoCounter', () => {
  it('conta horas cheias com volume > 0', () => {
    const ferm = { '65g verde': emptyHoras() };
    ferm['65g verde'][1] = 100;
    ferm['65g verde'][5] = 50;
    ferm['65g verde'][22] = 10;

    const fluxo = {
      dia: '12/08/2026',
      ordemAss: ['65g verde'],
      matriz: {
        ferm,
        forno: { '65g verde': emptyHoras() },
        emb: { '65g verde': emptyHoras() },
      },
    } as unknown as VpFluxoPayload;

    const counter = new FluxoHorasComLancamentoCounter();
    expect(counter.count(fluxo, 'ferm', atBr('2026-08-13T16:00:00'))).toEqual({
      horasCom: 3,
      baseHoras: 24,
    });
    expect(counter.count(fluxo, 'forno', atBr('2026-08-13T16:00:00')).horasCom).toBe(0);
  });

  it('no dia de hoje só olha horas até a base', () => {
    const ferm = { a: emptyHoras() };
    ferm.a[1] = 10;
    ferm.a[10] = 10;
    ferm.a[20] = 10; // fora da janela de hoje às 16h

    const fluxo = {
      dia: '13/08/2026',
      ordemAss: ['a'],
      matriz: {
        ferm,
        forno: { a: emptyHoras() },
        emb: { a: emptyHoras() },
      },
    } as unknown as VpFluxoPayload;

    expect(
      new FluxoHorasComLancamentoCounter().count(fluxo, 'ferm', atBr('2026-08-13T16:07:00')),
    ).toEqual({ horasCom: 2, baseHoras: 16 });
  });

  it('não conta a mesma hora duas vezes com várias assadeiras', () => {
    const ferm = {
      a: emptyHoras(),
      b: emptyHoras(),
    };
    ferm.a[3] = 10;
    ferm.b[3] = 20;

    const fluxo = {
      dia: '12/08/2026',
      ordemAss: ['a', 'b'],
      matriz: {
        ferm,
        forno: { a: emptyHoras(), b: emptyHoras() },
        emb: { a: emptyHoras(), b: emptyHoras() },
      },
    } as unknown as VpFluxoPayload;

    expect(
      new FluxoHorasComLancamentoCounter().count(fluxo, 'ferm', atBr('2026-08-13T12:00:00'))
        .horasCom,
    ).toBe(1);
  });
});

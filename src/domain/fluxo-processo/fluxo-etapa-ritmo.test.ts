import { describe, expect, it } from 'vitest';

import { brazilClockUtcMs } from '@/lib/utils/date-utils';
import type { FluxoApontamentoEvento } from './fluxo-processo-types';
import {
  FluxoEtapaRitmoBuilder,
  FluxoEtapaRitmoEntriesMapper,
} from './fluxo-etapa-ritmo';

const mapper = new FluxoEtapaRitmoEntriesMapper();
const builder = new FluxoEtapaRitmoBuilder();

const HOJE = '2026-08-17';
const ONTEM = '2026-08-16';
const SEMANA = '2026-08-10';

function isoAt(dateISO: string, clock: string): string {
  return new Date(brazilClockUtcMs(dateISO, clock)).toISOString();
}

function event(over: Partial<FluxoApontamentoEvento> = {}): FluxoApontamentoEvento {
  return {
    produzidoEm: isoAt(HOJE, '09:00'),
    produtoNome: 'HB',
    assadeiraNome: '65g',
    unidades: 2400,
    latas: 100,
    caixas: 50,
    ...over,
  };
}

describe('FluxoEtapaRitmoEntriesMapper', () => {
  it('ferm/forno usam assadeiras quando há latas', () => {
    const entries = mapper.fromEventos('ferm', [event({ latas: 40, unidades: 960 })]);
    expect(entries).toEqual([{ quantity: 40, timestamp: isoAt(HOJE, '09:00') }]);
  });

  it('ferm em unidades converte para LT, não soma UN como se fossem latas', () => {
    const entries = mapper.fromEventos('ferm', [event({ latas: 0, unidades: 960 })]);
    expect(entries[0]?.quantity).toBe(40);
  });

  it('lote de Broa em UN entra no ritmo como LT', () => {
    const entries = mapper.fromFermFornoLotes([
      { assadeiras: 40, unidades: 0, produzidoEm: isoAt(HOJE, '00:36') },
      { assadeiras: 0, unidades: 2472, produzidoEm: isoAt(HOJE, '11:49') },
    ]);
    expect(entries.map((e) => e.quantity)).toEqual([40, 103]);
  });

  it('emb usa caixas e ignora lote sem caixa', () => {
    const entries = mapper.fromEventos('emb', [
      event({ caixas: 80, unidades: 1600 }),
      event({ caixas: 0, unidades: 100, produzidoEm: isoAt(HOJE, '10:00') }),
    ]);
    expect(entries).toEqual([{ quantity: 80, timestamp: isoAt(HOJE, '09:00') }]);
  });
});

describe('FluxoEtapaRitmoBuilder', () => {
  it('mede ritmo pelo primeiro lote e compara ontem/semana na própria janela', () => {
    const result = builder.build({
      dateOntem: ONTEM,
      referenceEndMs: brazilClockUtcMs(HOJE, '10:00'),
      hoje: {
        ferm: mapper.fromEventos('ferm', [event({ latas: 200 })]),
        forno: [],
        emb: [],
      },
      ontem: {
        ferm: mapper.fromEventos('ferm', [
          event({ latas: 100, produzidoEm: isoAt(ONTEM, '08:00') }),
          event({ latas: 100, produzidoEm: isoAt(ONTEM, '09:00') }),
        ]),
        forno: [],
        emb: [],
      },
      semana: {
        ferm: mapper.fromEventos('ferm', [
          event({ latas: 50, produzidoEm: isoAt(SEMANA, '09:00') }),
          event({ latas: 50, produzidoEm: isoAt(SEMANA, '09:30') }),
        ]),
        forno: [],
        emb: [],
      },
    });

    expect(result.ferm.atual).toBe(200);
    expect(result.ferm.ontem).toBe(200);
    expect(result.ferm.semana).toBe(200);
    expect(result.forno).toEqual({ atual: 0, ontem: 0, semana: 0 });
  });

  it('não infla a taxa da ferm quando um lote entra só em unidades', () => {
    const result = builder.build({
      dateOntem: null,
      referenceEndMs: brazilClockUtcMs(HOJE, '14:40'),
      hoje: {
        ferm: mapper.fromFermFornoLotes([
          { assadeiras: 2064, unidades: 0, produzidoEm: isoAt(HOJE, '00:36') },
          { assadeiras: 0, unidades: 2472, produzidoEm: isoAt(HOJE, '11:49') },
        ]),
        forno: [],
        emb: [],
      },
      ontem: { ferm: [], forno: [], emb: [] },
      semana: { ferm: [], forno: [], emb: [] },
    });
    // 2.167 LT de 00:36 → 14:40 (~14,1 h) → ~154 LT/h; contar 2472 como LT daria ~323
    expect(result.ferm.atual).toBeGreaterThanOrEqual(150);
    expect(result.ferm.atual).toBeLessThanOrEqual(160);
  });
});

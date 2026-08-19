import { describe, expect, it } from 'vitest';
import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import { FluxoFilasBuilder } from './fluxo-filas-builder';
import { FluxoFilaUltimoLotePicker } from './fluxo-fila-ultimo-lote';
import type { FluxoFilasBuilderInput, FluxoFilasOpInput } from './fluxo-filas-types';

const DATE = '2026-08-12';

function iso(hhmm: string): string {
  return `${DATE}T${hhmm}:00-03:00`;
}

function ev(
  partial: Pick<FluxoControleEventoInput, 'produzidoEm' | 'unidades' | 'produtoNome'> &
    Partial<FluxoControleEventoInput>,
): FluxoControleEventoInput {
  return {
    ordemProducaoId: partial.ordemProducaoId ?? 'op-1',
    assadeiraNome: partial.assadeiraNome ?? 'Bun',
    dataOp: partial.dataOp ?? DATE,
    ...partial,
  };
}

describe('FluxoFilaUltimoLotePicker', () => {
  it('retorna null sem eventos', () => {
    expect(FluxoFilaUltimoLotePicker.fromEventos([])).toBeNull();
  });

  it('escolhe o evento mais recente', () => {
    const lote = FluxoFilaUltimoLotePicker.fromEventos([
      ev({ produtoNome: 'HB 80', unidades: 10, produzidoEm: iso('08:00') }),
      ev({ produtoNome: 'HB Brioche 65', unidades: 20, produzidoEm: iso('19:34') }),
      ev({ produtoNome: 'HB 90', unidades: 15, produzidoEm: iso('12:00') }),
    ]);
    expect(lote).toEqual({
      produtoNome: 'HB Brioche 65',
      assadeiraNome: 'Bun',
      volumeUn: 20,
      produzidoEm: iso('19:34'),
    });
  });

  it('no empate de horário, fica com o último da lista', () => {
    const lote = FluxoFilaUltimoLotePicker.fromEventos([
      ev({ produtoNome: 'A', unidades: 10, produzidoEm: iso('10:00') }),
      ev({ produtoNome: 'B', unidades: 12, produzidoEm: iso('10:00') }),
    ]);
    expect(lote?.produtoNome).toBe('B');
    expect(lote?.volumeUn).toBe(12);
  });
});

function op(partial: Partial<FluxoFilasOpInput> & Pick<FluxoFilasOpInput, 'id'>): FluxoFilasOpInput {
  return {
    ordemPlanejamento: 1,
    produtoNome: 'Bun',
    assadeiraNome: 'Bun',
    observacao: '',
    unidades: 100,
    latas: 0,
    caixas: 0,
    dataProducao: DATE,
    ...partial,
  };
}

function baseInput(overrides: Partial<FluxoFilasBuilderInput> = {}): FluxoFilasBuilderInput {
  return {
    ops: [op({ id: 'op-1' })],
    opsAnteriores: [],
    eventosFerm: [],
    eventosForno: [],
    eventosEmb: [],
    camaraMin: 180,
    resfrioMin: 60,
    asOfMs: Date.parse(iso('20:00')),
    ...overrides,
  };
}

describe('FluxoFilasBuilder ultimoLote por etapa', () => {
  const builder = new FluxoFilasBuilder();

  it('mapeia último lote da fermentação, forno e embalagem', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [
          ev({ produtoNome: 'HB 80', unidades: 10, produzidoEm: iso('08:00') }),
          ev({ produtoNome: 'HB Brioche 65', unidades: 20, produzidoEm: iso('19:34') }),
        ],
        eventosForno: [
          ev({ produtoNome: 'HB 80', unidades: 8, produzidoEm: iso('11:00') }),
        ],
        eventosEmb: [
          ev({ produtoNome: 'HB 90', unidades: 30, produzidoEm: iso('16:05') }),
        ],
      }),
    );

    expect(result?.aProduzir.ultimoLote).toBeNull();
    expect(result?.fermentando.ultimoLote?.produtoNome).toBe('HB Brioche 65');
    expect(result?.fermentando.ultimoLote?.produzidoEm).toBe(iso('19:34'));
    expect(result?.resfriando.ultimoLote?.produtoNome).toBe('HB 80');
    expect(result?.resfriando.ultimoLote?.produzidoEm).toBe(iso('11:00'));
    expect(result?.embalado.ultimoLote?.produtoNome).toBe('HB 90');
    expect(result?.embalado.ultimoLote?.produzidoEm).toBe(iso('16:05'));
  });

  it('mantém último lote da etapa mesmo com a fila já vazia', () => {
    const result = builder.build(
      baseInput({
        eventosFerm: [ev({ produtoNome: 'HB 80', unidades: 100, produzidoEm: iso('08:00') })],
        eventosForno: [ev({ produtoNome: 'HB 80', unidades: 100, produzidoEm: iso('11:00') })],
      }),
    );
    expect(result?.fermentando.totalUn).toBe(0);
    expect(result?.fermentando.ultimoLote?.produzidoEm).toBe(iso('08:00'));
  });
});

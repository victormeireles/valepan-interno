import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG_OPERACAO } from '@/domain/config-operacao/config-operacao-mapper';
import type { ConfigOperacaoSnapshot } from '@/domain/config-operacao/config-operacao-types';
import { FluxoProcessoBuilder } from '@/domain/fluxo-processo/fluxo-processo-builder';
import type { FluxoApontamentoEvento } from '@/domain/fluxo-processo/fluxo-processo-types';

import { FluxoProcessoTvAttach } from './fluxo-processo-tv-attach';

const DATE = '2026-09-02';
const DATE_ANT = '2026-09-01';

const snapshotComTurnosForno: ConfigOperacaoSnapshot = {
  ...DEFAULT_CONFIG_OPERACAO,
  turnos: [
    { etapa: 'fermentacao', numero: 1, inicio: '22:00', fim: '07:00' },
    { etapa: 'forno', numero: 1, inicio: '22:00', fim: '07:00' },
    { etapa: 'forno', numero: 2, inicio: '07:00', fim: '16:00' },
    { etapa: 'embalagem', numero: 1, inicio: '22:00', fim: '07:00' },
  ],
};

function emptyFluxo() {
  return new FluxoProcessoBuilder().build({
    dateISO: DATE,
    planoUn: 0,
    ordensDia: [],
    fermentacao: [],
    forno: [],
    embalagem: [],
  });
}

function eventoForno(
  over: Partial<FluxoApontamentoEvento> &
    Pick<FluxoApontamentoEvento, 'produzidoEm' | 'loteId' | 'dataOp' | 'latas'>,
): FluxoApontamentoEvento {
  return {
    produtoNome: 'Brioche',
    assadeiraNome: '65g',
    unidades: 240,
    turno: 1,
    ordemProducaoId: 'op-hoje',
    ...over,
  };
}

describe('FluxoProcessoTvAttach', () => {
  it('anexa outraOp e último lote do forno na janela', () => {
    const fluxo = emptyFluxo();
    const forno: FluxoApontamentoEvento[] = [
      eventoForno({
        loteId: 'lote-d1',
        dataOp: DATE_ANT,
        produzidoEm: `${DATE_ANT}T22:30:00-03:00`,
        latas: 8,
        ordemProducaoId: 'op-d1',
      }),
      eventoForno({
        loteId: 'lote-d',
        dataOp: DATE,
        produzidoEm: `${DATE}T06:00:00-03:00`,
        latas: 12,
        ordemProducaoId: 'op-hoje',
      }),
    ];

    new FluxoProcessoTvAttach().attach(fluxo, {
      dateISO: DATE,
      snapshot: snapshotComTurnosForno,
      fermentacao: [],
      forno,
      embalagem: [],
    });

    expect(fluxo.turnosResumo?.forno.outraOp).toBe(8);
    expect(fluxo.turnosResumo?.forno.outraOpData).toBe(DATE_ANT);
    expect(fluxo.turnosResumo?.forno.total).toBe(20);
    expect(fluxo.ultimoPorEtapa?.forno[0]?.loteId).toBe('lote-d');
    expect(fluxo.ultimoPorEtapa?.forno[0]?.quantidade).toBe(12);
    expect(fluxo.ultimoPorEtapa?.forno).toHaveLength(2);
    expect(fluxo.ultimoPorEtapa?.ferm).toEqual([]);
    expect(fluxo.ultimoPorEtapa?.emb).toEqual([]);
  });
});

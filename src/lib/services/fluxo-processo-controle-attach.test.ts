import { describe, expect, it } from 'vitest';

import { FluxoProcessoBuilder } from '@/domain/fluxo-processo/fluxo-processo-builder';
import type { EstimativaProducaoRow } from '@/domain/estimativa-producao/estimativa-producao-types';
import type { FluxoApontamentoEvento } from '@/domain/fluxo-processo/fluxo-processo-types';
import { FluxoControleServiceAttach } from '@/lib/services/fluxo-processo-controle-attach';

const DATE = '2026-08-12';
const TODAY = '2026-08-12';

function iso(hhmm: string): string {
  return `${DATE}T${hhmm}:00-03:00`;
}

function baseEst(ordemProducaoId: string): EstimativaProducaoRow {
  return {
    ordemProducaoId,
    fermentacaoInicioPrevisto: iso('06:00'),
    fermentacaoFimPrevisto: iso('07:00'),
    camaraFimPrevisto: iso('10:00'),
    fornoInicioPrevisto: iso('10:00'),
    fornoFimPrevisto: iso('11:00'),
    resfriamentoFimPrevisto: iso('12:00'),
    embalagemInicioPrevisto: iso('13:00'),
    embalagemFimPrevisto: iso('14:00'),
  };
}

function emptyFluxo() {
  return new FluxoProcessoBuilder().build({
    dateISO: DATE,
    planoUn: 100,
    ordensDia: [
      {
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 100,
        latas: 0,
        caixas: 0,
      },
    ],
    fermentacao: [
      {
        produzidoEm: iso('06:30'),
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 100,
        ordemProducaoId: 'op-1',
        dataOp: DATE,
      },
    ],
    forno: [],
    embalagem: [],
  });
}

describe('FluxoControleServiceAttach', () => {
  it('anexa controle indisponível quando não há estimativas', () => {
    const fluxo = emptyFluxo();
    expect(fluxo.controle).toBeNull();

    new FluxoControleServiceAttach().attach(fluxo, {
      dateISO: DATE,
      todayISO: TODAY,
      asOfMs: Date.parse(iso('12:00')),
      ordens: [
        {
          id: 'op-1',
          ordemPlanejamento: 1,
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 100,
          assadeiras: 0,
          caixas: 0,
        },
      ],
      estimativas: [],
      fermentacao: [],
      forno: [],
      embalagem: [],
    });

    expect(fluxo.controle).not.toBeNull();
    expect(fluxo.controle!.disponivel).toBe(false);
  });

  it('monta ops com id da ordem (não ordemProducaoId da estimativa) e anexa controle', () => {
    const fluxo = emptyFluxo();
    const ferm: FluxoApontamentoEvento[] = [
      {
        produzidoEm: iso('06:30'),
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 100,
        ordemProducaoId: 'op-1',
        dataOp: DATE,
      },
    ];

    new FluxoControleServiceAttach().attach(fluxo, {
      dateISO: DATE,
      todayISO: TODAY,
      asOfMs: Date.parse(iso('14:30')),
      ordens: [
        {
          id: 'op-1',
          ordemPlanejamento: 1,
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 100,
          assadeiras: 0,
          caixas: 0,
        },
      ],
      estimativas: [baseEst('op-1')],
      fermentacao: ferm,
      forno: [],
      embalagem: [],
    });

    expect(fluxo.controle!.disponivel).toBe(true);
    expect(fluxo.controle!.etapas.ferm.objetivoUn).toBe(100);
    expect(fluxo.controle!.relogio.ferm[0]?.ordemProducaoId).toBe('op-1');
  });

  it('está de embalagem é o volume da OP do dia, mesmo com OP anterior maior', () => {
    const embalagem: FluxoApontamentoEvento[] = [
      {
        produzidoEm: iso('08:00'),
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 12048,
        caixas: 251,
        dataOp: '2026-08-11',
        ordemProducaoId: 'op-ontem',
      },
      {
        produzidoEm: iso('08:40'),
        produtoNome: 'Bun',
        assadeiraNome: 'Bun',
        unidades: 8640,
        caixas: 180,
        dataOp: DATE,
        ordemProducaoId: 'op-1',
      },
    ];
    const fluxo = new FluxoProcessoBuilder().build({
      dateISO: DATE,
      planoUn: 8640,
      ordensDia: [
        {
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 8640,
          latas: 0,
          caixas: 180,
        },
      ],
      fermentacao: [],
      forno: [],
      embalagem,
    });

    expect(fluxo.etapas.find((e) => e.key === 'emb')?.volOperacional).toBe(180);
    expect(fluxo.opAnterior.volOperacional).toBe(251);

    new FluxoControleServiceAttach().attach(fluxo, {
      dateISO: DATE,
      todayISO: TODAY,
      asOfMs: Date.parse(iso('09:11')),
      ordens: [
        {
          id: 'op-1',
          ordemPlanejamento: 1,
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 8640,
          assadeiras: 0,
          caixas: 1766,
        },
      ],
      estimativas: [baseEst('op-1')],
      fermentacao: [],
      forno: [],
      embalagem,
    });

    expect(fluxo.controle!.etapas.emb.estaUn).toBe(180);
  });
});

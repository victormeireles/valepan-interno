import { describe, expect, it } from 'vitest';

import { FluxoProcessoBuilder } from '@/domain/fluxo-processo/fluxo-processo-builder';
import { FluxoFilasServiceAttach } from '@/lib/services/fluxo-filas-attach';

const DATE = '2026-08-12';

function iso(hhmm: string): string {
  return `${DATE}T${hhmm}:00-03:00`;
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
    fermentacao: [],
    forno: [],
    embalagem: [],
  });
}

describe('FluxoFilasServiceAttach', () => {
  it('anexa OP sem fermentação em a produzir', () => {
    const fluxo = emptyFluxo();
    expect(fluxo.filas).toBeNull();

    new FluxoFilasServiceAttach().attach(fluxo, {
      ops: [
        {
          id: 'op-1',
          ordemPlanejamento: 1,
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          observacao: '',
          unidades: 100,
          latas: 0,
          caixas: 0,
          dataProducao: DATE,
        },
      ],
      fermentacao: [],
      forno: [],
      embalagem: [],
      camaraMin: 180,
      resfrioMin: 60,
      asOfMs: Date.parse(iso('12:00')),
    });

    expect(fluxo.filas?.aProduzir.totalUn).toBe(100);
  });

  it('ignora OP fora das categorias visíveis', () => {
    const fluxo = emptyFluxo();
    new FluxoFilasServiceAttach().attach(fluxo, {
      ops: [
        {
          id: 'op-hamb',
          ordemPlanejamento: 1,
          produtoNome: 'HB 80g',
          assadeiraNome: 'Bun',
          observacao: '',
          unidades: 80,
          latas: 0,
          caixas: 0,
          dataProducao: DATE,
        },
        {
          id: 'op-forma',
          ordemPlanejamento: 2,
          produtoNome: 'Pão de Forma',
          assadeiraNome: 'Forma',
          observacao: '',
          unidades: 40,
          latas: 0,
          caixas: 0,
          dataProducao: DATE,
        },
      ],
      fermentacao: [],
      forno: [],
      embalagem: [],
      camaraMin: 180,
      resfrioMin: 60,
      asOfMs: Date.parse(iso('12:00')),
      opIdsVisiveis: new Set(['op-hamb']),
      produtoNomesVisiveis: new Set(['HB 80g']),
    });

    expect(fluxo.filas?.aProduzir.totalUn).toBe(80);
    expect(fluxo.filas?.aProduzir.items.map((i) => i.ordemProducaoId)).toEqual([
      'op-hamb',
    ]);
  });

  it('converte lotes em latas (unidades 0) para as filas da OP', () => {
    const fluxo = emptyFluxo();
    new FluxoFilasServiceAttach().attach(fluxo, {
      ops: [
        {
          id: 'op-brioche',
          ordemPlanejamento: 1,
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: 'Bun',
          observacao: '65g: 1a producao',
          unidades: 928,
          latas: 928,
          caixas: 464,
          dataProducao: DATE,
        },
      ],
      fermentacao: [
        {
          ordemProducaoId: 'op-brioche',
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: 'Bun',
          unidades: 0,
          latas: 800,
          produzidoEm: iso('06:00'),
          dataOp: DATE,
        },
      ],
      forno: [
        {
          ordemProducaoId: 'op-brioche',
          produtoNome: 'HB Brioche 65g',
          assadeiraNome: 'Bun',
          unidades: 0,
          latas: 580,
          produzidoEm: iso('10:00'),
          dataOp: DATE,
        },
      ],
      embalagem: [],
      camaraMin: 180,
      resfrioMin: 60,
      asOfMs: Date.parse(iso('12:00')),
    });

    expect(fluxo.filas?.aProduzir.totalUn).toBe(128);
    expect(fluxo.filas?.fermentando.totalUn).toBe(220);
    expect(fluxo.filas?.resfriando.totalUn).toBe(580);
    expect(fluxo.filas?.embalado.totalUn).toBe(0);
  });

  it('lotes de OP extra (outro dia) somam em anteriorUn', () => {
    const fluxo = emptyFluxo();
    new FluxoFilasServiceAttach().attach(fluxo, {
      ops: [
        {
          id: 'op-hoje',
          ordemPlanejamento: 1,
          produtoNome: 'HB Brioche 75g',
          assadeiraNome: 'Bun',
          observacao: '',
          unidades: 81,
          latas: 0,
          caixas: 81,
          dataProducao: DATE,
        },
      ],
      opsAnteriores: [
        {
          id: 'op-ontem',
          ordemPlanejamento: 7,
          produtoNome: 'HB Padrão',
          assadeiraNome: 'Bun',
          observacao: 'Lisa',
          unidades: 70,
          latas: 0,
          caixas: 70,
          dataProducao: '2026-08-17',
        },
      ],
      fermentacao: [],
      forno: [],
      embalagem: [
        {
          produzidoEm: iso('10:00'),
          produtoNome: 'HB Brioche 75g',
          assadeiraNome: 'Bun',
          unidades: 50,
          caixas: 50,
          dataOp: DATE,
          ordemProducaoId: 'op-hoje',
        },
        {
          produzidoEm: iso('08:00'),
          produtoNome: 'HB Padrão',
          assadeiraNome: 'Bun',
          unidades: 31,
          caixas: 31,
          dataOp: '2026-08-17',
          ordemProducaoId: 'op-ontem',
        },
      ],
      camaraMin: 180,
      resfrioMin: 60,
      asOfMs: Date.parse(iso('12:00')),
    });
    expect(fluxo.filas?.embalado.totalUn).toBe(50);
    expect(fluxo.filas?.embalado.anteriorUn).toBe(31);
  });

  it('OP com embalagem fechada move resfriando para perdas', () => {
    const fluxo = emptyFluxo();
    new FluxoFilasServiceAttach().attach(fluxo, {
      ops: [
        {
          id: 'op-1',
          ordemPlanejamento: 1,
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          observacao: '',
          unidades: 100,
          latas: 0,
          caixas: 0,
          dataProducao: DATE,
          embalagemFinalizada: true,
        },
      ],
      fermentacao: [
        {
          ordemProducaoId: 'op-1',
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 80,
          produzidoEm: iso('06:00'),
          dataOp: DATE,
        },
      ],
      forno: [
        {
          ordemProducaoId: 'op-1',
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 80,
          produzidoEm: iso('10:00'),
          dataOp: DATE,
        },
      ],
      embalagem: [
        {
          ordemProducaoId: 'op-1',
          produtoNome: 'Bun',
          assadeiraNome: 'Bun',
          unidades: 50,
          produzidoEm: iso('11:00'),
          dataOp: DATE,
        },
      ],
      camaraMin: 180,
      resfrioMin: 60,
      asOfMs: Date.parse(iso('12:00')),
    });
    expect(fluxo.filas?.resfriando.totalUn).toBe(0);
    expect(fluxo.filas?.embalado.totalUn).toBe(50);
    expect(fluxo.filas?.perdas.totalUn).toBe(30);
    expect(fluxo.filas?.perdas.items[0]?.perdaOrigem).toBe('embalagem');
  });
});

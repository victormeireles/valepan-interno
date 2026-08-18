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
          unidades: 100,
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
});

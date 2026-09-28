import { describe, expect, it } from 'vitest';

import {
  FluxoOpResultadoBuilder,
  FluxoOpResultadoPresenter,
} from './fluxo-op-resultado';

const builder = new FluxoOpResultadoBuilder();
const presenter = new FluxoOpResultadoPresenter();

describe('FluxoOpResultadoBuilder', () => {
  it('soma o feito da OP em todos os dias e separa o dia civil', () => {
    const resultado = builder.build({
      dateISO: '2026-09-21',
      unitLabel: 'CX',
      metas: [{ ordemId: 'a', meta: 1530 }],
      apontamentos: [
        { ordemId: 'a', dia: '2026-09-21', quantidade: 1100 },
        { ordemId: 'a', dia: '2026-09-22', quantidade: 479 },
        { ordemId: 'fora', dia: '2026-09-21', quantidade: 80 },
      ],
    });

    expect(resultado).toMatchObject({
      feito: 1579,
      meta: 1530,
      nesteDia: 1100,
      outrosDias: [{ dateISO: '2026-09-22', diaCurto: '22', quantidade: 479 }],
    });
  });

  it('omite outros dias quando tudo caiu no dia selecionado', () => {
    const resultado = builder.build({
      dateISO: '2026-09-21',
      unitLabel: 'LT',
      metas: [{ ordemId: 'a', meta: 100 }],
      apontamentos: [{ ordemId: 'a', dia: '2026-09-21', quantidade: 40 }],
    });

    expect(resultado?.outrosDias).toEqual([]);
    expect(resultado?.nesteDia).toBe(40);
  });

  it('rotula outro mês com dia/mês', () => {
    const resultado = builder.build({
      dateISO: '2026-09-21',
      unitLabel: 'CX',
      metas: [{ ordemId: 'a', meta: 10 }],
      apontamentos: [{ ordemId: 'a', dia: '2026-10-02', quantidade: 6 }],
    });

    expect(resultado?.outrosDias[0]?.diaCurto).toBe('02/10');
  });

  it('retorna null sem OP visível', () => {
    expect(
      builder.build({
        dateISO: '2026-09-21',
        unitLabel: 'CX',
        metas: [],
        apontamentos: [],
      }),
    ).toBeNull();
  });
});

describe('FluxoOpResultadoPresenter', () => {
  it('mostra meta atingida com o excedente e a quebra do dia', () => {
    const view = presenter.present({
      feito: 1579,
      meta: 1530,
      unitLabel: 'CX',
      nesteDia: 1100,
      outrosDias: [{ dateISO: '2026-09-22', diaCurto: '22', quantidade: 479 }],
    });

    expect(view.metaAtingida).toBe(true);
    expect(view.delta).toBe(49);
    expect(view.barraPct).toBe(100);
    expect(view.diaLinha).toBe('1.100 neste dia · 479 no dia 22');
  });

  it('mostra o que falta quando a OP não fechou', () => {
    const view = presenter.present({
      feito: 1000,
      meta: 1530,
      unitLabel: 'CX',
      nesteDia: 1000,
      outrosDias: [],
    });

    expect(view.metaAtingida).toBe(false);
    expect(view.falta).toBe(530);
    expect(view.diaLinha).toBeNull();
    expect(view.barraPct).toBe(65);
  });

  it('usa dia/mês quando o vazamento é de outro mês', () => {
    const view = presenter.present({
      feito: 10,
      meta: 10,
      unitLabel: 'CX',
      nesteDia: 4,
      outrosDias: [{ dateISO: '2026-10-02', diaCurto: '02/10', quantidade: 6 }],
    });

    expect(view.diaLinha).toBe('4 neste dia · 6 no dia 02/10');
  });
});

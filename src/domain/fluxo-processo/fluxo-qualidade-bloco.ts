import { brazilMinuteOfDayFromIso } from './fluxo-paradas';
import type { FluxoBlocoLancamento } from './fluxo-processo-types';

export type FluxoBlocoEvento = {
  produzidoEm: string;
  produtoNome: string;
  assadeiraNome: string;
  unidades: number;
  /** Quantidade na unidade operacional da etapa (LT ou CX), via un ÷ fator da OP. */
  quantidadeOperacional: number;
};

export type FluxoQualidadeBlocoResult = {
  blocoPct: number;
  /** Top lançamentos acima do limite, por volume. */
  lancamentos: FluxoBlocoLancamento[];
};

/**
 * Qualidade do apontamento: % do volume em lançamentos acima do limite
 * operacional da etapa (ex.: > 40 LT ferm, > 20 LT forno ou > 55 CX emb).
 */
export class FluxoQualidadeBlocoCalculator {
  constructor(
    private readonly maxQuantidadeOperacional: number,
    private readonly topN: number = 5,
  ) {}

  compute(events: FluxoBlocoEvento[]): FluxoQualidadeBlocoResult {
    const valid = events.filter(
      (e) =>
        e.unidades > 0 &&
        e.quantidadeOperacional > 0 &&
        brazilMinuteOfDayFromIso(e.produzidoEm) != null,
    );

    if (valid.length === 0) {
      return { blocoPct: 0, lancamentos: [] };
    }

    const totalUn = valid.reduce((t, e) => t + e.unidades, 0);
    const excessivos = valid.filter(
      (e) => e.quantidadeOperacional > this.maxQuantidadeOperacional,
    );
    const blocoUn = excessivos.reduce((t, e) => t + e.unidades, 0);

    const lancamentos = [...excessivos]
      .sort(
        (a, b) =>
          b.unidades - a.unidades ||
          new Date(a.produzidoEm).getTime() - new Date(b.produzidoEm).getTime(),
      )
      .slice(0, this.topN)
      .map((e) => this.toLancamento(e));

    return {
      blocoPct: totalUn > 0 ? Math.round((blocoUn / totalUn) * 100) : 0,
      lancamentos,
    };
  }

  private toLancamento(event: FluxoBlocoEvento): FluxoBlocoLancamento {
    const minuto = brazilMinuteOfDayFromIso(event.produzidoEm)!;
    return {
      ini: minuto,
      fim: minuto,
      eventos: 1,
      un: event.unidades,
      assadeiraNome: event.assadeiraNome,
      produtos: event.produtoNome
        ? [
            {
              nome: event.produtoNome,
              un: event.unidades,
              assadeiraNome: event.assadeiraNome,
            },
          ]
        : [],
    };
  }
}

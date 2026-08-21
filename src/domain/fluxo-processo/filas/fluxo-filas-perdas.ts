import type {
  FluxoFilaItem,
  FluxoFilaPerdaOrigem,
  FluxoFilasOpInput,
} from './fluxo-filas-types';

export type FluxoOpFilasParciais = {
  aProduzir: FluxoFilaItem[];
  fermentando: FluxoFilaItem[];
  resfriando: FluxoFilaItem[];
  embalado: FluxoFilaItem[];
  perdas: FluxoFilaItem[];
};

/**
 * Move saldo da fila anterior para Perdas quando a etapa foi fechada.
 * Cada unidade entra em uma fila só (não conta 2×).
 */
export class FluxoFilasPerdas {
  aplicar(
    filas: Omit<FluxoOpFilasParciais, 'perdas'>,
    op: Pick<
      FluxoFilasOpInput,
      'fermentacaoFinalizada' | 'fornoFinalizada' | 'embalagemFinalizada'
    >,
  ): FluxoOpFilasParciais {
    const perdas: FluxoFilaItem[] = [];
    let aProduzir = filas.aProduzir;
    let fermentando = filas.fermentando;
    let resfriando = filas.resfriando;

    if (op.fermentacaoFinalizada) {
      perdas.push(...marcarPerda(aProduzir, 'fermentacao'));
      aProduzir = [];
    }
    if (op.fornoFinalizada) {
      perdas.push(...marcarPerda(fermentando, 'forno'));
      fermentando = [];
    }
    if (op.embalagemFinalizada) {
      perdas.push(...marcarPerda(resfriando, 'embalagem'));
      resfriando = [];
    }

    return {
      aProduzir,
      fermentando,
      resfriando,
      embalado: filas.embalado,
      perdas,
    };
  }
}

function marcarPerda(
  items: FluxoFilaItem[],
  origem: FluxoFilaPerdaOrigem,
): FluxoFilaItem[] {
  return items.map((item) => ({
    ...item,
    perdaOrigem: origem,
    preso: false,
    presoMin: null,
  }));
}

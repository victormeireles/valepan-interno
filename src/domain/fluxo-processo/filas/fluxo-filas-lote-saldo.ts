import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';

export type FluxoFilaLoteRestante = {
  produzidoEm: string;
  volumeUn: number;
};

/** Consome volume da etapa seguinte (FIFO, lote mais antigo primeiro). */
export class FluxoFilasLoteSaldo {
  restantes(
    lotes: FluxoControleEventoInput[],
    consumidoUn: number,
  ): FluxoFilaLoteRestante[] {
    let rest = Math.max(0, consumidoUn);
    const out: FluxoFilaLoteRestante[] = [];
    const sorted = [...lotes].sort(
      (a, b) => Date.parse(a.produzidoEm) - Date.parse(b.produzidoEm),
    );
    for (const lote of sorted) {
      const take = Math.min(rest, lote.unidades);
      rest -= take;
      const sobra = lote.unidades - take;
      if (sobra > 0) out.push({ produzidoEm: lote.produzidoEm, volumeUn: sobra });
    }
    return out;
  }
}

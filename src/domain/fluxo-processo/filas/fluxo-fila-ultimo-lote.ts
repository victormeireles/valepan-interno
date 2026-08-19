import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilaUltimoLote } from './fluxo-filas-types';

export class FluxoFilaUltimoLotePicker {
  static fromEventos(eventos: FluxoControleEventoInput[]): FluxoFilaUltimoLote | null {
    if (eventos.length === 0) return null;
    let best = eventos[0];
    for (const ev of eventos) {
      if (Date.parse(ev.produzidoEm) >= Date.parse(best.produzidoEm)) best = ev;
    }
    return {
      produtoNome: best.produtoNome,
      assadeiraNome: best.assadeiraNome,
      volumeUn: best.unidades,
      produzidoEm: best.produzidoEm,
    };
  }
}

import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import type { FluxoFilasOpInput } from './fluxo-filas-types';

export class FluxoFilasFifoEmb {
  alocarUnidades(
    ops: FluxoFilasOpInput[],
    eventosEmb: FluxoControleEventoInput[],
  ): Map<string, number> {
    const sortedOps = [...ops].sort(
      (a, b) => a.ordemPlanejamento - b.ordemPlanejamento,
    );
    const sortedEv = [...eventosEmb].sort(
      (a, b) => Date.parse(a.produzidoEm) - Date.parse(b.produzidoEm),
    );
    const alocado = new Map<string, number>();
    for (const op of sortedOps) alocado.set(op.id, 0);
    let opIdx = 0;
    let restante = sortedOps[0]?.unidades ?? 0;
    for (const ev of sortedEv) {
      let pendente = ev.unidades;
      while (pendente > 0 && opIdx < sortedOps.length) {
        const op = sortedOps[opIdx];
        const take = Math.min(pendente, restante);
        alocado.set(op.id, (alocado.get(op.id) ?? 0) + take);
        pendente -= take;
        restante -= take;
        if (restante === 0) {
          opIdx += 1;
          restante = sortedOps[opIdx]?.unidades ?? 0;
        }
      }
    }
    return alocado;
  }
}

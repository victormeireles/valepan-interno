import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import { FluxoFilasFifoEmb } from './fluxo-filas-fifo-emb';
import type {
  FluxoFilaItem,
  FluxoFilaResumo,
  FluxoFilasBuilderInput,
  FluxoFilasDia,
  FluxoFilasOpInput,
} from './fluxo-filas-types';

type OpFilas = {
  aProduzir?: FluxoFilaItem;
  fermentando?: FluxoFilaItem;
  resfriando?: FluxoFilaItem;
};

function somaUn(eventos: FluxoControleEventoInput[], opId: string): number {
  return eventos
    .filter((e) => e.ordemProducaoId === opId)
    .reduce((t, e) => t + e.unidades, 0);
}

function maxProduzidoEm(eventos: FluxoControleEventoInput[], opId: string): string | null {
  const daOp = eventos.filter((e) => e.ordemProducaoId === opId);
  if (daOp.length === 0) return null;
  return daOp.reduce(
    (max, ev) => (Date.parse(ev.produzidoEm) > Date.parse(max) ? ev.produzidoEm : max),
    daOp[0].produzidoEm,
  );
}

function calcPreso(
  wipUn: number,
  ultimoLoteEm: string | null,
  tempoMin: number,
  asOfMs: number,
): { preso: boolean; presoMin: number | null } {
  if (wipUn <= 0 || ultimoLoteEm === null) return { preso: false, presoMin: null };
  const limiteMs = Date.parse(ultimoLoteEm) + tempoMin * 60_000;
  if (asOfMs <= limiteMs) return { preso: false, presoMin: null };
  return {
    preso: true,
    presoMin: Math.floor((asOfMs - limiteMs) / 60_000),
  };
}

function montarItem(
  op: FluxoFilasOpInput,
  volumeUn: number,
  preso: { preso: boolean; presoMin: number | null },
  ultimoLoteEm: string | null,
): FluxoFilaItem {
  return {
    ordemProducaoId: op.id,
    ordemPlanejamento: op.ordemPlanejamento,
    produtoNome: op.produtoNome,
    assadeiraNome: op.assadeiraNome,
    volumeUn,
    ...preso,
    ultimoLoteEm,
  };
}

function montarResumo(items: FluxoFilaItem[]): FluxoFilaResumo {
  const totalUn = items.reduce((t, i) => t + i.volumeUn, 0);
  const presoUn = items.filter((i) => i.preso).reduce((t, i) => t + i.volumeUn, 0);
  return { totalUn, presoUn, items };
}

function ordenarItems(items: FluxoFilaItem[]): FluxoFilaItem[] {
  return [...items].sort((a, b) => {
    const aPreso = a.presoMin ?? -1;
    const bPreso = b.presoMin ?? -1;
    if (bPreso !== aPreso) return bPreso - aPreso;
    return a.ordemPlanejamento - b.ordemPlanejamento;
  });
}

export class FluxoFilasBuilder {
  constructor(private readonly fifoEmb = new FluxoFilasFifoEmb()) {}

  build(input: FluxoFilasBuilderInput): FluxoFilasDia | null {
    if (input.ops.length === 0) return null;
    const ops = [...input.ops].sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
    const embPorOp = this.fifoEmb.alocarUnidades(ops, input.eventosEmb);

    const aProduzir: FluxoFilaItem[] = [];
    const fermentando: FluxoFilaItem[] = [];
    const resfriando: FluxoFilaItem[] = [];

    for (const op of ops) {
      const filas = this.classificarOp(op, input, embPorOp.get(op.id) ?? 0);
      if (filas.aProduzir) aProduzir.push(filas.aProduzir);
      if (filas.fermentando) fermentando.push(filas.fermentando);
      if (filas.resfriando) resfriando.push(filas.resfriando);
    }

    return {
      aProduzir: montarResumo(ordenarItems(aProduzir)),
      fermentando: montarResumo(ordenarItems(fermentando)),
      resfriando: montarResumo(ordenarItems(resfriando)),
    };
  }

  private classificarOp(
    op: FluxoFilasOpInput,
    input: FluxoFilasBuilderInput,
    embUn: number,
  ): OpFilas {
    const fermUn = somaUn(input.eventosFerm, op.id);
    const fornoUn = somaUn(input.eventosForno, op.id);
    if (fermUn === 0) {
      return { aProduzir: montarItem(op, op.unidades, { preso: false, presoMin: null }, null) };
    }

    const filas: OpFilas = {};
    const wipFerm = Math.max(0, fermUn - fornoUn);
    if (wipFerm > 0) {
      const ultimoFerm = maxProduzidoEm(input.eventosFerm, op.id);
      filas.fermentando = montarItem(
        op,
        wipFerm,
        calcPreso(wipFerm, ultimoFerm, input.camaraMin, input.asOfMs),
        ultimoFerm,
      );
    }

    const wipResfrio = Math.max(0, fornoUn - embUn);
    if (wipResfrio > 0) {
      const ultimoForno = maxProduzidoEm(input.eventosForno, op.id);
      filas.resfriando = montarItem(
        op,
        wipResfrio,
        calcPreso(wipResfrio, ultimoForno, input.resfrioMin, input.asOfMs),
        ultimoForno,
      );
    }
    return filas;
  }
}

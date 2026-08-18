import type { FluxoControleEventoInput } from '@/domain/fluxo-processo/controle/fluxo-controle-types';
import { FluxoFilasEmbItems } from './fluxo-filas-emb-items';
import { FluxoFilasEmbPorOp } from './fluxo-filas-emb-por-op';
import { FluxoFilasLoteSaldo } from './fluxo-filas-lote-saldo';
import type {
  FluxoFilaItem,
  FluxoFilaItemOrigem,
  FluxoFilaResumo,
  FluxoFilasBuilderInput,
  FluxoFilasDia,
  FluxoFilasOpInput,
} from './fluxo-filas-types';

type OpFilas = {
  aProduzir: FluxoFilaItem[];
  fermentando: FluxoFilaItem[];
  resfriando: FluxoFilaItem[];
  embalado: FluxoFilaItem[];
};

function lotesDaOp(
  eventos: FluxoControleEventoInput[],
  opId: string,
): FluxoControleEventoInput[] {
  return eventos.filter((e) => e.ordemProducaoId === opId);
}

function somaUn(eventos: FluxoControleEventoInput[], opId: string): number {
  return lotesDaOp(eventos, opId).reduce((t, e) => t + e.unidades, 0);
}

function calcPreso(
  volumeUn: number,
  loteEm: string,
  tempoMin: number,
  asOfMs: number,
): { preso: boolean; presoMin: number | null; naFilaMin: number } {
  const naFilaMin = Math.max(0, Math.floor((asOfMs - Date.parse(loteEm)) / 60_000));
  if (volumeUn <= 0) return { preso: false, presoMin: null, naFilaMin };
  const limiteMs = Date.parse(loteEm) + tempoMin * 60_000;
  if (asOfMs <= limiteMs) return { preso: false, presoMin: null, naFilaMin };
  return {
    preso: true,
    presoMin: Math.floor((asOfMs - limiteMs) / 60_000),
    naFilaMin,
  };
}

function montarItem(
  op: FluxoFilasOpInput,
  volumeUn: number,
  preso: { preso: boolean; presoMin: number | null; naFilaMin: number | null },
  ultimoLoteEm: string | null,
  origem: FluxoFilaItemOrigem = 'op_do_dia',
): FluxoFilaItem {
  return {
    ordemProducaoId: op.id,
    ordemPlanejamento: op.ordemPlanejamento,
    produtoNome: op.produtoNome,
    assadeiraNome: op.assadeiraNome,
    observacao: op.observacao,
    volumeUn,
    ...preso,
    ultimoLoteEm,
    dataOp: origem === 'sem_op' ? null : op.dataProducao,
    origem,
  };
}

function montarResumo(items: FluxoFilaItem[]): FluxoFilaResumo {
  const totalUn = items
    .filter((i) => i.origem === 'op_do_dia')
    .reduce((t, i) => t + i.volumeUn, 0);
  const anteriorUn = items
    .filter((i) => i.origem !== 'op_do_dia')
    .reduce((t, i) => t + i.volumeUn, 0);
  const presoUn = items.filter((i) => i.preso).reduce((t, i) => t + i.volumeUn, 0);
  return { totalUn, anteriorUn, presoUn, items };
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
  constructor(
    private readonly embPorOp = new FluxoFilasEmbPorOp(),
    private readonly loteSaldo = new FluxoFilasLoteSaldo(),
    private readonly embItems = new FluxoFilasEmbItems(),
  ) {}

  build(input: FluxoFilasBuilderInput): FluxoFilasDia | null {
    if (input.ops.length === 0) return null;
    const ops = [...input.ops].sort((a, b) => a.ordemPlanejamento - b.ordemPlanejamento);
    const aloc = this.embPorOp.alocar(input.eventosEmb);
    const idsDia = new Set(ops.map((o) => o.id));
    const idsAnt = new Set(input.opsAnteriores.map((o) => o.id));

    const aProduzir: FluxoFilaItem[] = [];
    const fermentando: FluxoFilaItem[] = [];
    const resfriando: FluxoFilaItem[] = [];
    const embaladoDia: FluxoFilaItem[] = [];

    for (const op of ops) {
      const embUn = aloc.unPorOp.get(op.id) ?? 0;
      const filas = this.classificarOp(
        op,
        input,
        embUn,
        aloc.ultimoLoteEmPorOp.get(op.id) ?? null,
      );
      aProduzir.push(...filas.aProduzir);
      fermentando.push(...filas.fermentando);
      resfriando.push(...filas.resfriando);
      embaladoDia.push(...filas.embalado);
    }

    const embalado = [
      ...ordenarItems(embaladoDia),
      ...this.embItems.anteriores(input.opsAnteriores, aloc, idsDia),
      ...this.embItems.semOp(aloc, idsDia, idsAnt),
    ];

    return {
      aProduzir: montarResumo(ordenarItems(aProduzir)),
      fermentando: montarResumo(ordenarItems(fermentando)),
      resfriando: montarResumo(ordenarItems(resfriando)),
      embalado: montarResumo(embalado),
    };
  }

  private classificarOp(
    op: FluxoFilasOpInput,
    input: FluxoFilasBuilderInput,
    embUn: number,
    embLoteEm: string | null,
  ): OpFilas {
    const fermUn = somaUn(input.eventosFerm, op.id);
    const fornoUn = somaUn(input.eventosForno, op.id);
    return {
      aProduzir: this.itemSemPrazo(op, Math.max(0, op.unidades - fermUn)),
      fermentando: this.itensDeLotes(
        op,
        this.loteSaldo.restantes(lotesDaOp(input.eventosFerm, op.id), fornoUn),
        input.camaraMin,
        input.asOfMs,
      ),
      resfriando: this.itensDeLotes(
        op,
        this.loteSaldo.restantes(lotesDaOp(input.eventosForno, op.id), embUn),
        input.resfrioMin,
        input.asOfMs,
      ),
      embalado: this.embItems.doDia(op, embUn, embLoteEm),
    };
  }

  private itemSemPrazo(op: FluxoFilasOpInput, volumeUn: number): FluxoFilaItem[] {
    if (volumeUn <= 0) return [];
    return [montarItem(op, volumeUn, { preso: false, presoMin: null, naFilaMin: null }, null)];
  }

  private itensDeLotes(
    op: FluxoFilasOpInput,
    lotes: { produzidoEm: string; volumeUn: number }[],
    tempoMin: number,
    asOfMs: number,
  ): FluxoFilaItem[] {
    return lotes.map((lote) =>
      montarItem(
        op,
        lote.volumeUn,
        calcPreso(lote.volumeUn, lote.produzidoEm, tempoMin, asOfMs),
        lote.produzidoEm,
      ),
    );
  }
}

import type {
  FluxoFilaItem,
  FluxoFilasDia,
} from '@/domain/fluxo-processo/filas/fluxo-filas-types';
import type {
  PainelEtapaTvFilaEtapa,
  PainelEtapaTvFilaLtConverter,
  PainelEtapaTvFilaOp,
  PainelEtapaTvFilaOpProgresso,
} from './painel-etapa-tv-fila-op';

type Acc = {
  ordemId: string;
  produtoNome: string;
  assadeiraNome: string;
  observacao: string;
  prontoUn: number;
  relogioUn: number;
  gateUn: number;
  oldestLoteEm: string | null;
  oldestNaFilaMin: number;
  embaladoUn: number;
};

function emptyAcc(item: FluxoFilaItem): Acc {
  return {
    ordemId: item.ordemProducaoId,
    produtoNome: item.produtoNome,
    assadeiraNome: item.assadeiraNome,
    observacao: item.observacao,
    prontoUn: 0,
    relogioUn: 0,
    gateUn: 0,
    oldestLoteEm: null,
    oldestNaFilaMin: 0,
    embaladoUn: 0,
  };
}

function touchOldest(acc: Acc, item: FluxoFilaItem): void {
  const loteEm = item.ultimoLoteEm;
  if (!loteEm) return;
  if (!acc.oldestLoteEm || loteEm < acc.oldestLoteEm) {
    acc.oldestLoteEm = loteEm;
    acc.oldestNaFilaMin = Math.max(0, item.naFilaMin ?? 0);
  }
}

function addGateItems(accByOp: Map<string, Acc>, items: FluxoFilaItem[]): void {
  for (const item of items) {
    if (item.volumeUn <= 0) continue;
    const acc = accByOp.get(item.ordemProducaoId) ?? emptyAcc(item);
    acc.gateUn += item.volumeUn;
    if (item.preso) acc.prontoUn += item.volumeUn;
    else acc.relogioUn += item.volumeUn;
    touchOldest(acc, item);
    accByOp.set(item.ordemProducaoId, acc);
  }
}

function addVolumeByOp(
  accByOp: Map<string, Acc>,
  items: FluxoFilaItem[],
  field: 'vindoExtra' | 'embalado',
): Map<string, number> {
  const extra = new Map<string, number>();
  for (const item of items) {
    if (item.volumeUn <= 0) continue;
    if (field === 'embalado') {
      const acc = accByOp.get(item.ordemProducaoId);
      if (acc) acc.embaladoUn += item.volumeUn;
      continue;
    }
    extra.set(
      item.ordemProducaoId,
      (extra.get(item.ordemProducaoId) ?? 0) + item.volumeUn,
    );
  }
  return extra;
}

function sumItemsUn(items: FluxoFilaItem[], ordemId: string): number {
  let total = 0;
  for (const item of items) {
    if (item.ordemProducaoId === ordemId) total += item.volumeUn;
  }
  return total;
}

/**
 * Agrupa filas WIP por OP e monta o DTO da fila da etapa anterior (em LT).
 */
export class PainelEtapaTvFilaAggregator {
  static build(
    filas: FluxoFilasDia,
    etapa: PainelEtapaTvFilaEtapa,
    converter: PainelEtapaTvFilaLtConverter,
    progressoByOp: ReadonlyMap<string, PainelEtapaTvFilaOpProgresso> = new Map(),
  ): PainelEtapaTvFilaOp[] {
    const gateItems =
      etapa === 'forno' ? filas.fermentando.items : filas.resfriando.items;
    const accByOp = new Map<string, Acc>();
    addGateItems(accByOp, gateItems);

    const aProduzirExtra = addVolumeByOp(accByOp, filas.aProduzir.items, 'vindoExtra');
    if (etapa === 'embalagem') {
      addVolumeByOp(accByOp, filas.embalado.items, 'embalado');
    }

    const result: PainelEtapaTvFilaOp[] = [];
    for (const acc of accByOp.values()) {
      if (acc.gateUn <= 0 || !acc.oldestLoteEm) continue;

      let vindoExtraUn = aProduzirExtra.get(acc.ordemId) ?? 0;
      if (etapa === 'embalagem') {
        vindoExtraUn += sumItemsUn(filas.fermentando.items, acc.ordemId);
      }

      const progresso = progressoByOp.get(acc.ordemId);
      const feitoLt =
        etapa === 'embalagem'
          ? roundLt(converter.unToLt(acc.embaladoUn, acc.assadeiraNome))
          : roundLt(progresso?.feitoLt ?? 0);

      result.push({
        ordemId: acc.ordemId,
        produtoNome: acc.produtoNome,
        assadeiraNome: acc.assadeiraNome,
        observacao: acc.observacao,
        prontoLt: roundLt(converter.unToLt(acc.prontoUn, acc.assadeiraNome)),
        vindoLt: roundLt(
          converter.unToLt(acc.relogioUn + vindoExtraUn, acc.assadeiraNome),
        ),
        feitoLt,
        metaLt: progresso?.metaLt ?? null,
        oldestLoteEm: acc.oldestLoteEm,
        oldestNaFilaMin: acc.oldestNaFilaMin,
      });
    }
    return result;
  }
}

function roundLt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

import type { FluxoFilasEmbAlocacao } from './fluxo-filas-emb-por-op';
import type {
  FluxoFilaItem,
  FluxoFilaItemOrigem,
  FluxoFilasOpInput,
} from './fluxo-filas-types';

const SEM_PRAZO = { preso: false, presoMin: null, naFilaMin: null } as const;

function montar(
  op: FluxoFilasOpInput,
  volumeUn: number,
  ultimoLoteEm: string | null,
  origem: FluxoFilaItemOrigem,
): FluxoFilaItem {
  return {
    ordemProducaoId: op.id,
    ordemPlanejamento: op.ordemPlanejamento,
    produtoNome: op.produtoNome,
    assadeiraNome: op.assadeiraNome,
    observacao: op.observacao,
    volumeUn,
    ...SEM_PRAZO,
    ultimoLoteEm,
    dataOp: origem === 'sem_op' ? null : op.dataProducao,
    origem,
  };
}

function opSintetica(
  id: string,
  produtoNome: string,
  assadeiraNome: string,
): FluxoFilasOpInput {
  return {
    id,
    ordemPlanejamento: 0,
    produtoNome,
    assadeiraNome,
    observacao: '',
    unidades: 0,
    latas: 0,
    caixas: 0,
    dataProducao: '',
  };
}

function ordenarAnteriores(items: FluxoFilaItem[]): FluxoFilaItem[] {
  return [...items].sort((a, b) => {
    const dataCmp = (b.dataOp ?? '').localeCompare(a.dataOp ?? '');
    if (dataCmp !== 0) return dataCmp;
    return a.ordemPlanejamento - b.ordemPlanejamento;
  });
}

export class FluxoFilasEmbItems {
  doDia(
    op: FluxoFilasOpInput,
    volumeUn: number,
    ultimoLoteEm: string | null,
  ): FluxoFilaItem[] {
    if (volumeUn <= 0) return [];
    return [montar(op, volumeUn, ultimoLoteEm, 'op_do_dia')];
  }

  anteriores(
    opsAnteriores: FluxoFilasOpInput[],
    aloc: FluxoFilasEmbAlocacao,
    idsDia: Set<string>,
  ): FluxoFilaItem[] {
    const items: FluxoFilaItem[] = [];
    for (const op of opsAnteriores) {
      if (idsDia.has(op.id)) continue;
      const volumeUn = aloc.unPorOp.get(op.id) ?? 0;
      if (volumeUn <= 0) continue;
      items.push(
        montar(op, volumeUn, aloc.ultimoLoteEmPorOp.get(op.id) ?? null, 'op_anterior'),
      );
    }
    return ordenarAnteriores(items);
  }

  semOp(
    aloc: FluxoFilasEmbAlocacao,
    idsDia: Set<string>,
    idsAnt: Set<string>,
  ): FluxoFilaItem[] {
    const items: FluxoFilaItem[] = [];
    for (const linha of aloc.semOpPorProduto.values()) {
      const op = opSintetica('', linha.produtoNome, linha.assadeiraNome);
      items.push(montar(op, linha.volumeUn, linha.ultimoLoteEm, 'sem_op'));
    }
    for (const [opId, volumeUn] of aloc.unPorOp) {
      if (idsDia.has(opId) || idsAnt.has(opId) || volumeUn <= 0) continue;
      const op = opSintetica(
        opId,
        aloc.produtoNomePorOp.get(opId) ?? 'Desconhecido',
        aloc.assadeiraNomePorOp.get(opId) ?? '',
      );
      items.push(
        montar(op, volumeUn, aloc.ultimoLoteEmPorOp.get(opId) ?? null, 'sem_op'),
      );
    }
    return items.sort((a, b) => a.produtoNome.localeCompare(b.produtoNome));
  }
}

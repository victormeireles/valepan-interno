import type {
  EtapaDashboardItem,
  EtapaDashboardSnapshot,
  PainelOrdemEtapa,
} from '@/domain/types/painel-etapa';

export function isOrdemContaAssadeirasDashboard(ordem: PainelOrdemEtapa): boolean {
  return ordem.modoQuantidade === 'assadeiras' && ordem.pedido.assadeiras > 0;
}

export function ordensToDashboardSnapshots(
  ordens: PainelOrdemEtapa[],
): EtapaDashboardSnapshot[] {
  const items: EtapaDashboardSnapshot[] = [];

  for (const ordem of ordens) {
    if (!isOrdemContaAssadeirasDashboard(ordem)) continue;

    items.push({
      assadeiras: 0,
      pedidoAssadeiras: ordem.pedido.assadeiras,
    });

    for (const lote of ordem.lotes) {
      items.push({
        assadeiras: lote.assadeiras,
        pedidoAssadeiras: 0,
        produzidoEm: lote.produzidoEm,
      });
    }
  }

  return items;
}

export function ordensToDashboardItems(ordens: PainelOrdemEtapa[]): EtapaDashboardItem[] {
  return ordensToDashboardSnapshots(ordens);
}

export function snapshotsToDashboardItems(
  snapshots: EtapaDashboardSnapshot[],
): EtapaDashboardItem[] {
  return snapshots.map((snapshot) => ({ ...snapshot }));
}

/**
 * Produzido vs plano do dia: só lotes cuja OP é da data selecionada.
 * Lote noturno de OP de amanhã não entra no 31/08.
 */
export function lotesDaDataOp<T extends { ordemProducaoId: string }>(
  lotes: T[],
  dataProducaoByOrdemId: ReadonlyMap<string, string>,
  dateISO: string,
): T[] {
  return lotes.filter(
    (lote) => dataProducaoByOrdemId.get(lote.ordemProducaoId) === dateISO,
  );
}

export function mapaDataProducaoOrdens(
  ordens: Array<{ id: string; dataProducao: string }>,
): Map<string, string> {
  return new Map(ordens.map((ordem) => [ordem.id, ordem.dataProducao]));
}

export function lotesDashboardEtapaDia<T extends { ordemProducaoId: string }>(
  lotes: T[],
  visivelOrdemIds: ReadonlySet<string>,
  dataProducaoByOrdemId: ReadonlyMap<string, string>,
  dateISO: string,
): T[] {
  return lotesDaDataOp(
    lotes.filter((lote) => visivelOrdemIds.has(lote.ordemProducaoId)),
    dataProducaoByOrdemId,
    dateISO,
  );
}

export function lotesToDashboardSnapshots(
  lotes: Array<{ assadeiras: number; produzidoEm: string }>,
): EtapaDashboardSnapshot[] {
  const items: EtapaDashboardSnapshot[] = [];
  for (const lote of lotes) {
    if (lote.assadeiras <= 0) continue;
    items.push({
      assadeiras: lote.assadeiras,
      pedidoAssadeiras: 0,
      produzidoEm: lote.produzidoEm,
    });
  }
  return items;
}

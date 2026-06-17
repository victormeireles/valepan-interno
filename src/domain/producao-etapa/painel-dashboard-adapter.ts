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

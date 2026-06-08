import type { EmbalagemDashboardItem } from '@/components/Realizado/EmbalagemDashboard';
import type {
  DashboardSnapshot,
  PainelPedidoEmbalagem,
} from '@/domain/types/painel-embalagem';
import { derivarUnidadePrincipal } from '@/domain/embalagem/painel-quantidade';

/** Payload mínimo para comparações do dashboard (sem fotos). */
export function pedidosToDashboardSnapshots(
  pedidos: PainelPedidoEmbalagem[],
): DashboardSnapshot[] {
  const items: DashboardSnapshot[] = [];

  for (const p of pedidos) {
    items.push({
      caixas: 0,
      pacotes: 0,
      pedidoCaixas: p.pedido.caixas,
      pedidoPacotes: p.pedido.pacotes,
      producaoUpdatedAt: p.producaoUpdatedAt,
    });

    for (const l of p.lotes) {
      items.push({
        caixas: l.quantidade.caixas,
        pacotes: l.quantidade.pacotes,
        pedidoCaixas: 0,
        pedidoPacotes: 0,
        producaoUpdatedAt: l.produzidoEm,
      });
    }
  }

  return items;
}

/** Adapta pedidos canônicos para o EmbalagemDashboard (meta por pedido, hourly por lote). */
export function pedidosToDashboardItems(
  pedidos: PainelPedidoEmbalagem[],
): EmbalagemDashboardItem[] {
  const items: EmbalagemDashboardItem[] = [];

  for (const p of pedidos) {
    items.push({
      cliente: p.cliente,
      produto: p.produto,
      produzido: p.produzidoScalar,
      aProduzir: p.aProduzir,
      caixas: 0,
      pacotes: 0,
      pedidoCaixas: p.pedido.caixas,
      pedidoPacotes: p.pedido.pacotes,
      producaoUpdatedAt: p.producaoUpdatedAt,
    });

    for (const l of p.lotes) {
      const { unidade, valor } = derivarUnidadePrincipal(l.quantidade);
      items.push({
        cliente: p.cliente,
        produto: p.produto,
        produzido: valor,
        aProduzir: valor,
        caixas: l.quantidade.caixas,
        pacotes: l.quantidade.pacotes,
        pedidoCaixas: 0,
        pedidoPacotes: 0,
        producaoUpdatedAt: l.produzidoEm,
        pacoteFotoUrl: l.pacoteFotoUrl,
        etiquetaFotoUrl: l.etiquetaFotoUrl,
        palletFotoUrl: l.palletFotoUrl,
      });
      void unidade;
    }
  }

  return items;
}

/** Converte snapshots da API em items do dashboard (colunas de comparação). */
export function snapshotsToDashboardItems(
  snapshots: DashboardSnapshot[],
): EmbalagemDashboardItem[] {
  return snapshots.map((s) => ({
    cliente: '',
    produto: '',
    produzido: s.caixas,
    aProduzir: s.pedidoCaixas,
    caixas: s.caixas,
    pacotes: s.pacotes,
    pedidoCaixas: s.pedidoCaixas,
    pedidoPacotes: s.pedidoPacotes,
    producaoUpdatedAt: s.producaoUpdatedAt,
  }));
}

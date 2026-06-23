import type { RealizadoEtapaToolbarMetrics } from '@/components/Realizado/etapa/types';
import { pedidoUsaCaixasOuPacotes } from '@/domain/embalagem/painel-quantidade';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';

function formatToolbarOpLabel(metaOp: number): string {
  return `OP: ${metaOp.toLocaleString('pt-BR')} CX`;
}

export function buildEmbalagemToolbarMetrics(
  pedidos: PainelPedidoEmbalagem[],
): RealizadoEtapaToolbarMetrics {
  const relevantes = pedidos.filter((pedido) => pedidoUsaCaixasOuPacotes(pedido.pedido));

  const produzido = relevantes.reduce((sum, pedido) => sum + pedido.produzido.caixas, 0);
  const meta = relevantes.reduce((sum, pedido) => sum + pedido.metaEfetiva, 0);
  const metaOp = relevantes.reduce((sum, pedido) => sum + pedido.metaPlanejada, 0);
  const falta = Math.max(0, meta - produzido);
  const progressoPct = meta > 0 ? Math.min(100, (produzido / meta) * 100) : 0;

  return {
    produzido,
    meta,
    falta,
    progressoPct,
    metaAtingida: falta === 0,
    toolbarSecondaryLabel:
      metaOp !== meta ? formatToolbarOpLabel(metaOp) : undefined,
  };
}

import type { ProductionStatus } from '@/domain/types/realizado';
import { getProductionStatus } from '@/domain/types/realizado';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import { isPedidoEmbalagemFinalizado } from '@/domain/realizado/painel-pedido-adapter';

export type EmbalagemFilterStatus = 'todos' | 'pendente' | 'andamento' | 'concluido';

export function getEmbalagemProductionStatus(
  produzido: number,
  meta: number,
  override?: ProductionStatus,
): ProductionStatus {
  return override ?? getProductionStatus(produzido, meta);
}

export function getPedidoEmbalagemFilterStatus(
  pedido: PainelPedidoEmbalagem,
): Exclude<EmbalagemFilterStatus, 'todos'> {
  if (isPedidoEmbalagemFinalizado(pedido)) return 'concluido';
  if (pedido.produzidoScalar === 0) return 'pendente';
  return 'andamento';
}

export function embalagemStatusStyles(status: ProductionStatus) {
  switch (status) {
    case 'not-started':
      return {
        dot: 'bg-danger',
        border: 'border-l-danger',
        fill: 'bg-danger',
      };
    case 'partial':
      return {
        dot: 'bg-accent',
        border: 'border-l-accent',
        fill: 'bg-accent',
      };
    case 'complete':
      return {
        dot: 'bg-success',
        border: 'border-l-success',
        fill: 'bg-success',
      };
  }
}

import { normalizeObservacao } from '@/domain/embalagem/pedido-key';
import type { PedidoEmbalagemKey } from '@/domain/types/pedido-embalagem';

export function loteToPedidoKey(input: {
  dataPedido: string;
  dataFabricacao: string;
  tipoEstoqueId: string;
  produtoId: string;
  observacaoCliente: string;
  assadeiraId: string;
}): PedidoEmbalagemKey {
  return {
    dataProducao: input.dataPedido,
    dataFabricacaoEtiqueta: input.dataFabricacao,
    tipoEstoqueId: input.tipoEstoqueId,
    produtoId: input.produtoId,
    observacao: normalizeObservacao(input.observacaoCliente),
    assadeiraId: input.assadeiraId,
  };
}

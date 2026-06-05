import type { Quantidade } from '@/domain/types/inventario';

export type PedidoEmbalagemKey = {
  dataProducao: string;
  dataFabricacaoEtiqueta: string;
  tipoEstoqueId: string;
  produtoId: string;
  observacao: string;
};

export type PedidoEmbalagemUpsert = PedidoEmbalagemKey & {
  quantidade: Quantidade;
};

export type PedidoEmbalagemRecord = PedidoEmbalagemUpsert & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type AggregatedPedidoFromSheet = PedidoEmbalagemUpsert;

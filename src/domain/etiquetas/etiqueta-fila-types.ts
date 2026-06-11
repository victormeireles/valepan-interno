import type { Quantidade } from '@/domain/types/inventario';

export type EtiquetaFilaSortable = {
  pedidoEmbalagemId: string;
  lote: number | null;
  pedidoCreatedAt: string;
  primeiroLoteCreatedAt?: string;
};

export type EtiquetaFilaOrigem = 'pedido' | 'manual';

export type EtiquetaFilaItem = EtiquetaFilaSortable & {
  origem: EtiquetaFilaOrigem;
  etiquetaGeradaId?: string;
  produto: string;
  produtoId: string;
  tipoEstoque: string;
  tipoEstoqueId: string;
  dataFabricacao: string;
  pedido: Quantidade;
  produzido: Quantidade;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  geradoEm?: string;
  primeiroLoteHorario?: string;
};

export type EtiquetaFilaResponse = {
  date: string;
  pendentes: EtiquetaFilaItem[];
  gerados: EtiquetaFilaItem[];
};

export type GerarEtiquetaPayload = {
  produtoId: string;
  tipoEstoqueId: string;
  dataFabricacao: string;
  modo: 'pedido' | 'manual';
  ordemProducaoId?: string;
  nomeEtiqueta?: string;
  diasValidade?: number;
  diasValidadeCongelado?: number;
};

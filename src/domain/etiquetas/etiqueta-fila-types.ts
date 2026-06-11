import type { Quantidade } from '@/domain/types/inventario';

export type EtiquetaFilaSortable = {
  pedidoEmbalagemId: string;
  lote: number | null;
  pedidoCreatedAt: string;
};

export type EtiquetaFilaItem = EtiquetaFilaSortable & {
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

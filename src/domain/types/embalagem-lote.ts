import type { Quantidade } from './inventario';

export type EmbalagemLoteModo = 'parcial' | 'substituicao' | 'importado';

export interface EmbalagemLoteFotos {
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
}

export interface EmbalagemLoteInsert {
  modo: EmbalagemLoteModo;
  planilhaRowId: number;
  planilhaRowIdOrigem?: number | null;
  pedidoEmbalagemId?: string | null;
  dataPedido: string;
  dataFabricacao: string;
  tipoEstoqueId: string;
  produtoId: string;
  congelado: 'Sim' | 'Não';
  lote?: number | null;
  quantidade: Quantidade;
  produzidoEm: string;
  obsEmbalagem?: string | null;
  fotos?: EmbalagemLoteFotos;
  producaoAnterior?: Quantidade | null;
}

export interface EmbalagemLoteRecord extends EmbalagemLoteInsert {
  id: string;
  createdAt: string;
}

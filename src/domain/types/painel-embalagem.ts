import type { Quantidade } from '@/domain/types/inventario';

export type PainelLoteEmbalagem = {
  loteId: string;
  modo: 'parcial' | 'substituicao' | 'importado';
  quantidade: Quantidade;
  produzidoEm: string;
  obsEmbalagem?: string;
  congelado: 'Sim' | 'Não';
  lote?: number | null;
  pacoteFotoUrl?: string;
  pacoteFotoId?: string;
  pacoteFotoUploadedAt?: string;
  etiquetaFotoUrl?: string;
  etiquetaFotoId?: string;
  etiquetaFotoUploadedAt?: string;
  palletFotoUrl?: string;
  palletFotoId?: string;
  palletFotoUploadedAt?: string;
};

export type PainelPedidoEmbalagem = {
  pedidoEmbalagemId: string;
  cliente: string;
  produto: string;
  observacao: string;
  dataPedido: string;
  dataFabricacao: string;
  congelado?: 'Sim' | 'Não';
  pedido: Quantidade;
  produzido: Quantidade;
  unidade: 'cx' | 'pct' | 'un' | 'kg';
  aProduzir: number;
  produzidoScalar: number;
  possuiEtiqueta: boolean;
  lote?: number;
  lotes: PainelLoteEmbalagem[];
  producaoUpdatedAt?: string;
};

export type PainelEmbalagemResponse = {
  date: string;
  pedidos: PainelPedidoEmbalagem[];
};

export type DashboardSnapshot = {
  caixas: number;
  pacotes: number;
  pedidoCaixas: number;
  pedidoPacotes: number;
  producaoUpdatedAt?: string;
};

export type CargaEmbalagemResponse = {
  date: string;
  ultimaDataComDados: string | null;
  pedidos: PainelPedidoEmbalagem[];
  comparacaoSemana: {
    date: string;
    items: DashboardSnapshot[];
  };
  comparacaoAnterior: {
    date: string | null;
    items: DashboardSnapshot[];
  };
};

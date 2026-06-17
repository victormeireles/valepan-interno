import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { ProducaoLoteModo } from '@/domain/types/fermentacao-lote';

export type ModoQuantidadePainelEtapa = 'assadeiras' | 'unidades';

export type PainelEtapaResponse = {
  date: string;
  ordens: PainelOrdemEtapa[];
};

export type PainelOrdemEtapa = {
  ordemProducaoId: string;
  produto: string;
  tipoEstoque: string;
  observacao: string;
  dataProducao: string;
  modoQuantidade: ModoQuantidadePainelEtapa;
  pedido: EtapaQuantidade;
  produzidoBreakdown: EtapaQuantidade;
  unidade: 'lt' | 'un';
  aProduzir: number;
  produzido: number;
  assadeiraNome?: string;
  lotes: PainelLoteEtapa[];
};

export type PainelLoteEtapa = {
  loteId: string;
  modo: ProducaoLoteModo;
  assadeiras: number;
  unidades: number;
  produzidoEm: string;
  fotoUrl?: string;
  fotoId?: string;
  fotoUploadedAt?: string;
};

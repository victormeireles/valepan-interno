import type { EtapaCascataDisplay } from '@/domain/producao-etapa/etapa-cascata-display';
import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { ProducaoLoteModo } from '@/domain/types/fermentacao-lote';

export type ModoQuantidadePainelEtapa = 'assadeiras' | 'unidades';

export type PainelEtapaResponse = {
  date: string;
  ordens: PainelOrdemEtapa[];
};

export type PainelOrdemEtapa = {
  ordemProducaoId: string;
  ordemPlanejamento: number;
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
  metaPlanejada: number;
  metaEfetiva: number;
  metaReferencia: number;
  estimativaAnterior?: number | null;
  finalizada: boolean;
  cascata?: EtapaCascataDisplay;
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

export type EtapaDashboardSnapshot = {
  assadeiras: number;
  pedidoAssadeiras: number;
  produzidoEm?: string;
};

export type EtapaDashboardItem = EtapaDashboardSnapshot;

export type CargaEtapaResponse = {
  date: string;
  ultimaDataComDados: string | null;
  ordens: PainelOrdemEtapa[];
  comparacaoSemana: { date: string; items: EtapaDashboardSnapshot[] };
  comparacaoAnterior: { date: string | null; items: EtapaDashboardSnapshot[] };
};

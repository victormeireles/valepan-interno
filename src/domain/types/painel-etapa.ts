import type { EtapaCascataDisplay } from '@/domain/producao-etapa/etapa-cascata-display';
import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { ProducaoTurnoCargaDto } from '@/domain/producao-turno/producao-turno-carga';
import type { ProducaoTurnoNumero } from '@/domain/producao-turno/producao-turno-types';
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
  /** Cor cadastrada da assadeira (#RRGGBB). */
  assadeiraCorHex?: string;
  /** Produto com >1 assadeira cadastrada (exceção/regra) — controla a tag no card. */
  temMultiplasAssadeirasCadastradas?: boolean;
  /** false = fora do recorte hamb/hot (Broa, pão). Toolbar e totais LT ignoram. */
  incluirNosTotais?: boolean;
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
  turno?: ProducaoTurnoNumero | null;
  criadoPorNome?: string | null;
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
  dashboardDia: EtapaDashboardSnapshot[];
  comparacaoSemana: { date: string; items: EtapaDashboardSnapshot[] };
  comparacaoAnterior: { date: string | null; items: EtapaDashboardSnapshot[] };
} & ProducaoTurnoCargaDto;

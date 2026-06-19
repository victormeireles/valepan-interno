import type { ReactNode } from 'react';
import type { ProductionStatus } from '@/domain/types/realizado';
import type { QuantityBreakdownEntry } from '@/domain/valueObjects/QuantityBreakdown';
import type { EmbalagemDashboardItem } from '@/components/Realizado/EmbalagemDashboard';
import type { EtapaDashboardItem } from '@/domain/types/painel-etapa';

export type RealizadoEtapaUnit = 'cx' | 'lt';

export type RealizadoEtapaDashboardType = 'hora' | 'resumo';

export type EtapaFilterStatus = 'todos' | 'pendente' | 'andamento' | 'concluido';

export type RealizadoEtapaAccent = 'amber' | 'gold' | 'brasa' | 'vinho' | 'orange' | 'sky' | 'rose';

export type RealizadoEtapaConfig = {
  /** Rótulo superior fixo — ex.: "Realizado" */
  title: string;
  /** Nome da etapa no título — ex.: "Embalagem" */
  stageName: string;
  /** Ligature Material Icons */
  icon: string;
  unit: RealizadoEtapaUnit;
  /** Nome da unidade por extenso — ex.: "caixas" */
  unitName: string;
  addLabel: string;
  summaryLabel: string;
  remainingLabel: string;
  /** Cor de destaque da etapa */
  accent: RealizadoEtapaAccent;
  /** Cor de fundo da página — diferencia etapas no chão de fábrica */
  pageBackground: string;
  dashboard: RealizadoEtapaDashboardType;
  /** Rótulo da métrica na toolbar — ex.: "Embalado" */
  toolbarMetricLabel: string;
  /** Exibe meta, barra de progresso e comparação produzido/meta (padrão: true) */
  hasMeta?: boolean;
  /** Mantém o botão de novo lote mesmo em itens/grupos finalizados */
  alwaysShowAddLote?: boolean;
  /** Botão secundário opcional na toolbar — ex.: "Nova saída" */
  extraActionLabel?: string;
};

export type EtapaLotePhotoLink = {
  label: string;
  url: string;
  emoji?: string;
};

export type EtapaLoteItem = {
  id: string;
  index: number;
  produzidoLabel: string;
  horario?: string;
  hasPhoto?: boolean;
  photoColor?: 'white' | 'yellow' | 'red';
  photoLinks?: EtapaLotePhotoLink[];
  canEdit?: boolean;
  canDelete?: boolean;
  isLoading?: boolean;
  isDeleting?: boolean;
  isLast?: boolean;
  editLabel?: string;
};

export type EtapaProductItem = {
  id: string;
  produto: string;
  congelado?: boolean;
  assadeira?: string;
  hasPhoto?: boolean;
  photoUrl?: string;
  horario?: string;
  somaProduzido: number;
  somaAProduzir: number;
  unidade: string;
  detalhesProduzido: QuantityBreakdownEntry[];
  detalhesMeta: QuantityBreakdownEntry[];
  filterStatus: Exclude<EtapaFilterStatus, 'todos'>;
  productionStatusOverride?: ProductionStatus;
  showAddLote: boolean;
  isNovoLoteLoading?: boolean;
  lotes: EtapaLoteItem[];
};

export type EtapaClientGroupData = {
  key: string;
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  /** Lista plana sem cabeçalho de grupo (fermentação/forno) */
  hideHeader?: boolean;
  products: EtapaProductItem[];
};

export type RealizadoEtapaWorklistData = {
  gruposAtivos: EtapaClientGroupData[];
  gruposFinalizados: EtapaClientGroupData[];
  filterCounts: Record<EtapaFilterStatus, number>;
  selectedDate: string;
};

export type RealizadoEtapaToolbarMetrics = {
  produzido: number;
  meta: number;
  falta: number;
  progressoPct: number;
  metaAtingida: boolean;
};

export type RealizadoEtapaDashboardHoraData = {
  items: EmbalagemDashboardItem[];
  comparisonPrev: { date: string; items: EmbalagemDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EmbalagemDashboardItem[] };
};

export type RealizadoEtapaDashboardHoraLatasData = {
  items: EtapaDashboardItem[];
  comparisonPrev: { date: string; items: EtapaDashboardItem[] } | null;
  comparisonWeek: { date: string; items: EtapaDashboardItem[] };
};

export type SaidasDashboardItem = {
  caixas: number;
  saidaUpdatedAt?: string;
};

export type RealizadoEtapaDashboardSaidasData = {
  items: SaidasDashboardItem[];
  comparisonPrev: { date: string; items: SaidasDashboardItem[] } | null;
  comparisonWeek: { date: string; items: SaidasDashboardItem[] };
  totalCaixas: number;
};

export type RealizadoEtapaDashboardResumoData = {
  produzido: number;
  meta: number;
  falta: number;
  progressoPct: number;
};

export type RealizadoEtapaFooterStats = {
  grupos: number;
  pedidos: number;
  produzidoLabel: string;
  metaLabel: string;
  /** Substitui o rodapé padrão quando definido */
  customLine?: string;
};

export type RealizadoEtapaCallbacks = {
  onNovoLote: (productId: string) => void;
  onEditLote: (loteId: string) => void;
  onDeleteLote: (loteId: string) => void;
};

export type RealizadoEtapaProps = {
  config: RealizadoEtapaConfig;
  selectedDate: string;
  onDateChange: (date: string) => void;
  toolbar: RealizadoEtapaToolbarMetrics;
  loading: boolean;
  refreshing: boolean;
  message: string | null;
  worklist: RealizadoEtapaWorklistData;
  dashboardHora?: RealizadoEtapaDashboardHoraData;
  dashboardHoraLatas?: RealizadoEtapaDashboardHoraLatasData;
  dashboardSaidas?: RealizadoEtapaDashboardSaidasData;
  dashboardResumo?: RealizadoEtapaDashboardResumoData;
  footer: RealizadoEtapaFooterStats;
  callbacks: RealizadoEtapaCallbacks;
  /** Substitui config.hasMeta quando informado */
  hasMeta?: boolean;
  onExtraAction?: () => void;
  /** Slot opcional após o conteúdo principal (ex.: modal backdrop) */
  overlaySlot?: ReactNode;
};

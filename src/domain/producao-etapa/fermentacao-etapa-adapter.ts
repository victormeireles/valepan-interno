import type { RealizadoEtapaConfig } from '@/components/Realizado/etapa/types';
import {
  buildEtapaOrdemLookup,
  buildEtapaOrdemLoteLookup,
  buildEtapaOrdemWorklistData,
} from './etapa-ordem-worklist-adapter';

export const FERMENTACAO_ETAPA_CONFIG: RealizadoEtapaConfig = {
  title: 'Realizado',
  stageName: 'Fermentação',
  icon: 'bakery_dining',
  unit: 'lt',
  unitName: 'Latas',
  addLabel: 'Lote',
  summaryLabel: 'Produzido no dia',
  remainingLabel: 'Falta produzir',
  accent: 'gold',
  pageBackground: '#F8F7F1',
  dashboard: 'hora',
  toolbarMetricLabel: 'Produzido',
  alwaysShowAddLote: true,
};

export const buildFermentacaoWorklistData = buildEtapaOrdemWorklistData;
export const buildFermentacaoOrdemLookup = buildEtapaOrdemLookup;
export const buildFermentacaoLoteLookup = buildEtapaOrdemLoteLookup;

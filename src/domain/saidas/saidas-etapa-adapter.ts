import type {
  EtapaClientGroupData,
  EtapaFilterStatus,
  EtapaLoteItem,
  EtapaLotePhotoLink,
  EtapaProductItem,
  RealizadoEtapaConfig,
  RealizadoEtapaWorklistData,
} from '@/components/Realizado/etapa/types';
import {
  hasSaidaRegistrada,
} from '@/domain/saidas/saidas-dashboard-adapter';
import type { SaidaQuantidade, SaidaSheetRecord } from '@/domain/types/saidas';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';

export const SAIDAS_ETAPA_CONFIG: RealizadoEtapaConfig = {
  title: 'Realizado',
  stageName: 'Saídas',
  icon: 'local_shipping',
  unit: 'cx',
  unitName: 'Caixas',
  addLabel: 'Registrar',
  summaryLabel: 'Saídas no dia',
  remainingLabel: 'Pendente',
  accent: 'vinho',
  pageBackground: '#F3EFEF',
  dashboard: 'hora',
  toolbarMetricLabel: 'Total',
  hasMeta: false,
  extraActionLabel: 'Nova saída',
};

const PRIMARY_ORDER: Array<keyof SaidaQuantidade> = ['caixas', 'pacotes', 'unidades', 'kg'];

const UNIT_LABEL: Record<keyof SaidaQuantidade, string> = {
  caixas: 'cx',
  pacotes: 'pct',
  unidades: 'un',
  kg: 'kg',
};

function getPrimaryQuantity(realizado: SaidaQuantidade) {
  for (const key of PRIMARY_ORDER) {
    const value = realizado[key] || 0;
    if (value > 0) {
      return { unit: UNIT_LABEL[key], value };
    }
  }

  return {
    unit: 'cx',
    value:
      (realizado.caixas || 0) +
      (realizado.pacotes || 0) +
      (realizado.unidades || 0) +
      (realizado.kg || 0),
  };
}

function buildDetalhesProduzido(realizado: SaidaQuantidade) {
  return QuantityBreakdown.buildEntries([
    { quantidade: realizado.caixas, unidade: 'cx' },
    { quantidade: realizado.pacotes, unidade: 'pct' },
    { quantidade: realizado.unidades, unidade: 'un' },
    { quantidade: realizado.kg, unidade: 'kg' },
  ]);
}

function buildLotePhotoLinks(fotoUrl?: string): EtapaLotePhotoLink[] {
  if (!fotoUrl) return [];
  return [{ label: 'Foto da saída', url: fotoUrl }];
}

function getSaidaFilterStatus(item: SaidaSheetRecord): Exclude<EtapaFilterStatus, 'todos'> {
  return hasSaidaRegistrada(item.realizado, item.saidaUpdatedAt) ? 'concluido' : 'pendente';
}

function mapItemToProduct(
  item: SaidaSheetRecord,
  loadingCardId: string | null,
): EtapaProductItem {
  const registrado = hasSaidaRegistrada(item.realizado, item.saidaUpdatedAt);
  const detalhesProduzido = buildDetalhesProduzido(item.realizado);
  const primary = getPrimaryQuantity(item.realizado);
  const produzidoLabel = new QuantityBreakdown(detalhesProduzido).format(
    primary.value,
    primary.unit,
  );

  const lotes: EtapaLoteItem[] = registrado
    ? [
        {
          id: item.id,
          index: 1,
          produzidoLabel,
          horario: item.saidaUpdatedAt
            ? formatLocalTimeHHmm(item.saidaUpdatedAt) ?? undefined
            : undefined,
          hasPhoto: Boolean(item.fotoUrl),
          photoColor: 'white',
          photoLinks: buildLotePhotoLinks(item.fotoUrl),
          canEdit: true,
          canDelete: false,
          isLoading: loadingCardId === item.id,
          isLast: true,
          editLabel: `Editar saída de ${item.produto}`,
        },
      ]
    : [];

  return {
    id: item.id,
    produto: item.produto,
    hasPhoto: Boolean(item.fotoUrl),
    photoUrl: item.fotoUrl,
    horario: item.saidaUpdatedAt
      ? formatLocalTimeHHmm(item.saidaUpdatedAt) ?? undefined
      : undefined,
    somaProduzido: primary.value,
    somaAProduzir: 0,
    unidade: primary.unit,
    detalhesProduzido,
    detalhesMeta: [],
    filterStatus: getSaidaFilterStatus(item),
    productionStatusOverride: registrado ? 'complete' : 'not-started',
    showAddLote: true,
    isNovoLoteLoading: loadingCardId === item.id,
    lotes,
  };
}

type SaidasGroup = {
  key: string;
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  items: SaidaSheetRecord[];
  minRowId: string;
};

function groupSaidaItems(items: SaidaSheetRecord[], selectedDate: string): SaidasGroup[] {
  const groups: Record<string, SaidaSheetRecord[]> = {};

  for (const item of items) {
    const data = item.data || selectedDate;
    const obs = item.observacao?.trim() || '';
    const groupKey = `${item.cliente}|${data}|${obs}`;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  }

  return Object.entries(groups)
    .map(([groupKey, groupItems]) => {
      const [cliente, data, obs] = groupKey.split('|');
      const sortedItems = [...groupItems].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        key: groupKey,
        cliente,
        dataFabricacao: data,
        observacao: obs || undefined,
        items: sortedItems,
        minRowId: sortedItems[0]?.createdAt ?? '',
      };
    })
    .sort((a, b) => a.minRowId.localeCompare(b.minRowId));
}

type BuildSaidasWorklistInput = {
  items: SaidaSheetRecord[];
  selectedDate: string;
  loadingCardId: string | null;
};

export function buildSaidasWorklistData(
  input: BuildSaidasWorklistInput,
): RealizadoEtapaWorklistData {
  const groups = groupSaidaItems(input.items, input.selectedDate);

  const filterCounts: Record<EtapaFilterStatus, number> = {
    todos: input.items.length,
    pendente: 0,
    andamento: 0,
    concluido: 0,
  };

  for (const item of input.items) {
    filterCounts[getSaidaFilterStatus(item)]++;
  }

  const gruposAtivos: EtapaClientGroupData[] = groups.map((group) => ({
    key: group.key,
    cliente: group.cliente,
    dataFabricacao: group.dataFabricacao,
    observacao: group.observacao,
    products: group.items.map((item) => mapItemToProduct(item, input.loadingCardId)),
  }));

  return {
    selectedDate: input.selectedDate,
    filterCounts,
    gruposAtivos,
    gruposFinalizados: [],
  };
}

export function buildSaidasItemLookup(items: SaidaSheetRecord[]): Map<string, SaidaSheetRecord> {
  return new Map(items.filter((item) => item.id).map((item) => [item.id, item]));
}

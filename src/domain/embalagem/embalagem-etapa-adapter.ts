import type {
  EtapaClientGroupData,
  EtapaFilterStatus,
  EtapaLoteItem,
  EtapaLotePhotoLink,
  EtapaProductItem,
  RealizadoEtapaConfig,
  RealizadoEtapaWorklistData,
} from '@/components/Realizado/etapa/types';
import { getPedidoEmbalagemFilterStatus } from '@/components/Realizado/embalagem/embalagem-status';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import {
  resolverExibicaoCardEmbalagem,
} from '@/domain/embalagem/painel-quantidade';
import { hasEmbalagemQuantity } from '@/domain/realizado/embalagem-group-by-produto';
import { getEmbalagemPhotoStatus } from '@/domain/realizado/embalagem-photo-status';
import {
  buildLoteEmbalagemDisplayEntries,
  loteToPainelItem,
} from '@/domain/realizado/painel-pedido-adapter';
import type { PainelPedidoEmbalagem } from '@/domain/types/painel-embalagem';
import type { ProductionStatus } from '@/domain/types/realizado';
import { formatISODateBrNoYear, formatLocalTimeHHmm } from '@/lib/utils/date-utils';

export const EMBALAGEM_ETAPA_CONFIG: RealizadoEtapaConfig = {
  title: 'Realizado',
  stageName: 'Embalagem',
  icon: 'inventory_2',
  unit: 'cx',
  unitName: 'caixas',
  addLabel: 'Lote',
  summaryLabel: 'Embalado no dia',
  remainingLabel: 'Falta embalar',
  accent: 'amber',
  pageBackground: '#F6F4F1',
  dashboard: 'hora',
  toolbarMetricLabel: 'Embalado',
  reabrirLabel: 'Reabrir OP',
  tipoEstoqueMarcaBadge: true,
};

function horarioEmbalagemParaCard(
  item: ReturnType<typeof loteToPainelItem>,
): string | undefined {
  if (!hasEmbalagemQuantity(item)) return undefined;
  const raw = item.producaoUpdatedAt?.trim();
  if (!raw) return undefined;
  return formatLocalTimeHHmm(raw) ?? undefined;
}

function buildLotePhotoLinks(
  item: ReturnType<typeof loteToPainelItem>,
): EtapaLotePhotoLink[] {
  const links: EtapaLotePhotoLink[] = [];
  if (item.pacoteFotoUrl) {
    links.push({ label: 'Foto do Pacote', url: item.pacoteFotoUrl, emoji: '📦' });
  }
  if (item.etiquetaFotoUrl) {
    links.push({ label: 'Foto da Etiqueta', url: item.etiquetaFotoUrl, emoji: '🏷️' });
  }
  if (item.palletFotoUrl) {
    links.push({ label: 'Foto do Pallet', url: item.palletFotoUrl, emoji: '🚛' });
  }
  return links;
}

type BuildEmbalagemWorklistInput = {
  naoFinalizados: PainelPedidoEmbalagem[];
  finalizados: PainelPedidoEmbalagem[];
  pedidos: PainelPedidoEmbalagem[];
  selectedDate: string;
  loadingCardId: string | null;
  deletingLoteId: string | null;
  reabrindoOpId?: string | null;
};

function resolveEmbalagemCardStatusOverride(
  produzido: number,
  meta: number,
): ProductionStatus | undefined {
  if (produzido === 0) return 'not-started';
  if (produzido < meta) return 'partial';
  return undefined;
}

function resolveDataEtiquetaLabel(pedido: PainelPedidoEmbalagem): string | undefined {
  const dataFab = pedido.dataFabricacao?.trim();
  if (!dataFab || dataFab === pedido.dataPedido) return undefined;
  return `Etiqueta ${formatISODateBrNoYear(dataFab)}`;
}

function mapPedidoToProduct(
  pedido: PainelPedidoEmbalagem,
  loadingCardId: string | null,
  deletingLoteId: string | null,
  reabrindoOpId: string | null,
): EtapaProductItem {
  const exibicao = resolverExibicaoCardEmbalagem({
    pedido: pedido.pedido,
    produzido: pedido.produzido,
    unidadePrincipal: pedido.unidade,
    produzidoScalar: pedido.produzidoScalar,
    aProduzir: pedido.aProduzir,
  });

  const productionStatusOverride = resolveEmbalagemCardStatusOverride(
    pedido.produzidoScalar,
    pedido.aProduzir,
  );
  const metaOpLabel =
    pedido.metaPlanejada !== pedido.metaEfetiva
      ? `OP: ${pedido.metaPlanejada} ${exibicao.unidade.toUpperCase()}`
      : undefined;
  const detalhesMetaEfetiva = QuantityBreakdown.buildEntries([
    { quantidade: pedido.aProduzir, unidade: exibicao.unidade },
  ]);

  const lotes: EtapaLoteItem[] = pedido.lotes.map((lote, loteIndex) => {
    const embalagemItem = loteToPainelItem(pedido, lote);
    const itemKey = `${embalagemItem.cliente}-${embalagemItem.produto}-${embalagemItem.loteId}`;
    const photoStatus = getEmbalagemPhotoStatus(embalagemItem);
    const produzidoDetalhes = buildLoteEmbalagemDisplayEntries(pedido, {
      caixas: embalagemItem.caixas ?? 0,
      pacotes: embalagemItem.pacotes ?? 0,
      unidades: embalagemItem.unidades ?? 0,
      kg: embalagemItem.kg ?? 0,
    });
    const produzidoLabel = new QuantityBreakdown(produzidoDetalhes).format(
      embalagemItem.produzido,
      embalagemItem.unidade?.toLowerCase(),
    );

    return {
      id: embalagemItem.loteId ?? `${pedido.pedidoEmbalagemId}-lote-${loteIndex}`,
      index: loteIndex + 1,
      produzidoLabel,
      horario: horarioEmbalagemParaCard(embalagemItem),
      hasPhoto: photoStatus.hasPhoto,
      photoColor: photoStatus.color,
      photoLinks: buildLotePhotoLinks(embalagemItem),
      canEdit: !pedido.finalizada && Boolean(embalagemItem.loteId),
      canDelete: !pedido.finalizada && Boolean(embalagemItem.loteId),
      isLoading: loadingCardId === itemKey,
      isDeleting: deletingLoteId === embalagemItem.loteId,
      isLast: loteIndex === pedido.lotes.length - 1,
      editLabel: `Editar lote ${loteIndex + 1} de ${embalagemItem.produto}`,
    };
  });

  const observacao = pedido.observacao?.trim();

  return {
    id: pedido.pedidoEmbalagemId,
    produto: pedido.produto,
    cliente: pedido.cliente,
    observacao: observacao || undefined,
    dataEtiqueta: resolveDataEtiquetaLabel(pedido),
    congelado: pedido.congelado === 'Sim',
    somaProduzido: exibicao.produzido,
    somaAProduzir: pedido.aProduzir,
    unidade: exibicao.unidade,
    metaOpLabel,
    detalhesProduzido: exibicao.detalhesProduzido,
    detalhesMeta:
      pedido.metaPlanejada !== pedido.metaEfetiva
        ? detalhesMetaEfetiva
        : exibicao.detalhesMeta,
    cadeiaBarras: pedido.cadeiaBarras ?? [],
    filterStatus: getPedidoEmbalagemFilterStatus(pedido),
    productionStatusOverride,
    showAddLote: !pedido.finalizada,
    showReabrirOp: pedido.finalizada,
    isReabrindoOp: reabrindoOpId === pedido.pedidoEmbalagemId,
    lotes,
  };
}

function mapPedidosToFlatGroup(
  pedidos: PainelPedidoEmbalagem[],
  groupKey: string,
  loadingCardId: string | null,
  deletingLoteId: string | null,
  reabrindoOpId: string | null,
): EtapaClientGroupData | null {
  if (pedidos.length === 0) return null;

  return {
    key: groupKey,
    hideHeader: true,
    products: pedidos.map((pedido) =>
      mapPedidoToProduct(pedido, loadingCardId, deletingLoteId, reabrindoOpId),
    ),
  };
}

export function buildEmbalagemWorklistData(
  input: BuildEmbalagemWorklistInput,
): RealizadoEtapaWorklistData {
  const filterCounts: Record<EtapaFilterStatus, number> = {
    todos: input.pedidos.length,
    pendente: 0,
    andamento: 0,
    concluido: 0,
  };

  for (const pedido of input.pedidos) {
    filterCounts[getPedidoEmbalagemFilterStatus(pedido)]++;
  }

  const reabrindoOpId = input.reabrindoOpId ?? null;

  const gruposAtivos = mapPedidosToFlatGroup(
    input.naoFinalizados,
    'embalagem-ativos',
    input.loadingCardId,
    input.deletingLoteId,
    reabrindoOpId,
  );

  const gruposFinalizados = mapPedidosToFlatGroup(
    input.finalizados,
    'embalagem-finalizados',
    input.loadingCardId,
    input.deletingLoteId,
    reabrindoOpId,
  );

  return {
    selectedDate: input.selectedDate,
    filterCounts,
    gruposAtivos: gruposAtivos ? [gruposAtivos] : [],
    gruposFinalizados: gruposFinalizados ? [gruposFinalizados] : [],
  };
}

export function buildEmbalagemLoteLookup(
  pedidos: PainelPedidoEmbalagem[],
): Map<string, ReturnType<typeof loteToPainelItem>> {
  const map = new Map<string, ReturnType<typeof loteToPainelItem>>();

  for (const pedido of pedidos) {
    for (const lote of pedido.lotes) {
      const item = loteToPainelItem(pedido, lote);
      if (item.loteId) {
        map.set(item.loteId, item);
      }
    }
  }

  return map;
}

export function buildEmbalagemPedidoLookup(
  pedidos: PainelPedidoEmbalagem[],
): Map<string, PainelPedidoEmbalagem> {
  return new Map(pedidos.map((p) => [p.pedidoEmbalagemId, p]));
}

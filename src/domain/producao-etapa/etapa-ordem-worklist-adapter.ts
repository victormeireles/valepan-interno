import type {
  EtapaClientGroupData,
  EtapaFilterStatus,
  EtapaLoteItem,
  EtapaLotePhotoLink,
  EtapaProductItem,
  RealizadoEtapaWorklistData,
} from '@/components/Realizado/etapa/types';
import {
  buildEtapaDetalhesMetaEfetiva,
  buildEtapaDetalhesQuantidade,
  getOrdemEtapaFilterStatus,
  loteToPainelItemEtapa,
} from '@/domain/realizado/etapa-painel-adapter';
import type { PainelOrdemEtapa } from '@/domain/types/painel-etapa';
import type { ProductionStatus } from '@/domain/types/realizado';
import { QuantityBreakdown } from '@/domain/valueObjects/QuantityBreakdown';
import { formatLocalTimeHHmm } from '@/lib/utils/date-utils';
import { buildEtapaCadeiaBarras } from './build-etapa-cadeia-barras';

function buildLotePhotoLinks(fotoUrl?: string): EtapaLotePhotoLink[] {
  if (!fotoUrl) return [];
  return [{ label: 'Foto do lote', url: fotoUrl }];
}

function resolveOrdemCardStatusOverride(
  produzido: number,
  meta: number,
): ProductionStatus | undefined {
  if (produzido === 0) return 'not-started';
  if (produzido < meta) return 'partial';
  return undefined;
}

function mapOrdemToProduct(
  ordem: PainelOrdemEtapa,
  etapa: 'fermentacao' | 'forno',
  loadingCardId: string | null,
  deletingLoteId: string | null,
  creatingLoteOrdemId: string | null,
): EtapaProductItem {
  const detalhesProduzido = buildEtapaDetalhesQuantidade(
    ordem.produzidoBreakdown,
    ordem.modoQuantidade,
  );
  const detalhesMeta = buildEtapaDetalhesMetaEfetiva(ordem.aProduzir, ordem.modoQuantidade);

  const productionStatusOverride = resolveOrdemCardStatusOverride(
    ordem.produzido,
    ordem.aProduzir,
  );
  const metaOpLabel =
    ordem.metaPlanejada !== ordem.metaEfetiva
      ? `OP: ${ordem.metaPlanejada} ${ordem.unidade.toUpperCase()}`
      : undefined;
  const cadeiaBarras = buildEtapaCadeiaBarras(ordem, { etapa });

  const lotes: EtapaLoteItem[] = ordem.lotes.map((lote, loteIndex) => {
    const item = loteToPainelItemEtapa(ordem, lote);
    const produzidoDetalhes = buildEtapaDetalhesQuantidade(
      { assadeiras: lote.assadeiras, unidades: lote.unidades },
      ordem.modoQuantidade,
    );
    const produzidoLabel = new QuantityBreakdown(produzidoDetalhes).format(
      item.produzido,
      item.unidade,
    );

    return {
      id: lote.loteId,
      index: loteIndex + 1,
      produzidoLabel,
      horario: formatLocalTimeHHmm(lote.produzidoEm || '') ?? undefined,
      hasPhoto: Boolean(lote.fotoUrl),
      photoColor: 'white',
      photoLinks: buildLotePhotoLinks(lote.fotoUrl),
      canEdit: true,
      canDelete: true,
      isLoading: loadingCardId === lote.loteId,
      isDeleting: deletingLoteId === lote.loteId,
      isLast: loteIndex === ordem.lotes.length - 1,
      editLabel: `Editar lote ${loteIndex + 1} de ${ordem.produto}`,
    };
  });

  return {
    id: ordem.ordemProducaoId,
    produto: ordem.produto,
    assadeira: ordem.assadeiraNome,
    somaProduzido: ordem.produzido,
    somaAProduzir: ordem.aProduzir,
    unidade: ordem.unidade,
    metaOpLabel,
    detalhesProduzido,
    detalhesMeta,
    cadeiaBarras,
    filterStatus: getOrdemEtapaFilterStatus(ordem),
    productionStatusOverride,
    showAddLote: !ordem.finalizada,
    isNovoLoteLoading: creatingLoteOrdemId === ordem.ordemProducaoId,
    lotes,
  };
}

function mapOrdensToFlatGroup(
  ordens: PainelOrdemEtapa[],
  etapa: 'fermentacao' | 'forno',
  groupKey: string,
  loadingCardId: string | null,
  deletingLoteId: string | null,
  creatingLoteOrdemId: string | null,
): EtapaClientGroupData | null {
  if (ordens.length === 0) return null;

  return {
    key: groupKey,
    hideHeader: true,
    products: ordens.map((ordem) =>
      mapOrdemToProduct(
        ordem,
        etapa,
        loadingCardId,
        deletingLoteId,
        creatingLoteOrdemId,
      ),
    ),
  };
}

export type BuildEtapaOrdemWorklistInput = {
  etapa: 'fermentacao' | 'forno';
  naoFinalizados: PainelOrdemEtapa[];
  finalizados: PainelOrdemEtapa[];
  ordens: PainelOrdemEtapa[];
  selectedDate: string;
  loadingCardId: string | null;
  deletingLoteId: string | null;
  creatingLoteOrdemId: string | null;
};

export function buildEtapaOrdemWorklistData(
  input: BuildEtapaOrdemWorklistInput,
): RealizadoEtapaWorklistData {
  const filterCounts: Record<EtapaFilterStatus, number> = {
    todos: input.ordens.length,
    pendente: 0,
    andamento: 0,
    concluido: 0,
  };

  for (const ordem of input.ordens) {
    filterCounts[getOrdemEtapaFilterStatus(ordem)]++;
  }

  const gruposAtivos = mapOrdensToFlatGroup(
    input.naoFinalizados,
    input.etapa,
    'ordens-ativas',
    input.loadingCardId,
    input.deletingLoteId,
    input.creatingLoteOrdemId,
  );

  const gruposFinalizados = mapOrdensToFlatGroup(
    input.finalizados,
    input.etapa,
    'ordens-finalizadas',
    input.loadingCardId,
    input.deletingLoteId,
    input.creatingLoteOrdemId,
  );

  return {
    selectedDate: input.selectedDate,
    filterCounts,
    gruposAtivos: gruposAtivos ? [gruposAtivos] : [],
    gruposFinalizados: gruposFinalizados ? [gruposFinalizados] : [],
  };
}

export function buildEtapaOrdemLookup(
  ordens: PainelOrdemEtapa[],
): Map<string, PainelOrdemEtapa> {
  return new Map(ordens.map((ordem) => [ordem.ordemProducaoId, ordem]));
}

export function buildEtapaOrdemLoteLookup(
  ordens: PainelOrdemEtapa[],
): Map<string, ReturnType<typeof loteToPainelItemEtapa>> {
  const map = new Map<string, ReturnType<typeof loteToPainelItemEtapa>>();

  for (const ordem of ordens) {
    for (const lote of ordem.lotes) {
      map.set(lote.loteId, loteToPainelItemEtapa(ordem, lote));
    }
  }

  return map;
}

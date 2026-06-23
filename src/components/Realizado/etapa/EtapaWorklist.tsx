'use client';

import { useCallback, useMemo, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  EtapaClientGroupData,
  EtapaFilterStatus,
  EtapaProductItem,
  RealizadoEtapaCallbacks,
  RealizadoEtapaConfig,
  RealizadoEtapaWorklistData,
} from './types';
import EtapaWorklistFilters from './EtapaWorklistFilters';
import EtapaClientGroup from './EtapaClientGroup';
import EtapaProductAccordion from './EtapaProductAccordion';
import EtapaLoteRow, { EtapaPhotoDropdown } from './EtapaLoteRow';

type EtapaWorklistProps = {
  config: RealizadoEtapaConfig;
  worklist: RealizadoEtapaWorklistData;
  callbacks: RealizadoEtapaCallbacks;
  hasMeta?: boolean;
};

function filterProducts(
  products: EtapaProductItem[],
  statusFilter: EtapaFilterStatus,
): EtapaProductItem[] {
  if (statusFilter === 'todos') return products;
  return products.filter((p) => p.filterStatus === statusFilter);
}

function filterGroups(
  groups: EtapaClientGroupData[],
  statusFilter: EtapaFilterStatus,
): EtapaClientGroupData[] {
  return groups
    .map((g) => ({ ...g, products: filterProducts(g.products, statusFilter) }))
    .filter((g) => g.products.length > 0);
}

export default function EtapaWorklist({
  config,
  worklist,
  callbacks,
  hasMeta = true,
}: EtapaWorklistProps) {
  const [statusFilter, setStatusFilter] = useState<EtapaFilterStatus>('todos');
  const [openPhotoLoteId, setOpenPhotoLoteId] = useState<string | null>(null);

  const gruposAtivosVisiveis = useMemo(
    () => filterGroups(worklist.gruposAtivos, statusFilter),
    [worklist.gruposAtivos, statusFilter],
  );

  const gruposFinalizadosVisiveis = useMemo(
    () => filterGroups(worklist.gruposFinalizados, statusFilter),
    [worklist.gruposFinalizados, statusFilter],
  );

  const hasVisibleGroups =
    gruposAtivosVisiveis.length > 0 || gruposFinalizadosVisiveis.length > 0;

  const handlePhotoClick = useCallback((loteId: string) => {
    setOpenPhotoLoteId((prev) => (prev === loteId ? null : loteId));
  }, []);

  const renderProduct = (
    product: EtapaProductItem,
    group: EtapaClientGroupData,
    showAddLote: boolean,
  ) => {
    const instanceId = `${group.key}|${product.id}`;

    return (
      <EtapaProductAccordion
        key={instanceId}
        instanceId={instanceId}
        produto={product.produto}
        somaProduzido={product.somaProduzido}
        somaAProduzir={product.somaAProduzir}
        unidade={product.unidade}
        metaOpLabel={product.metaOpLabel}
        congelado={product.congelado}
        assadeira={product.assadeira}
        cliente={group.hideHeader ? group.cliente : undefined}
        observacao={group.hideHeader ? group.observacao : undefined}
        hasPhoto={product.hasPhoto}
        horario={product.horario}
        detalhesProduzido={product.detalhesProduzido}
        detalhesMeta={product.detalhesMeta}
        cadeiaBarras={product.cadeiaBarras}
        productionStatusOverride={product.productionStatusOverride}
        addLabel={config.addLabel}
        isNovoLoteLoading={product.isNovoLoteLoading}
        hasMeta={hasMeta}
        onProductPhotoClick={
          product.photoUrl
            ? () => window.open(product.photoUrl, '_blank', 'noopener,noreferrer')
            : undefined
        }
        onNovoLote={
          (showAddLote || config.alwaysShowAddLote) && product.showAddLote
            ? () => callbacks.onNovoLote(product.id)
            : undefined
        }
        renderLots={() =>
          product.lotes.map((lote) => {
              const deleteButton =
                lote.canDelete && lote.id ? (
                  <IconButton
                    size="sm"
                    icon="delete_outline"
                    label={`Excluir lote ${lote.index} de ${product.produto}`}
                    disabled={lote.isDeleting || lote.isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      callbacks.onDeleteLote(lote.id);
                    }}
                    className="text-danger hover:text-danger"
                  />
                ) : null;

              return (
                <div key={lote.id} className="relative">
                  <EtapaLoteRow
                    index={lote.index}
                    produzidoLabel={lote.produzidoLabel}
                    horario={lote.horario}
                    hasPhoto={lote.hasPhoto}
                    photoColor={lote.photoColor}
                    onPhotoClick={
                      lote.hasPhoto ? () => handlePhotoClick(lote.id) : undefined
                    }
                    onEdit={
                      lote.canEdit && lote.id
                        ? () => callbacks.onEditLote(lote.id)
                        : undefined
                    }
                    editLabel={lote.editLabel}
                    isLoading={lote.isLoading || lote.isDeleting}
                    trailingSlot={deleteButton}
                    isLast={lote.isLast}
                  />

                  {openPhotoLoteId === lote.id && lote.photoLinks && lote.photoLinks.length > 0 ? (
                    <EtapaPhotoDropdown
                      links={lote.photoLinks}
                      onClose={() => setOpenPhotoLoteId(null)}
                    />
                  ) : null}
                </div>
              );
            })
        }
      />
    );
  };

  const renderGroup = (group: EtapaClientGroupData, showAddLote: boolean) => (
    <EtapaClientGroup
      key={group.key}
      cliente={group.cliente}
      dataFabricacao={group.dataFabricacao}
      observacao={group.observacao}
      selectedDate={worklist.selectedDate}
      products={group.products}
      hideHeader={group.hideHeader}
    >
      {group.products.map((product) => renderProduct(product, group, showAddLote))}
    </EtapaClientGroup>
  );

  return (
    <>
      <EtapaWorklistFilters
        value={statusFilter}
        onChange={setStatusFilter}
        counts={worklist.filterCounts}
        showAndamentoFilter={hasMeta}
        concluidoLabel={hasMeta ? 'Concluídos' : 'Registrados'}
      />

      {!hasVisibleGroups ? (
        <EmptyState
          icon={config.icon}
          title="Nenhum produto neste filtro"
          description={`Ajuste os filtros ou a data para ver os pedidos de ${config.stageName.toLowerCase()}.`}
        />
      ) : (
        <div className="space-y-6">
          {gruposAtivosVisiveis.map((g) => renderGroup(g, true))}

          {gruposFinalizadosVisiveis.length > 0 ? (
            <div>
              {gruposAtivosVisiveis.length > 0 ? (
                <h2 className="mb-3 text-base font-semibold tracking-[-0.004em] text-text-strong">
                  Finalizados
                </h2>
              ) : null}
              {gruposFinalizadosVisiveis.map((g) =>
                renderGroup(g, config.alwaysShowAddLote ?? false),
              )}
            </div>
          ) : null}
        </div>
      )}

      {openPhotoLoteId ? (
        <div className="fixed inset-0 z-40" onClick={() => setOpenPhotoLoteId(null)} />
      ) : null}
    </>
  );
}

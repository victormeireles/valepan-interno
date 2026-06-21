'use client';

import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import OrdemProducaoMobileRow from '@/components/OrdensProducao/OrdemProducaoMobileRow';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';
import OrdemProducaoTableRow from '@/components/OrdensProducao/OrdemProducaoTableRow';
import OrdensProducaoBulkBar from '@/components/OrdensProducao/OrdensProducaoBulkBar';
import OrdensProducaoTableColGroup from '@/components/OrdensProducao/OrdensProducaoTableColGroup';
import { useMdViewport } from '@/components/OrdensProducao/use-md-viewport';
import { useOrdensProducaoDndSensors } from '@/components/OrdensProducao/useOrdensProducaoDndSensors';
import {
  ordensProducaoListFooterClass,
  ordensProducaoListScrollClass,
  ordensProducaoMobileListClass,
  ordensProducaoTableBodyClass,
  ordensProducaoTableClass,
  ordensProducaoTableHeadClass,
  ordensProducaoTableHeadObsClass,
  ordensProducaoTableHeadProdutoClass,
  ordensProducaoTableHeadQtyClass,
  ordensProducaoTableHeadTextClass,
  ordensProducaoTableControlCellClass,
  ordensProducaoTableCheckboxCellClass,
} from '@/components/OrdensProducao/ordens-producao-table-layout';

type OrdensProducaoListProps = {
  ordens: OrdemProducaoPainelItem[];
  filterDate: string;
  selectedCount: number;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  onToggleSelect: (ordem: OrdemProducaoPainelItem) => void;
  onToggleSelectAll: () => void;
  onMoveSelectedToTop: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  bulkBusy?: boolean;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (ordem: OrdemProducaoPainelItem) => void;
  onDelete: (ordem: OrdemProducaoPainelItem) => void;
  onMoveUp: (ordem: OrdemProducaoPainelItem) => void;
  onMoveDown: (ordem: OrdemProducaoPainelItem) => void;
  onMoveToTop: (ordem: OrdemProducaoPainelItem) => void;
  onMoveToBottom: (ordem: OrdemProducaoPainelItem) => void;
};

export default function OrdensProducaoList({
  ordens,
  filterDate,
  selectedCount,
  allSelected,
  isSelected,
  onToggleSelect,
  onToggleSelectAll,
  onMoveSelectedToTop,
  onDeleteSelected,
  onClearSelection,
  bulkBusy = false,
  onReorder,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
}: OrdensProducaoListProps) {
  const isMdViewport = useMdViewport();
  const sensors = useOrdensProducaoDndSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ordens.findIndex((item) => item.id === active.id);
    const newIndex = ordens.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(
      ordens.map((item) => item.id),
      oldIndex,
      newIndex,
    );
    onReorder(reordered);
  };

  const rowProps = (ordem: OrdemProducaoPainelItem, index: number) => ({
    ordem,
    filterDate,
    isFirst: index === 0,
    isLast: index === ordens.length - 1,
    selected: isSelected(ordem.id),
    onToggleSelect,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    onMoveToTop,
    onMoveToBottom,
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <OrdensProducaoBulkBar
        selectedCount={selectedCount}
        totalCount={ordens.length}
        allSelected={allSelected}
        onToggleAll={onToggleSelectAll}
        onMoveToTop={onMoveSelectedToTop}
        onDelete={onDeleteSelected}
        onClear={onClearSelection}
        busy={bulkBusy}
        showSelectAll={!isMdViewport}
      />
      <div className={ordensProducaoListScrollClass}>
        <SortableContext items={ordens.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {isMdViewport ? (
            <table className={ordensProducaoTableClass}>
              <OrdensProducaoTableColGroup />
              <thead className={ordensProducaoTableHeadClass}>
                <tr>
                  <th scope="col" className={ordensProducaoTableCheckboxCellClass}>
                    <OrdemProducaoRowCheckbox
                      checked={allSelected}
                      onChange={onToggleSelectAll}
                      ariaLabel="Selecionar todas as ordens"
                    />
                  </th>
                  <th scope="col" className={ordensProducaoTableControlCellClass}>
                    <span className="sr-only">Reordenar</span>
                  </th>
                  <th scope="col" className={`${ordensProducaoTableControlCellClass} text-center`}>
                    <span className="sr-only">Prioridade</span>
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadProdutoClass}>
                    Produto
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadTextClass}>
                    Assadeira
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadTextClass}>
                    Cliente
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadTextClass}>
                    Data
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadObsClass}>
                    Obs
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadQtyClass}>
                    Latas
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadQtyClass}>
                    Caixas
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadQtyClass}>
                    Unidades
                  </th>
                  <th scope="col" className={ordensProducaoTableControlCellClass}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className={ordensProducaoTableBodyClass}>
                {ordens.map((ordem, index) => (
                  <OrdemProducaoTableRow key={ordem.id} {...rowProps(ordem, index)} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className={ordensProducaoMobileListClass}>
              {ordens.map((ordem, index) => (
                <OrdemProducaoMobileRow key={ordem.id} {...rowProps(ordem, index)} />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
      <p className={ordensProducaoListFooterClass}>
        Arraste pela alça{' '}
        <span className="material-icons align-middle text-sm text-stone-400" aria-hidden="true">
          drag_indicator
        </span>{' '}
        para reordenar a fila de produção.
      </p>
    </DndContext>
  );
}

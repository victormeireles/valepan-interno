'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { OrdemProducaoPainelItem } from '@/domain/types/ordens-producao-painel';
import OrdemProducaoMobileRow from '@/components/OrdensProducao/OrdemProducaoMobileRow';
import OrdemProducaoTableRow from '@/components/OrdensProducao/OrdemProducaoTableRow';
import OrdensProducaoTableColGroup from '@/components/OrdensProducao/OrdensProducaoTableColGroup';
import { useMdViewport } from '@/components/OrdensProducao/use-md-viewport';
import {
  ordensProducaoListFooterClass,
  ordensProducaoListScrollClass,
  ordensProducaoMobileListClass,
  ordensProducaoTableBodyClass,
  ordensProducaoTableClass,
  ordensProducaoTableHeadClass,
  ordensProducaoTableHeadProdutoClass,
  ordensProducaoTableHeadQtyClass,
} from '@/components/OrdensProducao/ordens-producao-table-layout';

type OrdensProducaoListProps = {
  ordens: OrdemProducaoPainelItem[];
  filterDate: string;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (ordem: OrdemProducaoPainelItem) => void;
  onDelete: (ordem: OrdemProducaoPainelItem) => void;
  onMoveUp: (ordem: OrdemProducaoPainelItem) => void;
  onMoveDown: (ordem: OrdemProducaoPainelItem) => void;
};

export default function OrdensProducaoList({
  ordens,
  filterDate,
  onReorder,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OrdensProducaoListProps) {
  const isMdViewport = useMdViewport();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className={ordensProducaoListScrollClass}>
        <SortableContext items={ordens.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          {isMdViewport ? (
            <table className={ordensProducaoTableClass}>
              <OrdensProducaoTableColGroup />
              <thead className={ordensProducaoTableHeadClass}>
                <tr>
                  <th scope="col" className="w-9 px-1 py-2.5">
                    <span className="sr-only">Reordenar</span>
                  </th>
                  <th scope="col" className="w-8 px-1 py-2.5">
                    <span className="sr-only">Prioridade</span>
                  </th>
                  <th scope="col" className={ordensProducaoTableHeadProdutoClass}>
                    Produto
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
                  <th scope="col" className="w-11 px-1 py-2.5">
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

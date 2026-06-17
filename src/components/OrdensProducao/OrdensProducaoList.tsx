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
import OrdemProducaoRow from '@/components/OrdensProducao/OrdemProducaoRow';

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="hidden md:grid md:grid-cols-[auto_auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto_auto] gap-3 border-b border-stone-100 bg-stone-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
        <span className="w-8" aria-hidden="true" />
        <span>#</span>
        <span>Produto</span>
        <span>Tipo estoque</span>
        <span className="hidden lg:block">Quantidade</span>
        <span>Etiqueta</span>
        <span className="hidden xl:block">Observação</span>
        <span className="sr-only">Ações</span>
      </div>

      <SortableContext items={ordens.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {ordens.map((ordem, index) => (
          <OrdemProducaoRow
            key={ordem.id}
            ordem={ordem}
            filterDate={filterDate}
            isFirst={index === 0}
            isLast={index === ordens.length - 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

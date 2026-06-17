'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import OrdemProducaoRowMenu from '@/components/OrdensProducao/OrdemProducaoRowMenu';
import type { OrdemProducaoRowBaseProps } from '@/components/OrdensProducao/ordem-producao-row-types';
import { ordensProducaoRowClass } from '@/components/OrdensProducao/ordens-producao-theme';

export default function OrdemProducaoMobileRow({
  ordem,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OrdemProducaoRowBaseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ordem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoRowClass} grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 px-3 ${
        isDragging ? 'relative z-10 bg-white shadow-lg ring-1 ring-amber-200/80' : ''
      }`}
    >
      <button
        type="button"
        className="row-span-2 flex h-11 w-8 shrink-0 cursor-grab items-center justify-center self-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={`Reordenar ordem ${ordem.ordemPlanejamento}`}
        {...attributes}
        {...listeners}
      >
        <span className="material-icons text-xl" aria-hidden="true">
          drag_indicator
        </span>
      </button>

      <button
        type="button"
        onClick={() => onEdit(ordem)}
        className="col-start-2 min-w-0 self-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-xs font-semibold tabular-nums text-stone-400">
            {ordem.ordemPlanejamento}.
          </span>
          <span className="block truncate font-semibold text-stone-900">{ordem.produto}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-stone-500">
          {ordem.tipoEstoque} • {ordem.quantidadeLabel}
        </span>
      </button>

      <div className="col-start-3 row-start-1 self-center">
        <OrdemProducaoRowMenu
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => onEdit(ordem)}
          onDelete={() => onDelete(ordem)}
          onMoveUp={() => onMoveUp(ordem)}
          onMoveDown={() => onMoveDown(ordem)}
        />
      </div>
    </div>
  );
}

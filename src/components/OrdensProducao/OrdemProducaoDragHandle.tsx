'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

type OrdemProducaoDragHandleProps = {
  ordemPlanejamento: number;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  className?: string;
};

export default function OrdemProducaoDragHandle({
  ordemPlanejamento,
  attributes,
  listeners,
  className = '',
}: OrdemProducaoDragHandleProps) {
  return (
    <div
      className={`flex cursor-grab touch-none select-none items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      aria-label={`Reordenar ordem ${ordemPlanejamento}`}
      {...attributes}
      {...listeners}
    >
      <span className="material-icons text-lg" aria-hidden="true">
        drag_indicator
      </span>
    </div>
  );
}

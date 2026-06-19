'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import OrdemProducaoQtyValue from '@/components/OrdensProducao/OrdemProducaoQtyValue';
import OrdemProducaoRowMenu from '@/components/OrdensProducao/OrdemProducaoRowMenu';
import { buildOrdemProdutoMeta } from '@/components/OrdensProducao/ordem-producao-meta';
import type { OrdemProducaoRowBaseProps } from '@/components/OrdensProducao/ordem-producao-row-types';
import {
  ordensProducaoTableProdutoClass,
  ordensProducaoTableQtyCellClass,
  ordensProducaoTableRowClass,
  ordensProducaoTableTextTruncateClass,
} from '@/components/OrdensProducao/ordens-producao-table-layout';
import { ordensProducaoEtiquetaBadgeClass } from '@/components/OrdensProducao/ordens-producao-theme';

export default function OrdemProducaoTableRow({
  ordem,
  filterDate,
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

  const etiquetaDiffers = ordem.dataEtiqueta !== filterDate;
  const latasValue =
    ordem.modoQuantidade === 'latas' && ordem.assadeiras > 0 ? ordem.assadeiras : null;
  const caixasValue = ordem.caixas > 0 ? ordem.caixas : null;
  const meta = buildOrdemProdutoMeta(ordem);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoTableRowClass} ${
        isDragging ? 'relative z-10 bg-surface shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)] ring-1 ring-amber-200/80' : ''
      }`}
    >
      <td className="w-9 px-1 py-2 align-middle">
        <button
          type="button"
          className="flex h-11 w-9 cursor-grab items-center justify-center rounded-[9px] text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Reordenar ordem ${ordem.ordemPlanejamento}`}
          {...attributes}
          {...listeners}
        >
          <span className="material-icons text-xl" aria-hidden="true">
            drag_indicator
          </span>
        </button>
      </td>

      <td className="w-8 px-1 py-2 text-center align-middle">
        <span className="font-mono text-xs font-semibold tabular-nums text-stone-400">
          {ordem.ordemPlanejamento}
        </span>
      </td>

      <td className={ordensProducaoTableProdutoClass}>
        <button
          type="button"
          onClick={() => onEdit(ordem)}
          className="w-full min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[9px]"
          title={ordem.produto}
        >
          <span
            className={`font-semibold tracking-[-0.004em] text-text-strong ${ordensProducaoTableTextTruncateClass}`}
          >
            {ordem.produto}
          </span>
          <span
            className={`mt-0.5 text-xs text-text-muted ${ordensProducaoTableTextTruncateClass}`}
          >
            {meta}
            {etiquetaDiffers ? (
              <>
                {' '}
                <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
                  ≠
                </span>
              </>
            ) : null}
          </span>
        </button>
      </td>

      <td className={ordensProducaoTableQtyCellClass}>
        <OrdemProducaoQtyValue value={latasValue} />
      </td>

      <td className={ordensProducaoTableQtyCellClass}>
        <OrdemProducaoQtyValue value={caixasValue} />
      </td>

      <td className={ordensProducaoTableQtyCellClass}>
        <OrdemProducaoQtyValue value={ordem.unidades} emphasize />
      </td>

      <td className="px-1 py-2 align-middle">
        <OrdemProducaoRowMenu
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => onEdit(ordem)}
          onDelete={() => onDelete(ordem)}
          onMoveUp={() => onMoveUp(ordem)}
          onMoveDown={() => onMoveDown(ordem)}
        />
      </td>
    </tr>
  );
}

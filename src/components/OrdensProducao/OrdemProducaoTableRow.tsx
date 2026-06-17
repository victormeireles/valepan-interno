'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatISODateBrNoYear } from '@/lib/utils/date-utils';
import OrdemProducaoAssadeiraCell from '@/components/OrdensProducao/OrdemProducaoAssadeiraCell';
import OrdemProducaoQtyValue from '@/components/OrdensProducao/OrdemProducaoQtyValue';
import OrdemProducaoRowMenu from '@/components/OrdensProducao/OrdemProducaoRowMenu';
import type { OrdemProducaoRowBaseProps } from '@/components/OrdensProducao/ordem-producao-row-types';
import {
  ordensProducaoTableCellClass,
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
  const observacaoDisplay = ordem.observacao.trim() || '—';
  const latasValue =
    ordem.modoQuantidade === 'latas' && ordem.assadeiras > 0 ? ordem.assadeiras : null;
  const caixasValue = ordem.caixas > 0 ? ordem.caixas : null;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoTableRowClass} ${
        isDragging ? 'relative z-10 bg-white shadow-lg ring-1 ring-amber-200/80' : ''
      }`}
    >
      <td className="w-9 px-1 py-2 align-middle">
        <button
          type="button"
          className="flex h-11 w-9 cursor-grab items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`Reordenar ordem ${ordem.ordemPlanejamento}`}
          {...attributes}
          {...listeners}
        >
          <span className="material-icons text-xl" aria-hidden="true">
            drag_indicator
          </span>
        </button>
      </td>

      <td className={`${ordensProducaoTableCellClass} text-center font-semibold tabular-nums text-stone-500`}>
        {ordem.ordemPlanejamento}
      </td>

      <td className={ordensProducaoTableCellClass}>
        <span className={`font-medium text-stone-600 ${ordensProducaoTableTextTruncateClass}`}>
          {ordem.tipoEstoque}
        </span>
      </td>

      <td className={ordensProducaoTableProdutoClass}>
        <button
          type="button"
          onClick={() => onEdit(ordem)}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-md"
          title={ordem.produto}
        >
          <span className={`font-semibold text-stone-900 ${ordensProducaoTableTextTruncateClass}`}>
            {ordem.produto}
          </span>
        </button>
      </td>

      <td className={ordensProducaoTableCellClass}>
        <OrdemProducaoAssadeiraCell
          variant={ordem.assadeiraVariant}
          nome={ordem.assadeiraNome}
        />
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

      <td className={`${ordensProducaoTableCellClass} text-center`}>
        <span className="inline-flex items-center justify-center gap-1 tabular-nums">
          {formatISODateBrNoYear(ordem.dataEtiqueta)}
          {etiquetaDiffers ? (
            <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
              ≠
            </span>
          ) : null}
        </span>
      </td>

      <td className={`hidden max-w-0 px-3 py-2.5 align-middle xl:table-cell`}>
        <span
          className={`block truncate text-sm text-stone-500 ${ordensProducaoTableTextTruncateClass}`}
          title={ordem.observacao.trim() || undefined}
        >
          {observacaoDisplay}
        </span>
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

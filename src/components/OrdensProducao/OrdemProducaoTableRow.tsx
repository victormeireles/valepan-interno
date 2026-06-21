'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import OrdemProducaoAssadeiraCell from '@/components/OrdensProducao/OrdemProducaoAssadeiraCell';
import OrdemProducaoDragHandle from '@/components/OrdensProducao/OrdemProducaoDragHandle';
import OrdemProducaoQtyValue from '@/components/OrdensProducao/OrdemProducaoQtyValue';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';
import OrdemProducaoRowMenu from '@/components/OrdensProducao/OrdemProducaoRowMenu';
import type { OrdemProducaoRowBaseProps } from '@/components/OrdensProducao/ordem-producao-row-types';
import {
  ordensProducaoTableObsClass,
  ordensProducaoTableProdutoClass,
  ordensProducaoTableQtyCellClass,
  ordensProducaoTableRowClass,
  ordensProducaoTableCheckboxCellClass,
  ordensProducaoTableControlCellClass,
  ordensProducaoTableTextCellClass,
  ordensProducaoTableTextTruncateClass,
} from '@/components/OrdensProducao/ordens-producao-table-layout';
import { ordensProducaoEtiquetaBadgeClass } from '@/components/OrdensProducao/ordens-producao-theme';
import { formatISODateBrNoYear } from '@/lib/utils/date-utils';

export default function OrdemProducaoTableRow({
  ordem,
  filterDate,
  isFirst,
  isLast,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${ordensProducaoTableRowClass} ${
        isDragging ? 'relative z-10 bg-surface shadow-[0_12px_24px_-6px_rgb(28_25_23/0.18)] ring-1 ring-amber-200/80' : ''
      } ${selected ? 'bg-amber-50/80 odd:bg-amber-50/80 even:bg-amber-50/80' : ''}`}
    >
      <td className={ordensProducaoTableCheckboxCellClass}>
        <OrdemProducaoRowCheckbox
          checked={selected}
          onChange={() => onToggleSelect(ordem)}
          ariaLabel={`Selecionar ordem ${ordem.ordemPlanejamento}`}
        />
      </td>

      <td className={ordensProducaoTableControlCellClass}>
        <OrdemProducaoDragHandle
          ordemPlanejamento={ordem.ordemPlanejamento}
          attributes={attributes}
          listeners={listeners}
          className="h-8 w-7"
        />
      </td>

      <td className={`${ordensProducaoTableControlCellClass} text-center`}>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-stone-400">
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
            className={`text-[13px] font-semibold tracking-[-0.004em] text-text-strong ${ordensProducaoTableTextTruncateClass}`}
          >
            {ordem.produto}
          </span>
        </button>
      </td>

      <td className={ordensProducaoTableTextCellClass}>
        <OrdemProducaoAssadeiraCell
          variant={ordem.assadeiraVariant}
          nome={ordem.assadeiraNome}
        />
      </td>

      <td className={ordensProducaoTableTextCellClass}>
        <span className={ordensProducaoTableTextTruncateClass} title={ordem.tipoEstoque}>
          {ordem.tipoEstoque}
        </span>
      </td>

      <td className={ordensProducaoTableTextCellClass}>
        <span
          className={`inline-flex min-w-0 max-w-full items-center gap-1 font-mono tabular-nums text-stone-600 ${ordensProducaoTableTextTruncateClass}`}
          title={
            etiquetaDiffers
              ? `Etiqueta ${formatISODateBrNoYear(ordem.dataEtiqueta)} (diferente da produção)`
              : formatISODateBrNoYear(ordem.dataEtiqueta)
          }
        >
          <span className="truncate">{formatISODateBrNoYear(ordem.dataEtiqueta)}</span>
          {etiquetaDiffers ? (
            <span className={ordensProducaoEtiquetaBadgeClass} title="Data etiqueta diferente da produção">
              ≠
            </span>
          ) : null}
        </span>
      </td>

      <td className={ordensProducaoTableObsClass}>
        {ordem.observacao.trim() ? (
          <span
            className={`italic ${ordensProducaoTableTextTruncateClass}`}
            title={ordem.observacao}
          >
            {ordem.observacao}
          </span>
        ) : (
          <span className="text-stone-300" aria-hidden="true">
            —
          </span>
        )}
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

      <td className={ordensProducaoTableControlCellClass}>
        <OrdemProducaoRowMenu
          isFirst={isFirst}
          isLast={isLast}
          onEdit={() => onEdit(ordem)}
          onDelete={() => onDelete(ordem)}
          onMoveUp={() => onMoveUp(ordem)}
          onMoveDown={() => onMoveDown(ordem)}
          onMoveToTop={() => onMoveToTop(ordem)}
          onMoveToBottom={() => onMoveToBottom(ordem)}
        />
      </td>
    </tr>
  );
}

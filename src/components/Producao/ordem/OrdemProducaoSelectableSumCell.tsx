'use client';

import cn from 'classnames';
import type { OrdemSumColumn } from '@/lib/production/ordem-producao-cell-selection';
import type { OrdemCellSelectionApi } from '@/components/Producao/ordem/useOrdemProducaoCellSelection';

type Props = {
  itemId: string;
  column: OrdemSumColumn;
  selection?: OrdemCellSelectionApi;
  className?: string;
  children: React.ReactNode;
};

export default function OrdemProducaoSelectableSumCell({
  itemId,
  column,
  selection,
  className,
  children,
}: Props) {
  if (!selection?.enabled) {
    return <td className={className}>{children}</td>;
  }

  const selected = selection.isSelected(itemId, column);
  return (
    <td
      className={cn(
        className,
        'cursor-cell select-none',
        selected ? 'bg-sky-100 ring-2 ring-inset ring-sky-500' : 'hover:bg-sky-50/80',
      )}
      onMouseDown={(e) => selection.onCellMouseDown(e, itemId, column)}
      onMouseEnter={() => selection.onCellMouseEnter(itemId, column)}
      onClick={(e) => selection.onCellClick(e, itemId, column)}
      title="Clique para selecionar · Ctrl+clique para várias · Shift+clique intervalo · arrastar para intervalo"
    >
      {children}
    </td>
  );
}

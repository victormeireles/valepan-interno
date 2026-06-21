'use client';

import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';

type OrdemProducaoRowMenuProps = {
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
};

export default function OrdemProducaoRowMenu({
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
}: OrdemProducaoRowMenuProps) {
  return (
    <div className="flex justify-end">
      <OverflowMenu ariaLabel="Ações da ordem" menuWidth={196}>
        <OverflowMenuItem icon="edit" label="Editar" onClick={onEdit} />
        <OverflowMenuItem
          icon="keyboard_arrow_up"
          label="Mover para cima"
          disabled={isFirst}
          onClick={onMoveUp}
        />
        <OverflowMenuItem
          icon="keyboard_arrow_down"
          label="Mover para baixo"
          disabled={isLast}
          onClick={onMoveDown}
        />
        <OverflowMenuItem
          icon="vertical_align_top"
          label="Mover para o topo"
          disabled={isFirst}
          onClick={onMoveToTop}
        />
        <OverflowMenuItem
          icon="vertical_align_bottom"
          label="Mover para o fundo"
          disabled={isLast}
          onClick={onMoveToBottom}
        />
        <OverflowMenuItem
          icon="delete"
          label="Excluir"
          tone="danger"
          onClick={onDelete}
        />
      </OverflowMenu>
    </div>
  );
}

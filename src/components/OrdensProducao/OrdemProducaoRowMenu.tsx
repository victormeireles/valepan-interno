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
};

export default function OrdemProducaoRowMenu({
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OrdemProducaoRowMenuProps) {
  return (
    <div className="flex justify-end">
      <OverflowMenu ariaLabel="Ações da ordem" menuWidth={180}>
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
          icon="delete"
          label="Excluir"
          tone="danger"
          onClick={onDelete}
        />
      </OverflowMenu>
    </div>
  );
}

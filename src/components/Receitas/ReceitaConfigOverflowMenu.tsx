'use client';

import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { configTableOverflowTriggerClass } from '@/components/Config/config-table-styles';

export type ReceitaConfigMenuAction = 'editar' | 'duplicar' | 'remover';

type Props = {
  receitaNome: string;
  podeRemover: boolean;
  onSelect: (action: ReceitaConfigMenuAction) => void;
  compact?: boolean;
};

export default function ReceitaConfigOverflowMenu({
  receitaNome,
  podeRemover,
  onSelect,
  compact = false,
}: Props) {
  return (
    <OverflowMenu
      ariaLabel={`Ações para ${receitaNome}`}
      menuWidth={176}
      triggerClassName={compact ? configTableOverflowTriggerClass : undefined}
    >
      <OverflowMenuItem icon="edit" label="Editar" onClick={() => onSelect('editar')} />
      <OverflowMenuItem icon="content_copy" label="Duplicar" onClick={() => onSelect('duplicar')} />
      <OverflowMenuItem
        icon="delete"
        label="Remover"
        tone="danger"
        disabled={!podeRemover}
        onClick={() => onSelect('remover')}
      />
    </OverflowMenu>
  );
}

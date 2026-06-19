'use client';

import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import { configTableOverflowTriggerClass } from '@/components/Config/config-table-styles';

export type ProdutoConfigMenuAction = 'assadeiras' | 'receitas';

type Props = {
  onSelect: (action: ProdutoConfigMenuAction) => void;
  compact?: boolean;
};

export default function ProdutoConfigOverflowMenu({ onSelect, compact = false }: Props) {
  return (
    <OverflowMenu
      ariaLabel="Opções de configuração do produto"
      menuWidth={240}
      menuClassName="rounded-xl border border-stone-200 bg-white py-1 shadow-lg"
      triggerClassName={compact ? configTableOverflowTriggerClass : undefined}
    >
      <OverflowMenuItem
        icon="bakery_dining"
        label="Configurar assadeiras"
        onClick={() => onSelect('assadeiras')}
      />
      <OverflowMenuItem
        icon="menu_book"
        label="Configurar receitas"
        onClick={() => onSelect('receitas')}
      />
    </OverflowMenu>
  );
}

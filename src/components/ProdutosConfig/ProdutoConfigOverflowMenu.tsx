'use client';

import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';

export type ProdutoConfigMenuAction = 'assadeiras';

type Props = {
  onSelect: (action: ProdutoConfigMenuAction) => void;
};

export default function ProdutoConfigOverflowMenu({ onSelect }: Props) {
  return (
    <OverflowMenu
      ariaLabel="Opções de configuração do produto"
      menuWidth={208}
      menuClassName="rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
      triggerClassName="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <OverflowMenuItem
        icon="bakery_dining"
        label="Assadeiras"
        onClick={() => onSelect('assadeiras')}
      />
    </OverflowMenu>
  );
}

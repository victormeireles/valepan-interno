'use client';

import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';
import { Tabs } from '@/components/ui/Tabs';

type Props = {
  activeTab: MapeamentoAbaId;
  tabCounts: {
    pendencias: number;
    ignorados: number;
    vinculos: number;
  };
  summaryLabel: string;
  onTabChange: (tab: MapeamentoAbaId) => void;
};

export default function InsumoMapeamentoToolbar({
  activeTab,
  tabCounts,
  summaryLabel,
  onTabChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs
        tabs={[
          { id: 'pendencias', label: 'Pendências', count: tabCounts.pendencias },
          { id: 'ignorados', label: 'Ignorados', count: tabCounts.ignorados },
          { id: 'vinculos', label: 'Vínculos', count: tabCounts.vinculos },
        ]}
        value={activeTab}
        onChange={(id) => onTabChange(id as MapeamentoAbaId)}
        ariaLabel="Abas do mapeamento de insumos"
      />
      <p className="text-sm text-stone-500 font-mono tabular-nums" aria-live="polite">
        {summaryLabel}
      </p>
    </div>
  );
}

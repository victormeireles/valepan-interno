'use client';

import type { ProdutoComAssadeirasResumo } from '@/domain/assadeiras/produto-assadeira-types';
import { Tabs, type TabItem } from '@/components/ui/Tabs';

export const ALL_CATEGORIES_TAB_ID = 'all';

export type ProdutoCategoryTab = {
  id: string;
  label: string;
  count: number;
};

type Props = {
  tabs: ProdutoCategoryTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
};

export function buildProdutoCategoryTabs(
  produtos: Pick<ProdutoComAssadeirasResumo, 'categoria_id' | 'categoria_nome'>[],
): ProdutoCategoryTab[] {
  const byId = new Map<string, ProdutoCategoryTab>();

  for (const produto of produtos) {
    const existing = byId.get(produto.categoria_id);
    if (existing) {
      existing.count += 1;
      continue;
    }

    byId.set(produto.categoria_id, {
      id: produto.categoria_id,
      label: produto.categoria_nome,
      count: 1,
    });
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR'),
  );
}

export default function ProdutosConfigCategoryTabs({
  tabs,
  activeTabId,
  onTabChange,
}: Props) {
  if (tabs.length <= 1) return null;

  const allCount = tabs.reduce((sum, tab) => sum + tab.count, 0);

  const tabItems: TabItem[] = [
    { id: ALL_CATEGORIES_TAB_ID, label: 'Todos', count: allCount },
    ...tabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
      count: tab.count,
    })),
  ];

  return (
    <div className="overflow-x-auto border-b border-stone-100 px-4 py-3">
      <Tabs
        tabs={tabItems}
        value={activeTabId}
        onChange={onTabChange}
        ariaLabel="Filtrar por categoria"
        tabIdPrefix="produto-tab"
        panelId="produto-tabpanel-list"
      />
    </div>
  );
}

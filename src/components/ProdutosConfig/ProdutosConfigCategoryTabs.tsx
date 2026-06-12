'use client';

import type { ProdutoComAssadeirasResumo } from '@/app/actions/produto-assadeiras-actions';

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

  return (
    <div
      role="tablist"
      aria-label="Filtrar por categoria"
      className="flex gap-2 overflow-x-auto pb-1 snap-x border-b border-gray-100 px-4 pt-3"
    >
      <button
        type="button"
        role="tab"
        id="produto-tab-all"
        aria-selected={activeTabId === ALL_CATEGORIES_TAB_ID}
        aria-controls="produto-tabpanel-list"
        onClick={() => onTabChange(ALL_CATEGORIES_TAB_ID)}
        className={tabButtonClass(activeTabId === ALL_CATEGORIES_TAB_ID)}
      >
        Todos
        <TabCount count={allCount} />
      </button>

      {tabs.map((tab) => {
        const selected = activeTabId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`produto-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls="produto-tabpanel-list"
            onClick={() => onTabChange(tab.id)}
            className={tabButtonClass(selected)}
          >
            {tab.label}
            <TabCount count={tab.count} />
          </button>
        );
      })}
    </div>
  );
}

function tabButtonClass(selected: boolean): string {
  const base =
    'inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

  return selected
    ? `${base} border-slate-900 bg-slate-900 text-white`
    : `${base} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`;
}

function TabCount({ count }: { count: number }) {
  return (
    <span
      className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold tabular-nums"
      aria-hidden="true"
    >
      {count}
    </span>
  );
}

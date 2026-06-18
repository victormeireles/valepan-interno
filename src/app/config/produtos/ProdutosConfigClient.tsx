'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import {
  deleteAllProdutoAssadeiraLinks,
  deleteProdutoAssadeiraLink,
  getProdutoAssadeiraLinks,
} from '@/app/actions/produto-assadeiras-actions';
import type {
  ProdutoAssadeiraLink,
  ProdutoComAssadeirasResumo,
} from '@/domain/assadeiras/produto-assadeira-types';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import ProdutoAssadeiraLinkModal from '@/components/ProdutoAssadeiras/ProdutoAssadeiraLinkModal';
import ProdutoAssadeirasConfigModal from '@/components/ProdutosConfig/ProdutoAssadeirasConfigModal';
import type { ProdutoConfigMenuAction } from '@/components/ProdutosConfig/ProdutoConfigOverflowMenu';
import ProdutosConfigCategoryTabs, {
  ALL_CATEGORIES_TAB_ID,
  buildProdutoCategoryTabs,
} from '@/components/ProdutosConfig/ProdutosConfigCategoryTabs';
import ProdutosConfigMobileList from '@/components/ProdutosConfig/ProdutosConfigMobileList';
import ProdutosConfigTable, {
  type ProdutoSortKey,
} from '@/components/ProdutosConfig/ProdutosConfigTable';

type Props = {
  produtos: ProdutoComAssadeirasResumo[];
  assadeirasAtivas: Assadeira[];
};

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR');
}

function sortLinks(links: ProdutoAssadeiraLink[]): ProdutoAssadeiraLink[] {
  return [...links].sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return a.assadeira_nome.localeCompare(b.assadeira_nome, 'pt-BR');
  });
}

export default function ProdutosConfigClient({
  produtos: initialProdutos,
  assadeirasAtivas,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState(initialProdutos);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORIES_TAB_ID);
  const [sortKey, setSortKey] = useState<ProdutoSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [assadeirasModalOpen, setAssadeirasModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [activeProdutoId, setActiveProdutoId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<ProdutoAssadeiraLink | undefined>();
  const [toast, setToast] = useState<string | null>(null);
  const [linksByProdutoId, setLinksByProdutoId] = useState<
    Record<string, ProdutoAssadeiraLink[]>
  >({});
  const [loadingLinksForProdutoId, setLoadingLinksForProdutoId] = useState<string | null>(
    null,
  );
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [isDeletingAllLinks, setIsDeletingAllLinks] = useState(false);

  const activeProduto = produtos.find((p) => p.id === activeProdutoId) ?? null;
  const activeLinks = activeProdutoId
    ? (linksByProdutoId[activeProdutoId] ?? [])
    : [];
  const isLoadingActiveLinks = loadingLinksForProdutoId === activeProdutoId;

  useEffect(() => {
    setProdutos(initialProdutos);
  }, [initialProdutos]);

  const updateProdutoResumo = useCallback((resumo: ProdutoComAssadeirasResumo) => {
    setProdutos((prev) =>
      prev.map((item) => (item.id === resumo.id ? resumo : item)),
    );
  }, []);

  const loadLinksForProduto = useCallback(async (produtoId: string) => {
    setLoadingLinksForProdutoId(produtoId);
    try {
      const links = await getProdutoAssadeiraLinks(produtoId);
      setLinksByProdutoId((prev) => ({ ...prev, [produtoId]: links }));
    } finally {
      setLoadingLinksForProdutoId((current) =>
        current === produtoId ? null : current,
      );
    }
  }, []);

  useEffect(() => {
    const produtoId = searchParams.get('produto');
    const config = searchParams.get('config');
    if (produtoId && config === 'assadeiras' && produtos.some((p) => p.id === produtoId)) {
      setActiveProdutoId(produtoId);
      setAssadeirasModalOpen(true);
      void loadLinksForProduto(produtoId);
    }
  }, [searchParams, produtos, loadLinksForProduto]);

  const categoryTabs = useMemo(() => buildProdutoCategoryTabs(produtos), [produtos]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return produtos
      .filter((p) => {
        if (activeCategoryId !== ALL_CATEGORIES_TAB_ID && p.categoria_id !== activeCategoryId) {
          return false;
        }
        return !term || p.nome.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = compareValues(av, bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [produtos, searchTerm, activeCategoryId, sortKey, sortDir]);

  const hasActiveFilters =
    searchTerm.trim().length > 0 || activeCategoryId !== ALL_CATEGORIES_TAB_ID;

  const handleSort = (key: ProdutoSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const syncUrl = (produtoId: string | null, config: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (produtoId) params.set('produto', produtoId);
    else params.delete('produto');
    if (config) params.set('config', config);
    else params.delete('config');
    const query = params.toString();
    router.replace(query ? `/config/produtos?${query}` : '/config/produtos');
  };

  const openAssadeirasModal = (produtoId: string) => {
    setActiveProdutoId(produtoId);
    setAssadeirasModalOpen(true);
    syncUrl(produtoId, 'assadeiras');
    void loadLinksForProduto(produtoId);
  };

  const closeAssadeirasModal = () => {
    setAssadeirasModalOpen(false);
    setLinkModalOpen(false);
    setEditingLink(undefined);
    setActiveProdutoId(null);
    syncUrl(null, null);
  };

  const handleMenuSelect = (produtoId: string, action: ProdutoConfigMenuAction) => {
    if (action === 'assadeiras') {
      openAssadeirasModal(produtoId);
    }
  };

  const handleSaved = (
    link: ProdutoAssadeiraLink,
    produtoResumo: ProdutoComAssadeirasResumo,
  ) => {
    setLinksByProdutoId((prev) => {
      const current = prev[produtoResumo.id] ?? [];
      const exists = current.some((item) => item.id === link.id);
      const next = exists
        ? current.map((item) => (item.id === link.id ? link : item))
        : [...current, link];
      return { ...prev, [produtoResumo.id]: sortLinks(next) };
    });
    updateProdutoResumo(produtoResumo);
    setToast('Vínculo salvo com sucesso');
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateLink = () => {
    setEditingLink(undefined);
    setLinkModalOpen(true);
  };

  const openEditLink = (link: ProdutoAssadeiraLink) => {
    setEditingLink(link);
    setLinkModalOpen(true);
  };

  const handleDeleteAllLinks = async () => {
    if (!activeProdutoId || isDeletingAllLinks || deletingLinkId) return;

    setIsDeletingAllLinks(true);
    try {
      const result = await deleteAllProdutoAssadeiraLinks(activeProdutoId);
      if (!result.success) {
        alert(result.error || 'Erro ao remover exceções');
        return;
      }

      setLinksByProdutoId((prev) => ({ ...prev, [activeProdutoId]: [] }));
      updateProdutoResumo(result.produto);
      setToast('Exceções removidas');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsDeletingAllLinks(false);
    }
  };

  const handleDeleteLink = async (link: ProdutoAssadeiraLink) => {
    if (!activeProdutoId || deletingLinkId || isDeletingAllLinks) return;
    if (
      !confirm(
        `Remover o vínculo com "${link.assadeira_nome}"? Pedidos futuros não poderão usar esta combinação.`,
      )
    ) {
      return;
    }

    setDeletingLinkId(link.id);
    try {
      const result = await deleteProdutoAssadeiraLink(link.id);
      if (!result.success) {
        alert(result.error || 'Erro ao remover vínculo');
        return;
      }

      setLinksByProdutoId((prev) => ({
        ...prev,
        [activeProdutoId]: (prev[activeProdutoId] ?? []).filter(
          (item) => item.id !== link.id,
        ),
      }));
      updateProdutoResumo(result.produto);
      setToast('Vínculo removido');
      setTimeout(() => setToast(null), 4000);
    } finally {
      setDeletingLinkId(null);
    }
  };

  const resultLabel =
    filtered.length === 1 ? '1 produto' : `${filtered.length} produtos`;

  return (
    <div className="space-y-4">
      <ConfigPageHeader title="Configuração de Produtos" icon="inventory_2" />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          {toast}
        </div>
      )}

      <section
        aria-label="Lista de produtos"
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="border-b border-gray-100 p-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 min-w-0">
            <label htmlFor="produto-config-search" className="sr-only">
              Buscar produto por nome
            </label>
            <div className="relative">
              <span
                className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl"
                aria-hidden="true"
              >
                search
              </span>
              <input
                id="produto-config-search"
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full min-h-11 pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 tabular-nums shrink-0" aria-live="polite">
            {resultLabel}
          </p>
        </div>

        <ProdutosConfigCategoryTabs
          tabs={categoryTabs}
          activeTabId={activeCategoryId}
          onTabChange={setActiveCategoryId}
        />

        <div
          id="produto-tabpanel-list"
          role="tabpanel"
          aria-labelledby={
            activeCategoryId === ALL_CATEGORIES_TAB_ID
              ? 'produto-tab-all'
              : `produto-tab-${activeCategoryId}`
          }
        >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-3xl text-gray-300" aria-hidden="true">
                inventory_2
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto ativo'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {hasActiveFilters
                ? 'Tente ajustar a busca ou selecionar outra categoria.'
                : 'Cadastre produtos ativos para configurá-los aqui.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActiveCategoryId(ALL_CATEGORIES_TAB_ID);
                }}
                className="mt-4 min-h-11 px-4 text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <ProdutosConfigTable
              items={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onMenuSelect={handleMenuSelect}
            />
            <ProdutosConfigMobileList
              items={filtered}
              onMenuSelect={handleMenuSelect}
            />
          </>
        )}
        </div>
      </section>

      {activeProduto && (
        <>
          <ProdutoAssadeirasConfigModal
            isOpen={assadeirasModalOpen}
            produto={activeProduto}
            links={activeLinks}
            isLoadingLinks={isLoadingActiveLinks}
            onClose={closeAssadeirasModal}
            onAddLink={openCreateLink}
            onEditLink={openEditLink}
            onDeleteLink={handleDeleteLink}
            onDeleteAllLinks={handleDeleteAllLinks}
            deletingLinkId={deletingLinkId}
            isDeletingAllLinks={isDeletingAllLinks}
          >
            <ProdutoAssadeiraLinkModal
              isOpen={linkModalOpen}
              onClose={() => {
                setLinkModalOpen(false);
                setEditingLink(undefined);
              }}
              produtoId={activeProduto.id}
              assadeirasAtivas={assadeirasAtivas}
              linkedAssadeiraIds={activeLinks.map((l) => l.assadeira_id)}
              existingLinks={activeLinks}
              link={editingLink}
              onSaved={handleSaved}
            />
          </ProdutoAssadeirasConfigModal>
        </>
      )}
    </div>
  );
}

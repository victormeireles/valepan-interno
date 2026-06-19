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
import type { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';
import type { ProdutoConfigResumo } from '@/domain/produtos/produto-config-resumo';
import { countReceitasVinculadas } from '@/domain/produtos/produto-config-resumo';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import ProdutoAssadeiraLinkModal from '@/components/ProdutoAssadeiras/ProdutoAssadeiraLinkModal';
import ProdutoAssadeirasConfigModal from '@/components/ProdutosConfig/ProdutoAssadeirasConfigModal';
import ProdutoReceitasConfigModal, {
  type ReceitaCatalogoItem,
} from '@/components/ProdutosConfig/ProdutoReceitasConfigModal';
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
  produtos: ProdutoConfigResumo[];
  assadeirasAtivas: Assadeira[];
  receitasCatalogo: ReceitaCatalogoItem[];
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
  receitasCatalogo,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState(initialProdutos);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORIES_TAB_ID);
  const [sortKey, setSortKey] = useState<ProdutoSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [assadeirasModalOpen, setAssadeirasModalOpen] = useState(false);
  const [receitasModalOpen, setReceitasModalOpen] = useState(false);
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
      prev.map((item) =>
        item.id === resumo.id
          ? {
              ...resumo,
              receitasVinculadas: item.receitasVinculadas,
              receitasVinculadasCount: item.receitasVinculadasCount,
            }
          : item,
      ),
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
    if (!produtoId || !produtos.some((p) => p.id === produtoId)) return;

    if (config === 'assadeiras') {
      setActiveProdutoId(produtoId);
      setReceitasModalOpen(false);
      setAssadeirasModalOpen(true);
      void loadLinksForProduto(produtoId);
      return;
    }

    if (config === 'receitas') {
      setActiveProdutoId(produtoId);
      setAssadeirasModalOpen(false);
      setLinkModalOpen(false);
      setReceitasModalOpen(true);
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
    setReceitasModalOpen(false);
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

  const openReceitasModal = (produtoId: string) => {
    setAssadeirasModalOpen(false);
    setLinkModalOpen(false);
    setActiveProdutoId(produtoId);
    setReceitasModalOpen(true);
    syncUrl(produtoId, 'receitas');
  };

  const closeReceitasModal = () => {
    setReceitasModalOpen(false);
    setActiveProdutoId(null);
    syncUrl(null, null);
  };

  const handleReceitasUpdated = (
    produtoId: string,
    receitasVinculadas: ProdutoResumoComReceitas['receitas_vinculadas'],
  ) => {
    setProdutos((prev) =>
      prev.map((item) =>
        item.id === produtoId
          ? {
              ...item,
              receitasVinculadas,
              receitasVinculadasCount: countReceitasVinculadas(receitasVinculadas),
            }
          : item,
      ),
    );
    router.refresh();
    setToast('Receitas atualizadas');
    setTimeout(() => setToast(null), 4000);
  };

  const handleMenuSelect = (produtoId: string, action: ProdutoConfigMenuAction) => {
    if (action === 'assadeiras') {
      openAssadeirasModal(produtoId);
      return;
    }
    openReceitasModal(produtoId);
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
      <ConfigPageHeader
        title="Configuração de Produtos"
        icon="inventory_2"
        description="Gerencie assadeiras e receitas vinculadas a cada produto."
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <Card padding="none" aria-label="Lista de produtos" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-stone-100 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              id="produto-config-search"
              type="search"
              icon="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto..."
              aria-label="Buscar produto por nome"
            />
          </div>
          <p
            className="shrink-0 text-sm text-stone-500 font-mono tabular-nums"
            aria-live="polite"
          >
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
            <EmptyState
              icon="inventory_2"
              title={
                hasActiveFilters ? 'Nenhum produto encontrado' : 'Nenhum produto ativo'
              }
              description={
                hasActiveFilters
                  ? 'Tente ajustar a busca ou selecionar outra categoria.'
                  : 'Cadastre produtos ativos para configurá-los aqui.'
              }
              action={
                hasActiveFilters ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchTerm('');
                      setActiveCategoryId(ALL_CATEGORIES_TAB_ID);
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
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
      </Card>

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

          <ProdutoReceitasConfigModal
            isOpen={receitasModalOpen}
            produto={activeProduto}
            receitasCatalogo={receitasCatalogo}
            onClose={closeReceitasModal}
            onUpdated={handleReceitasUpdated}
          />
        </>
      )}
    </div>
  );
}

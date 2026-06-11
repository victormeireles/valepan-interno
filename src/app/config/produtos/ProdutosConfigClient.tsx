'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Assadeira } from '@/app/actions/assadeiras-actions';
import {
  deleteAllProdutoAssadeiraLinks,
  deleteProdutoAssadeiraLink,
  type ProdutoAssadeiraLink,
  type ProdutoComAssadeirasResumo,
} from '@/app/actions/produto-assadeiras-actions';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import ProdutoAssadeiraLinkModal from '@/components/ProdutoAssadeiras/ProdutoAssadeiraLinkModal';
import ProdutoAssadeirasConfigModal from '@/components/ProdutosConfig/ProdutoAssadeirasConfigModal';
import type { ProdutoConfigMenuAction } from '@/components/ProdutosConfig/ProdutoConfigOverflowMenu';
import ProdutosConfigMobileList from '@/components/ProdutosConfig/ProdutosConfigMobileList';
import ProdutosConfigTable, {
  type ProdutoSortKey,
} from '@/components/ProdutosConfig/ProdutosConfigTable';

type Props = {
  produtos: ProdutoComAssadeirasResumo[];
  assadeirasAtivas: Assadeira[];
  linksByProdutoId: Record<string, ProdutoAssadeiraLink[]>;
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

export default function ProdutosConfigClient({
  produtos,
  assadeirasAtivas,
  linksByProdutoId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<ProdutoSortKey>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [assadeirasModalOpen, setAssadeirasModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [activeProdutoId, setActiveProdutoId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<ProdutoAssadeiraLink | undefined>();
  const [toast, setToast] = useState<string | null>(null);

  const activeProduto = produtos.find((p) => p.id === activeProdutoId) ?? null;
  const activeLinks = activeProdutoId
    ? (linksByProdutoId[activeProdutoId] ?? [])
    : [];

  useEffect(() => {
    const produtoId = searchParams.get('produto');
    const config = searchParams.get('config');
    if (produtoId && config === 'assadeiras' && produtos.some((p) => p.id === produtoId)) {
      setActiveProdutoId(produtoId);
      setAssadeirasModalOpen(true);
    }
  }, [searchParams, produtos]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return produtos
      .filter((p) => !term || p.nome.toLowerCase().includes(term))
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = compareValues(av, bv);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [produtos, searchTerm, sortKey, sortDir]);

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

  const handleSaved = () => {
    setToast('Vínculo salvo com sucesso');
    router.refresh();
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
    if (!activeProdutoId) return;

    const result = await deleteAllProdutoAssadeiraLinks(activeProdutoId);
    if (result.success) {
      setToast('Exceções removidas');
      router.refresh();
      setTimeout(() => setToast(null), 4000);
    } else {
      alert(result.error || 'Erro ao remover exceções');
    }
  };

  const handleDeleteLink = async (link: ProdutoAssadeiraLink) => {
    if (
      !confirm(
        `Remover o vínculo com "${link.assadeira_nome}"? Pedidos futuros não poderão usar esta combinação.`,
      )
    ) {
      return;
    }

    const result = await deleteProdutoAssadeiraLink(link.id);
    if (result.success) {
      setToast('Vínculo removido');
      router.refresh();
      setTimeout(() => setToast(null), 4000);
    } else {
      alert(result.error || 'Erro ao remover vínculo');
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

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-3xl text-gray-300" aria-hidden="true">
                inventory_2
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto ativo'}
            </h2>
            <p className="text-gray-500 max-w-sm text-center mt-1 text-sm">
              {searchTerm
                ? 'Tente ajustar a busca.'
                : 'Cadastre produtos ativos para configurá-los aqui.'}
            </p>
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
      </section>

      {activeProduto && (
        <>
          <ProdutoAssadeirasConfigModal
            isOpen={assadeirasModalOpen}
            produto={activeProduto}
            links={activeLinks}
            onClose={closeAssadeirasModal}
            onAddLink={openCreateLink}
            onEditLink={openEditLink}
            onDeleteLink={handleDeleteLink}
            onDeleteAllLinks={handleDeleteAllLinks}
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
              link={editingLink}
              onSaved={handleSaved}
            />
          </ProdutoAssadeirasConfigModal>
        </>
      )}
    </div>
  );
}

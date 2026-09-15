'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InsumoMapeamentoPageData } from '@/app/actions/insumo-estoque-actions';
import {
  excluirIntegracaoInsumoVinculo,
  restaurarInsumoPendenciasEmLote,
} from '@/app/actions/insumo-estoque-actions';
import type { MapeamentoAbaId } from '@/domain/insumos/insumo-mapeamento-busca';
import {
  collectPendenciaIdsFromGrupos,
  filterPendenciaGrupos,
  type InsumoPendenciaProdutoGrupo,
} from '@/domain/insumos/insumo-pendencia-grupo';
import { filterIntegracaoInsumos } from '@/domain/insumos/insumo-vinculo-filter';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import InsumoIgnorarConfirmDialog from '@/features/insumo-estoque/components/InsumoIgnorarConfirmDialog';
import InsumoMapeamentoLoadingBar from '@/features/insumo-estoque/components/InsumoMapeamentoLoadingBar';
import InsumoMapeamentoPendenciaSection from '@/features/insumo-estoque/components/InsumoMapeamentoPendenciaSection';
import InsumoMapeamentoTabHint from '@/features/insumo-estoque/components/InsumoMapeamentoTabHint';
import InsumoMapeamentoToolbar from '@/features/insumo-estoque/components/InsumoMapeamentoToolbar';
import InsumoMapeamentoVinculosPanel from '@/features/insumo-estoque/components/InsumoMapeamentoVinculosPanel';
import InsumoResolverPendenciaModal from '@/features/insumo-estoque/components/InsumoResolverPendenciaModal';
import InsumoEditarVinculoModal from '@/features/insumo-estoque/components/InsumoEditarVinculoModal';
import InsumoVinculoIaRevisaoModal from '@/features/insumo-estoque/components/InsumoVinculoIaRevisaoModal';
import { useInsumoIgnorarFlow } from '@/features/insumo-estoque/hooks/useInsumoIgnorarFlow';
import { useInsumoMapeamentoBuscaViewModel } from '@/features/insumo-estoque/hooks/useInsumoMapeamentoBuscaViewModel';
import { useInsumoPendenciaGrupoSelecao } from '@/features/insumo-estoque/hooks/useInsumoPendenciaGrupoSelecao';
import {
  buildMapeamentoTabHref,
  parseMapeamentoAbaId,
} from '@/features/insumo-estoque/utils/insumo-mapeamento-tab';

type Props = {
  initialData: InsumoMapeamentoPageData;
};

export default function InsumoMapeamentoClient({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();
  const [pendenciaGrupos, setPendenciaGrupos] = useState(initialData.pendenciaGrupos);
  const [ignoradaGrupos, setIgnoradaGrupos] = useState(initialData.ignoradaGrupos);
  const [pendenciasCount, setPendenciasCount] = useState(initialData.pendenciasCount);
  const [ignoradasCount, setIgnoradasCount] = useState(initialData.ignoradasCount);
  const [vinculos, setVinculos] = useState(initialData.vinculos);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [resolverGrupo, setResolverGrupo] = useState<InsumoPendenciaProdutoGrupo | null>(null);
  const [editarVinculo, setEditarVinculo] = useState<IntegracaoInsumoListItem | null>(null);
  const [iaRevisaoOpen, setIaRevisaoOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const tabFromUrl = parseMapeamentoAbaId(searchParams.get('tab'));
  const [activeTab, setActiveTabState] = useState<MapeamentoAbaId>(tabFromUrl);

  useEffect(() => {
    setPendenciaGrupos(initialData.pendenciaGrupos);
    setIgnoradaGrupos(initialData.ignoradaGrupos);
    setPendenciasCount(initialData.pendenciasCount);
    setIgnoradasCount(initialData.ignoradasCount);
    setVinculos(initialData.vinculos);
  }, [initialData]);

  useEffect(() => {
    setActiveTabState(tabFromUrl);
  }, [tabFromUrl]);

  const setActiveTab = (tab: MapeamentoAbaId) => {
    setActiveTabState(tab);
    const href = buildMapeamentoTabHref(searchParams.toString(), tab);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const filteredGrupos = useMemo(
    () => filterPendenciaGrupos(pendenciaGrupos, searchTerm),
    [pendenciaGrupos, searchTerm],
  );
  const filteredIgnoradaGrupos = useMemo(
    () => filterPendenciaGrupos(ignoradaGrupos, searchTerm),
    [ignoradaGrupos, searchTerm],
  );
  const filteredVinculos = useMemo(
    () => filterIntegracaoInsumos(vinculos, searchTerm),
    [vinculos, searchTerm],
  );

  const { emptyModel, tabCounts, summaryLabel } = useInsumoMapeamentoBuscaViewModel({
    activeTab,
    searchTerm,
    filteredGrupos,
    filteredIgnoradaGrupos,
    filteredVinculos,
    pendenciasCount,
    ignoradasCount,
    vinculosCount: vinculos.length,
  });

  const selectionGrupos =
    activeTab === 'ignorados' ? filteredIgnoradaGrupos : filteredGrupos;

  const {
    selectedKeys,
    selectedGrupoCount,
    selectedPendenciaCount,
    allVisibleSelected,
    someVisibleSelected,
    toggleSelect,
    toggleSelectAllVisible,
    clearSelection,
    removeFromSelection,
  } = useInsumoPendenciaGrupoSelecao(selectionGrupos);

  useEffect(() => {
    clearSelection();
  }, [activeTab, clearSelection]);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = (message: string) => {
    setToast(message);
    handleRefresh();
  };

  const moverGruposParaIgnoradas = (grupos: InsumoPendenciaProdutoGrupo[]) => {
    if (grupos.length === 0) return;
    const chaves = new Set(grupos.map((grupo) => grupo.chave));
    const totalMovido = grupos.reduce((sum, grupo) => sum + grupo.pendenciaCount, 0);
    setPendenciaGrupos((current) => current.filter((item) => !chaves.has(item.chave)));
    setIgnoradaGrupos((current) => [
      ...grupos.map((grupo) => ({
        ...grupo,
        ignoradoEm: new Date().toISOString(),
        pendencias: [],
      })),
      ...current,
    ]);
    setPendenciasCount((count) => Math.max(0, count - totalMovido));
    setIgnoradasCount((count) => count + totalMovido);
  };

  const moverGrupoParaIgnoradas = (grupo: InsumoPendenciaProdutoGrupo) => {
    moverGruposParaIgnoradas([grupo]);
  };

  const moverGrupoParaPendencias = (grupo: InsumoPendenciaProdutoGrupo) => {
    setIgnoradaGrupos((current) => current.filter((item) => item.chave !== grupo.chave));
    setPendenciaGrupos((current) => [
      { ...grupo, ignoradoEm: null, pendencias: [] },
      ...current,
    ]);
    setIgnoradasCount((count) => Math.max(0, count - grupo.pendenciaCount));
    setPendenciasCount((count) => count + grupo.pendenciaCount);
  };

  const showError = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const {
    dialog: ignorarDialog,
    busy: ignorarBusy,
    fechar: fecharIgnorarDialog,
    solicitarIgnorarGrupo,
    solicitarIgnorarBatch,
    confirmarProduto: confirmarIgnorarProduto,
    confirmarFornecedor: confirmarIgnorarFornecedor,
  } = useInsumoIgnorarFlow({
    pendenciaGrupos,
    selectionGrupos,
    selectedKeys,
    selectedGrupoCount,
    selectedPendenciaCount,
    clearSelection,
    removeFromSelection,
    moverGrupoParaIgnoradas,
    moverGruposParaIgnoradas,
    onSaved: handleSaved,
    onError: showError,
  });

  const handleRestaurar = async (grupo: InsumoPendenciaProdutoGrupo) => {
    const confirmed = window.confirm(
      grupo.pendenciaCount === 1
        ? 'Restaurar esta pendência para a fila?'
        : `Restaurar ${grupo.pendenciaCount} pendências deste produto Omie para a fila?`,
    );
    if (!confirmed) return;

    const result = await restaurarInsumoPendenciasEmLote(grupo.pendenciaIds);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    moverGrupoParaPendencias(grupo);
    removeFromSelection([grupo.chave]);
    handleSaved(
      grupo.pendenciaCount === 1
        ? 'Pendência restaurada'
        : `${result.restauradas ?? grupo.pendenciaCount} pendências restauradas`,
    );
  };

  const handleBatchSecundario = async () => {
    if (selectedGrupoCount === 0) return;

    if (activeTab !== 'ignorados') {
      solicitarIgnorarBatch();
      return;
    }

    const confirmed = window.confirm(
      `Restaurar ${selectedPendenciaCount} pendência${selectedPendenciaCount === 1 ? '' : 's'} de ${selectedGrupoCount} produto${selectedGrupoCount === 1 ? '' : 's'}?`,
    );
    if (!confirmed) return;

    setBatchLoading(true);
    const ids = collectPendenciaIdsFromGrupos(selectionGrupos, selectedKeys);
    const gruposAfetados = selectionGrupos.filter((grupo) => selectedKeys.has(grupo.chave));
    const result = await restaurarInsumoPendenciasEmLote(ids);
    setBatchLoading(false);

    if (!result.success) {
      showError(result.error);
      return;
    }

    const chavesAfetadas = new Set(gruposAfetados.map((grupo) => grupo.chave));
    const totalMovido = gruposAfetados.reduce((sum, grupo) => sum + grupo.pendenciaCount, 0);
    setIgnoradaGrupos((current) => current.filter((grupo) => !chavesAfetadas.has(grupo.chave)));
    setPendenciaGrupos((current) => [
      ...gruposAfetados.map((grupo) => ({ ...grupo, ignoradoEm: null, pendencias: [] })),
      ...current,
    ]);
    setIgnoradasCount((count) => Math.max(0, count - totalMovido));
    setPendenciasCount((count) => count + totalMovido);
    handleSaved(
      (result.restauradas ?? ids.length) === 1
        ? '1 pendência restaurada'
        : `${result.restauradas ?? ids.length} pendências restauradas`,
    );
    clearSelection();
  };

  const handleExcluirVinculo = async (item: IntegracaoInsumoListItem) => {
    const confirmed = window.confirm(
      'Excluir este vínculo? Novos recebimentos deste produto Omie voltarão para pendências. Entradas já registradas não serão alteradas.',
    );
    if (!confirmed) return;

    const result = await excluirIntegracaoInsumoVinculo(item.id);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setVinculos((current) => current.filter((v) => v.id !== item.id));
    handleSaved('Vínculo excluído');
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <InsumoMapeamentoLoadingBar visible={isNavigating} label="Atualizando mapeamento…" />

      <ConfigPageHeader
        title="Mapeamento de insumos"
        icon="link"
        description="Vínculos Omie→insumo, pendências de NF e sugestões com IA."
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <InsumoMapeamentoToolbar
        activeTab={activeTab}
        tabCounts={tabCounts}
        summaryLabel={summaryLabel}
        onTabChange={setActiveTab}
      />

      {isNavigating ? (
        <p className="text-sm text-stone-500" aria-live="polite">
          Atualizando…
        </p>
      ) : null}

      <Card
        padding="none"
        aria-label="Conteúdo do mapeamento de insumos"
        className={`overflow-hidden transition-opacity duration-150 ${
          isNavigating ? 'opacity-70' : 'opacity-100'
        }`}
      >
        <InsumoMapeamentoTabHint
          activeTab={activeTab}
          hasVinculos={vinculos.length > 0}
          hasPendencias={pendenciaGrupos.length > 0}
          hasIgnorados={ignoradaGrupos.length > 0}
          onSugerirIa={() => setIaRevisaoOpen(true)}
        />

        <div className="border-b border-stone-100 p-4">
          <Input
            id="insumo-mapeamento-search"
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar NF, produto, fornecedor ou empresa..."
            aria-label="Buscar"
          />
        </div>

        {activeTab === 'vinculos' ? (
          <InsumoMapeamentoVinculosPanel
            items={filteredVinculos}
            searchTerm={searchTerm}
            buscaEmptyModel={emptyModel}
            onClearSearch={() => setSearchTerm('')}
            onGoToTab={setActiveTab}
            onEditar={setEditarVinculo}
            onExcluir={handleExcluirVinculo}
          />
        ) : (
          <InsumoMapeamentoPendenciaSection
            variant={activeTab === 'ignorados' ? 'ignorado' : 'pendente'}
            filteredGrupos={activeTab === 'ignorados' ? filteredIgnoradaGrupos : filteredGrupos}
            searchTerm={searchTerm}
            buscaEmptyModel={emptyModel}
            onClearSearch={() => setSearchTerm('')}
            onGoToTab={setActiveTab}
            selectedKeys={selectedKeys}
            selectedGrupoCount={selectedGrupoCount}
            selectedPendenciaCount={selectedPendenciaCount}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onClearSelection={clearSelection}
            onVincular={setResolverGrupo}
            onIgnorar={activeTab === 'pendencias' ? solicitarIgnorarGrupo : undefined}
            onRestaurar={activeTab === 'ignorados' ? handleRestaurar : undefined}
            onBatchSecundario={handleBatchSecundario}
            batchLoading={batchLoading}
          />
        )}
      </Card>

      <InsumoResolverPendenciaModal
        isOpen={Boolean(resolverGrupo)}
        grupo={resolverGrupo}
        pendenciaStatuses={activeTab === 'ignorados' ? ['ignorado'] : ['pendente']}
        onClose={() => setResolverGrupo(null)}
        onSaved={(message) => {
          if (resolverGrupo) {
            if (activeTab === 'ignorados') {
              setIgnoradaGrupos((current) =>
                current.filter((grupo) => grupo.chave !== resolverGrupo.chave),
              );
              setIgnoradasCount((count) => Math.max(0, count - resolverGrupo.pendenciaCount));
            } else {
              setPendenciaGrupos((current) =>
                current.filter((grupo) => grupo.chave !== resolverGrupo.chave),
              );
              setPendenciasCount((count) => Math.max(0, count - resolverGrupo.pendenciaCount));
            }
            removeFromSelection([resolverGrupo.chave]);
          }
          handleSaved(message);
        }}
      />

      <InsumoEditarVinculoModal
        isOpen={Boolean(editarVinculo)}
        vinculo={editarVinculo}
        onClose={() => setEditarVinculo(null)}
        onSaved={(message) => {
          handleSaved(message);
          setEditarVinculo(null);
        }}
      />

      <InsumoVinculoIaRevisaoModal
        isOpen={iaRevisaoOpen}
        onClose={() => setIaRevisaoOpen(false)}
        onApplied={(message) => {
          setIaRevisaoOpen(false);
          handleSaved(message);
        }}
      />

      <InsumoIgnorarConfirmDialog
        open={ignorarDialog.open}
        modo={ignorarDialog.modo}
        produtoLabel={ignorarDialog.produtoLabel}
        fornecedorLabel={ignorarDialog.fornecedorLabel}
        pendenciaCount={ignorarDialog.pendenciaCount}
        busy={ignorarBusy}
        onCancel={fecharIgnorarDialog}
        onIgnorarProduto={confirmarIgnorarProduto}
        onIgnorarFornecedor={confirmarIgnorarFornecedor}
      />
    </div>
  );
}

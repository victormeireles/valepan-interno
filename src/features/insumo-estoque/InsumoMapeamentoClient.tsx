'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InsumoMapeamentoPageData } from '@/app/actions/insumo-estoque-actions';
import {
  excluirIntegracaoInsumoVinculo,
  ignorarInsumoPendenciasEmLote,
  restaurarInsumoPendenciasEmLote,
} from '@/app/actions/insumo-estoque-actions';
import {
  collectPendenciaIdsFromGrupos,
  filterPendenciaGrupos,
  type InsumoPendenciaProdutoGrupo,
} from '@/domain/insumos/insumo-pendencia-grupo';
import { filterIntegracaoInsumos } from '@/domain/insumos/insumo-vinculo-filter';
import type { IntegracaoInsumoListItem } from '@/domain/types/insumo-estoque-db';
import ConfigPageHeader from '@/components/Config/ConfigPageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Toast } from '@/components/ui/Toast';
import InsumoMapeamentoPendenciaSection from '@/features/insumo-estoque/components/InsumoMapeamentoPendenciaSection';
import InsumoResolverPendenciaModal from '@/features/insumo-estoque/components/InsumoResolverPendenciaModal';
import InsumoEditarVinculoModal from '@/features/insumo-estoque/components/InsumoEditarVinculoModal';
import InsumoVinculoMobileList from '@/features/insumo-estoque/components/InsumoVinculoMobileList';
import InsumoVinculoTable from '@/features/insumo-estoque/components/InsumoVinculoTable';
import InsumoVinculoIaRevisaoModal from '@/features/insumo-estoque/components/InsumoVinculoIaRevisaoModal';
import { useInsumoPendenciaGrupoSelecao } from '@/features/insumo-estoque/hooks/useInsumoPendenciaGrupoSelecao';

type TabId = 'pendencias' | 'ignorados' | 'vinculos';

type Props = {
  initialData: InsumoMapeamentoPageData;
};

export default function InsumoMapeamentoClient({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    setPendenciaGrupos(initialData.pendenciaGrupos);
    setIgnoradaGrupos(initialData.ignoradaGrupos);
    setPendenciasCount(initialData.pendenciasCount);
    setIgnoradasCount(initialData.ignoradasCount);
    setVinculos(initialData.vinculos);
  }, [initialData]);

  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'vinculos' ? 'vinculos' : tabParam === 'ignorados' ? 'ignorados' : 'pendencias';

  const setActiveTab = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'pendencias') params.delete('tab');
    else params.set('tab', tab);
    const query = params.toString();
    router.replace(query ? `/mapeamento-insumos?${query}` : '/mapeamento-insumos');
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
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = (message: string) => {
    setToast(message);
    handleRefresh();
  };

  const moverGrupoParaIgnoradas = (grupo: InsumoPendenciaProdutoGrupo) => {
    setPendenciaGrupos((current) => current.filter((item) => item.chave !== grupo.chave));
    setIgnoradaGrupos((current) => [
      { ...grupo, ignoradoEm: new Date().toISOString(), pendencias: [] },
      ...current,
    ]);
    setPendenciasCount((count) => Math.max(0, count - grupo.pendenciaCount));
    setIgnoradasCount((count) => count + grupo.pendenciaCount);
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

  const handleIgnorar = async (grupo: InsumoPendenciaProdutoGrupo) => {
    const confirmed = window.confirm(
      grupo.pendenciaCount === 1
        ? 'Ignorar esta pendência? Ela não aparecerá mais na fila.'
        : `Ignorar ${grupo.pendenciaCount} pendências deste produto Omie? Elas não aparecerão mais na fila.`,
    );
    if (!confirmed) return;

    const result = await ignorarInsumoPendenciasEmLote(grupo.pendenciaIds);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    moverGrupoParaIgnoradas(grupo);
    removeFromSelection([grupo.chave]);
    handleSaved(
      grupo.pendenciaCount === 1
        ? 'Pendência ignorada'
        : `${result.ignoradas ?? grupo.pendenciaCount} pendências ignoradas`,
    );
  };

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

    const isIgnorado = activeTab === 'ignorados';
    const confirmed = window.confirm(
      isIgnorado
        ? `Restaurar ${selectedPendenciaCount} pendência${selectedPendenciaCount === 1 ? '' : 's'} de ${selectedGrupoCount} produto${selectedGrupoCount === 1 ? '' : 's'}?`
        : `Ignorar ${selectedPendenciaCount} pendência${selectedPendenciaCount === 1 ? '' : 's'} de ${selectedGrupoCount} produto${selectedGrupoCount === 1 ? '' : 's'}?`,
    );
    if (!confirmed) return;

    setBatchLoading(true);
    const ids = collectPendenciaIdsFromGrupos(selectionGrupos, selectedKeys);
    const gruposAfetados = selectionGrupos.filter((grupo) => selectedKeys.has(grupo.chave));

    if (isIgnorado) {
      const result = await restaurarInsumoPendenciasEmLote(ids);
      setBatchLoading(false);

      if (!result.success) {
        setToast(result.error);
        setTimeout(() => setToast(null), 4000);
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
    } else {
      const result = await ignorarInsumoPendenciasEmLote(ids);
      setBatchLoading(false);

      if (!result.success) {
        setToast(result.error);
        setTimeout(() => setToast(null), 4000);
        return;
      }

      const chavesAfetadas = new Set(gruposAfetados.map((grupo) => grupo.chave));
      const totalMovido = gruposAfetados.reduce((sum, grupo) => sum + grupo.pendenciaCount, 0);
      setPendenciaGrupos((current) => current.filter((grupo) => !chavesAfetadas.has(grupo.chave)));
      setIgnoradaGrupos((current) => [
        ...gruposAfetados.map((grupo) => ({
          ...grupo,
          ignoradoEm: new Date().toISOString(),
          pendencias: [],
        })),
        ...current,
      ]);
      setPendenciasCount((count) => Math.max(0, count - totalMovido));
      setIgnoradasCount((count) => count + totalMovido);
      handleSaved(
        (result.ignoradas ?? ids.length) === 1
          ? '1 pendência ignorada'
          : `${result.ignoradas ?? ids.length} pendências ignoradas`,
      );
    }

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

  const pendenciasLabel =
    pendenciaGrupos.length === 1
      ? `1 produto • ${pendenciasCount} pendências`
      : `${pendenciaGrupos.length} produtos • ${pendenciasCount} pendências`;

  const ignoradasLabel =
    ignoradaGrupos.length === 1
      ? `1 produto • ${ignoradasCount} ignoradas`
      : `${ignoradaGrupos.length} produtos • ${ignoradasCount} ignoradas`;

  const vinculosLabel =
    vinculos.length === 1 ? '1 produto vinculado' : `${vinculos.length} produtos vinculados`;

  const searchPlaceholder =
    activeTab === 'vinculos'
      ? 'Buscar produto Omie, insumo, fornecedor ou empresa...'
      : 'Buscar NF, produto, fornecedor ou CFOP...';

  const summaryLabel =
    activeTab === 'vinculos'
      ? vinculosLabel
      : activeTab === 'ignorados'
        ? ignoradasLabel
        : pendenciasLabel;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { id: 'pendencias', label: 'Pendências', count: pendenciasCount },
            { id: 'ignorados', label: 'Ignorados', count: ignoradasCount },
            { id: 'vinculos', label: 'Vínculos', count: vinculos.length },
          ]}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
          ariaLabel="Abas do mapeamento de insumos"
        />
        <p className="text-sm text-stone-500 font-mono tabular-nums" aria-live="polite">
          {summaryLabel}
        </p>
      </div>

      <Card padding="none" aria-label="Conteúdo do mapeamento de insumos" className="overflow-hidden">
        {activeTab === 'vinculos' && vinculos.length > 0 ? (
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm text-stone-600">
              Um vínculo por produto Omie e empresa. Editar ou excluir afeta apenas próximos recebimentos.
            </p>
          </div>
        ) : null}

        {activeTab === 'pendencias' && pendenciaGrupos.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <p className="text-sm text-stone-600">
              Uma linha por produto Omie. Clique em NFs para ver detalhes de cada nota antes de vincular.
            </p>
            <Button variant="secondary" icon="auto_awesome" onClick={() => setIaRevisaoOpen(true)}>
              Sugerir vínculos com IA
            </Button>
          </div>
        ) : null}

        {activeTab === 'ignorados' && ignoradaGrupos.length > 0 ? (
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm text-stone-600">
              Itens ignorados da fila. Restaure para pendências ou vincule diretamente a um insumo.
            </p>
          </div>
        ) : null}

        <div className="border-b border-stone-100 p-4">
          <Input
            id="insumo-mapeamento-search"
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar"
          />
        </div>

        {activeTab === 'vinculos' ? (
          filteredVinculos.length === 0 ? (
            <EmptyState
              icon="link"
              title={searchTerm ? 'Nenhum vínculo encontrado' : 'Nenhum vínculo cadastrado'}
              description={
                searchTerm
                  ? 'Tente ajustar a busca.'
                  : 'Produtos Omie vinculados a insumos aparecerão aqui para revisão.'
              }
              action={
                searchTerm ? (
                  <Button variant="ghost" onClick={() => setSearchTerm('')}>
                    Limpar busca
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <InsumoVinculoTable
                items={filteredVinculos}
                onEditar={setEditarVinculo}
                onExcluir={handleExcluirVinculo}
                embedded
              />
              <InsumoVinculoMobileList
                items={filteredVinculos}
                onEditar={setEditarVinculo}
                onExcluir={handleExcluirVinculo}
              />
            </>
          )
        ) : (
          <InsumoMapeamentoPendenciaSection
            variant={activeTab === 'ignorados' ? 'ignorado' : 'pendente'}
            filteredGrupos={activeTab === 'ignorados' ? filteredIgnoradaGrupos : filteredGrupos}
            searchTerm={searchTerm}
            onClearSearch={() => setSearchTerm('')}
            selectedKeys={selectedKeys}
            selectedGrupoCount={selectedGrupoCount}
            selectedPendenciaCount={selectedPendenciaCount}
            allVisibleSelected={allVisibleSelected}
            someVisibleSelected={someVisibleSelected}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onClearSelection={clearSelection}
            onVincular={setResolverGrupo}
            onIgnorar={activeTab === 'pendencias' ? handleIgnorar : undefined}
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
    </div>
  );
}

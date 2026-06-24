'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoEstoqueDashboardData } from '@/app/actions/insumo-estoque-actions';
import {
  excluirIntegracaoInsumoVinculo,
  ignorarInsumoPendenciasEmLote,
} from '@/app/actions/insumo-estoque-actions';
import {
  collectPendenciaIdsFromGrupos,
  filterPendenciaGrupos,
  groupPendenciasPorProduto,
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
import InsumoAjusteModal from '@/features/insumo-estoque/components/InsumoAjusteModal';
import InsumoHistoricoModal from '@/features/insumo-estoque/components/InsumoHistoricoModal';
import InsumoPendenciaMobileList from '@/features/insumo-estoque/components/InsumoPendenciaMobileList';
import InsumoPendenciaTable from '@/features/insumo-estoque/components/InsumoPendenciaTable';
import InsumoResolverPendenciaModal from '@/features/insumo-estoque/components/InsumoResolverPendenciaModal';
import InsumoEditarVinculoModal from '@/features/insumo-estoque/components/InsumoEditarVinculoModal';
import InsumoVinculoMobileList from '@/features/insumo-estoque/components/InsumoVinculoMobileList';
import InsumoVinculoTable from '@/features/insumo-estoque/components/InsumoVinculoTable';
import InsumoVinculoIaRevisaoModal from '@/features/insumo-estoque/components/InsumoVinculoIaRevisaoModal';
import InsumoSaldoMobileList from '@/features/insumo-estoque/components/InsumoSaldoMobileList';
import InsumoSaldoTable from '@/features/insumo-estoque/components/InsumoSaldoTable';
import { useInsumoPendenciaGrupoSelecao } from '@/features/insumo-estoque/hooks/useInsumoPendenciaGrupoSelecao';

type TabId = 'saldos' | 'pendencias' | 'vinculos';

type Props = {
  initialData: InsumoEstoqueDashboardData;
};

export default function InsumoEstoqueClient({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saldos, setSaldos] = useState(initialData.saldos);
  const [pendencias, setPendencias] = useState(initialData.pendencias);
  const [vinculos, setVinculos] = useState(initialData.vinculos);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [ajusteItem, setAjusteItem] = useState<InsumoSaldoComDetalhes | null>(null);
  const [historicoItem, setHistoricoItem] = useState<InsumoSaldoComDetalhes | null>(null);
  const [resolverGrupo, setResolverGrupo] = useState<InsumoPendenciaProdutoGrupo | null>(null);
  const [editarVinculo, setEditarVinculo] = useState<IntegracaoInsumoListItem | null>(null);
  const [iaRevisaoOpen, setIaRevisaoOpen] = useState(false);
  const [ignorandoLote, setIgnorandoLote] = useState(false);

  useEffect(() => {
    setSaldos(initialData.saldos);
    setPendencias(initialData.pendencias);
    setVinculos(initialData.vinculos);
  }, [initialData]);

  const tabParam = searchParams.get('tab');
  const activeTab: TabId =
    tabParam === 'pendencias'
      ? 'pendencias'
      : tabParam === 'vinculos'
        ? 'vinculos'
        : 'saldos';

  const setActiveTab = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'saldos') params.delete('tab');
    else params.set('tab', tab);
    const query = params.toString();
    router.replace(query ? `/estoque-insumos?${query}` : '/estoque-insumos');
  };

  const filteredSaldos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return saldos;
    return saldos.filter((item) => item.nome.toLowerCase().includes(term));
  }, [saldos, searchTerm]);

  const pendenciaGrupos = useMemo(
    () => groupPendenciasPorProduto(pendencias),
    [pendencias],
  );

  const filteredGrupos = useMemo(
    () => filterPendenciaGrupos(pendenciaGrupos, searchTerm),
    [pendenciaGrupos, searchTerm],
  );

  const filteredVinculos = useMemo(
    () => filterIntegracaoInsumos(vinculos, searchTerm),
    [vinculos, searchTerm],
  );

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
  } = useInsumoPendenciaGrupoSelecao(filteredGrupos);

  const handleRefresh = () => {
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = (message: string) => {
    setToast(message);
    handleRefresh();
  };

  const handleIgnorar = async (grupo: InsumoPendenciaProdutoGrupo) => {
    const confirmed = window.confirm(
      grupo.pendenciaCount === 1
        ? 'Ignorar esta pendência? Ela não aparecerá mais na fila.'
        : `Ignorar ${grupo.pendenciaCount} pendências deste produto Omie? Elas não aparecerão mais na fila.`,
    );
    if (!confirmed) return;

    const ids = grupo.pendencias.map((pendencia) => pendencia.id);
    const result = await ignorarInsumoPendenciasEmLote(ids);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const ignoradas = new Set(ids);
    setPendencias((current) => current.filter((p) => !ignoradas.has(p.id)));
    removeFromSelection([grupo.chave]);
    handleSaved(
      grupo.pendenciaCount === 1
        ? 'Pendência ignorada'
        : `${result.ignoradas ?? grupo.pendenciaCount} pendências ignoradas`,
    );
  };

  const handleIgnorarSelecionadas = async () => {
    if (selectedGrupoCount === 0) return;

    const confirmed = window.confirm(
      `Ignorar ${selectedPendenciaCount} pendência${selectedPendenciaCount === 1 ? '' : 's'} de ${selectedGrupoCount} produto${selectedGrupoCount === 1 ? '' : 's'}?`,
    );
    if (!confirmed) return;

    setIgnorandoLote(true);
    const ids = collectPendenciaIdsFromGrupos(filteredGrupos, selectedKeys);
    const result = await ignorarInsumoPendenciasEmLote(ids);
    setIgnorandoLote(false);

    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    const ignoradas = new Set(ids);
    setPendencias((current) => current.filter((p) => !ignoradas.has(p.id)));
    clearSelection();
    handleSaved(
      (result.ignoradas ?? ids.length) === 1
        ? '1 pendência ignorada'
        : `${result.ignoradas ?? ids.length} pendências ignoradas`,
    );
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

  const saldosLabel =
    filteredSaldos.length === 1 ? '1 insumo' : `${filteredSaldos.length} insumos`;
  const pendenciasLabel =
    pendenciaGrupos.length === 1
      ? `1 produto • ${pendencias.length} pendências`
      : `${pendenciaGrupos.length} produtos • ${pendencias.length} pendências`;

  const vinculosLabel =
    vinculos.length === 1 ? '1 produto vinculado' : `${vinculos.length} produtos vinculados`;

  const searchPlaceholder =
    activeTab === 'saldos'
      ? 'Buscar insumo...'
      : activeTab === 'vinculos'
        ? 'Buscar produto Omie, insumo ou empresa...'
        : 'Buscar NF, produto, fornecedor ou CFOP...';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <ConfigPageHeader
        title="Estoque de insumos"
        icon="grain"
        description="Saldos, entradas por NF e pendências de vínculo Omie."
      />

      {toast ? (
        <Toast tone="success" onClose={() => setToast(null)}>
          {toast}
        </Toast>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          tabs={[
            { id: 'saldos', label: 'Saldos' },
            { id: 'pendencias', label: 'Pendências', count: pendencias.length },
            { id: 'vinculos', label: 'Vínculos', count: vinculos.length },
          ]}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
          ariaLabel="Abas do estoque de insumos"
        />
        <p className="text-sm text-stone-500 font-mono tabular-nums" aria-live="polite">
          {activeTab === 'saldos'
            ? `${saldosLabel} • ${pendencias.length} pendências`
            : activeTab === 'vinculos'
              ? vinculosLabel
              : pendenciasLabel}
        </p>
      </div>

      <Card padding="none" aria-label="Conteúdo do estoque de insumos" className="overflow-hidden">
        {activeTab === 'vinculos' && vinculos.length > 0 ? (
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="text-sm text-stone-600">
              Um vínculo por produto Omie e empresa. Editar ou excluir afeta apenas próximos recebimentos.
            </p>
          </div>
        ) : null}

        {activeTab === 'pendencias' && pendencias.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <p className="text-sm text-stone-600">
              Uma linha por produto Omie. Clique em NFs para ver detalhes de cada nota antes de vincular.
            </p>
            <Button
              variant="secondary"
              icon="auto_awesome"
              onClick={() => setIaRevisaoOpen(true)}
            >
              Sugerir vínculos com IA
            </Button>
          </div>
        ) : null}

        <div className="border-b border-stone-100 p-4">
          <Input
            id="insumo-estoque-search"
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Buscar"
          />
        </div>

        {activeTab === 'pendencias' && selectedGrupoCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              <span className="font-mono tabular-nums">{selectedGrupoCount}</span>{' '}
              {selectedGrupoCount === 1 ? 'produto' : 'produtos'} •{' '}
              <span className="font-mono tabular-nums">{selectedPendenciaCount}</span>{' '}
              {selectedPendenciaCount === 1 ? 'pendência' : 'pendências'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={ignorandoLote}>
                Limpar seleção
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon="block"
                onClick={handleIgnorarSelecionadas}
                disabled={ignorandoLote}
              >
                {ignorandoLote ? 'Ignorando…' : 'Ignorar selecionadas'}
              </Button>
            </div>
          </div>
        ) : null}

        {activeTab === 'saldos' ? (
          filteredSaldos.length === 0 ? (
            <EmptyState
              icon="grain"
              title={searchTerm ? 'Nenhum saldo encontrado' : 'Nenhum saldo registrado'}
              description={
                searchTerm
                  ? 'Tente ajustar a busca.'
                  : 'Entradas por NF ou ajustes manuais aparecerão aqui.'
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
              <InsumoSaldoTable
                items={filteredSaldos}
                onAjustar={setAjusteItem}
                onHistorico={setHistoricoItem}
                embedded
              />
              <InsumoSaldoMobileList
                items={filteredSaldos}
                onAjustar={setAjusteItem}
                onHistorico={setHistoricoItem}
              />
            </>
          )
        ) : activeTab === 'vinculos' ? (
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
        ) : filteredGrupos.length === 0 ? (
          <EmptyState
            icon="link_off"
            title={searchTerm ? 'Nenhuma pendência encontrada' : 'Nenhuma pendência'}
            description={
              searchTerm
                ? 'Tente ajustar a busca.'
                : 'Itens de NF sem vínculo Omie aparecerão aqui para resolução.'
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
            <InsumoPendenciaTable
              grupos={filteredGrupos}
              selectedKeys={selectedKeys}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAllVisible}
              allVisibleSelected={allVisibleSelected}
              someVisibleSelected={someVisibleSelected}
              onVincular={setResolverGrupo}
              onIgnorar={handleIgnorar}
              embedded
            />
            <InsumoPendenciaMobileList
              grupos={filteredGrupos}
              selectedKeys={selectedKeys}
              onToggleSelect={toggleSelect}
              onVincular={setResolverGrupo}
              onIgnorar={handleIgnorar}
            />
          </>
        )}
      </Card>

      <InsumoAjusteModal
        isOpen={Boolean(ajusteItem)}
        item={ajusteItem}
        onClose={() => setAjusteItem(null)}
        onSaved={() => handleSaved('Saldo ajustado com sucesso')}
      />

      <InsumoHistoricoModal
        isOpen={Boolean(historicoItem)}
        item={historicoItem}
        onClose={() => setHistoricoItem(null)}
      />

      <InsumoResolverPendenciaModal
        isOpen={Boolean(resolverGrupo)}
        grupo={resolverGrupo}
        onClose={() => setResolverGrupo(null)}
        onSaved={(message) => {
          if (resolverGrupo) {
            const resolvidas = new Set(resolverGrupo.pendencias.map((p) => p.id));
            setPendencias((current) => current.filter((p) => !resolvidas.has(p.id)));
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

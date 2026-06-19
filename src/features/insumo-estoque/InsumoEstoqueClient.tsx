'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InsumoSaldoComDetalhes } from '@/domain/types/insumo-estoque';
import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import type { InsumoEstoqueDashboardData } from '@/app/actions/insumo-estoque-actions';
import { ignorarInsumoPendencia } from '@/app/actions/insumo-estoque-actions';
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
import InsumoSaldoMobileList from '@/features/insumo-estoque/components/InsumoSaldoMobileList';
import InsumoSaldoTable from '@/features/insumo-estoque/components/InsumoSaldoTable';

type TabId = 'saldos' | 'pendencias';

type Props = {
  initialData: InsumoEstoqueDashboardData;
};

export default function InsumoEstoqueClient({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saldos, setSaldos] = useState(initialData.saldos);
  const [pendencias, setPendencias] = useState(initialData.pendencias);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [ajusteItem, setAjusteItem] = useState<InsumoSaldoComDetalhes | null>(null);
  const [historicoItem, setHistoricoItem] = useState<InsumoSaldoComDetalhes | null>(null);
  const [resolverPendencia, setResolverPendencia] =
    useState<InsumoPendenciaComEmpresa | null>(null);

  useEffect(() => {
    setSaldos(initialData.saldos);
    setPendencias(initialData.pendencias);
  }, [initialData]);

  const activeTab: TabId =
    searchParams.get('tab') === 'pendencias' ? 'pendencias' : 'saldos';

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

  const filteredPendencias = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return pendencias;
    return pendencias.filter((item) => {
      const haystack = [
        item.numero_nf,
        item.descricao_produto,
        item.omie_codigo_produto,
        item.empresaNome,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [pendencias, searchTerm]);

  const handleRefresh = () => {
    router.refresh();
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaved = (message: string) => {
    setToast(message);
    handleRefresh();
  };

  const handleIgnorar = async (item: InsumoPendenciaComEmpresa) => {
    const confirmed = window.confirm(
      'Ignorar esta pendência? Ela não aparecerá mais na fila.',
    );
    if (!confirmed) return;

    const result = await ignorarInsumoPendencia(item.id);
    if (!result.success) {
      setToast(result.error);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setPendencias((current) => current.filter((p) => p.id !== item.id));
    handleSaved('Pendência ignorada');
  };

  const saldosLabel =
    filteredSaldos.length === 1 ? '1 insumo' : `${filteredSaldos.length} insumos`;
  const pendenciasLabel =
    filteredPendencias.length === 1
      ? '1 pendência'
      : `${filteredPendencias.length} pendências`;

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
          ]}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabId)}
          ariaLabel="Abas do estoque de insumos"
        />
        <p className="text-sm text-stone-500 font-mono tabular-nums" aria-live="polite">
          {activeTab === 'saldos'
            ? `${saldosLabel} • ${pendencias.length} pendências`
            : pendenciasLabel}
        </p>
      </div>

      <Card padding="none" aria-label="Conteúdo do estoque de insumos" className="overflow-hidden">
        <div className="border-b border-stone-100 p-4">
          <Input
            id="insumo-estoque-search"
            type="search"
            icon="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={
              activeTab === 'saldos' ? 'Buscar insumo...' : 'Buscar NF, produto ou empresa...'
            }
            aria-label="Buscar"
          />
        </div>

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
        ) : filteredPendencias.length === 0 ? (
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
              items={filteredPendencias}
              onVincular={setResolverPendencia}
              onIgnorar={handleIgnorar}
              embedded
            />
            <InsumoPendenciaMobileList
              items={filteredPendencias}
              onVincular={setResolverPendencia}
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
        isOpen={Boolean(resolverPendencia)}
        pendencia={resolverPendencia}
        onClose={() => setResolverPendencia(null)}
        onSaved={() => {
          if (resolverPendencia) {
            setPendencias((current) =>
              current.filter((p) => p.id !== resolverPendencia.id),
            );
          }
          handleSaved('Pendência resolvida e entrada registrada');
        }}
      />
    </div>
  );
}

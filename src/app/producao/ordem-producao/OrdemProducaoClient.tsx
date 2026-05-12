'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
import type { OrdemProducaoDiariaView } from '@/app/actions/producao-actions';
import {
  createOrdemProducaoDiaria,
  publishOrdemProducao,
  reorderOrdemProducaoItems,
  type ProdutoAutocompleteOption,
  upsertOrdemProducaoItem,
} from '@/app/actions/producao-actions';
import { estimateCaixasFromLatas } from '@/lib/production/ordem-producao-conversions';
import { ordemProducaoUrl } from '@/lib/production/production-station-routes';
import OrdemProducaoHeader from '@/components/Producao/ordem/OrdemProducaoHeader';
import OrdemProducaoGrid from '@/components/Producao/ordem/OrdemProducaoGrid';
import SelectRemoteAutocomplete from '@/components/Producao/SelectRemoteAutocomplete';

type Props = {
  /** Data filtrada (YYYY-MM-DD, fuso Brasil no servidor quando sem query). */
  selectedDateIso: string;
  /** "Hoje" no fuso Brasil, para botão rápido e placeholder. */
  todayIso: string;
  initialData: OrdemProducaoDiariaView | null;
  initialError: string | null;
  /** Banco sem tabelas da ordem diária: mostra cabeçalho + grade vazia (esqueleto). */
  migrationPendingSkeleton?: boolean;
};

export default function OrdemProducaoClient({
  selectedDateIso,
  todayIso,
  initialData,
  initialError,
  migrationPendingSkeleton = false,
}: Props) {
  const router = useRouter();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    setError(initialError);
  }, [selectedDateIso, initialError, initialData]);

  const [novoProdutoId, setNovoProdutoId] = useState('');
  const [novoProdutoLabel, setNovoProdutoLabel] = useState('');
  const [novoTipoLata, setNovoTipoLata] = useState<OrdemProducaoTipoLata>('nova');
  const [novoLatas, setNovoLatas] = useState('0');
  const [novoClientes, setNovoClientes] = useState('');

  const ordem = initialData;
  const showSkeletonOnly = migrationPendingSkeleton && !ordem;
  const itens = useMemo(() => ordem?.itens ?? [], [ordem]);

  const caixasEstimadasNovo = useMemo(() => {
    const latas = Math.max(0, Number(novoLatas) || 0);
    return estimateCaixasFromLatas({ latas, unidadesPorLata: 1, boxUnits: 1 });
  }, [novoLatas]);

  const handleCreateOrdem = async () => {
    setError(null);
    setLoadingCreate(true);
    const r = await createOrdemProducaoDiaria({ dataProducao: selectedDateIso });
    setLoadingCreate(false);
    if (!r.success) {
      setError(r.error);
      return;
    }
    router.refresh();
  };

  const handlePublish = async () => {
    if (!ordem) return;
    setError(null);
    setLoadingPublish(true);
    const r = await publishOrdemProducao(ordem.id);
    setLoadingPublish(false);
    if (!r.success) {
      setError(r.error);
      return;
    }
    router.refresh();
  };

  const moveItem = async (itemId: string, dir: -1 | 1) => {
    if (!ordem) return;
    const idx = itens.findIndex((x) => x.id === itemId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= itens.length) return;
    const reordered = [...itens];
    const [current] = reordered.splice(idx, 1);
    reordered.splice(target, 0, current);
    const payload = reordered.map((row, i) => ({ itemId: row.id, prioridade: i + 1 }));
    const r = await reorderOrdemProducaoItems(ordem.id, payload);
    if (!r.success) {
      setError(r.error);
      return;
    }
    router.refresh();
  };

  const handleSaveRow = async (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoTipoLata;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacao?: string | null;
  }) => {
    if (!ordem) return;
    setError(null);
    setSavingItemId(payload.itemId);
    const r = await upsertOrdemProducaoItem({
      ordemId: ordem.id,
      itemId: payload.itemId,
      prioridade: payload.prioridade,
      produtoId: payload.produtoId,
      tipoLata: payload.tipoLata,
      latasPlanejadas: payload.latasPlanejadas,
      caixasEstimadas: payload.caixasEstimadas,
      clientes: payload.clientes,
      observacao: payload.observacao,
    });
    setSavingItemId(null);
    if (!r.success) {
      setError(r.error);
      return;
    }
    router.refresh();
  };

  const handleAddItem = async () => {
    if (!ordem) return;
    setError(null);
    const latas = Math.max(0, Math.round(Number(novoLatas) || 0));
    const clientes = novoClientes
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const r = await upsertOrdemProducaoItem({
      ordemId: ordem.id,
      produtoId: novoProdutoId.trim(),
      tipoLata: novoTipoLata,
      latasPlanejadas: latas,
      caixasEstimadas: caixasEstimadasNovo,
      clientes,
    });
    if (!r.success) {
      setError(r.error);
      return;
    }
    setNovoProdutoId('');
    setNovoProdutoLabel('');
    setNovoClientes('');
    setNovoLatas('0');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Producao - Ordem de producao" icon="list_alt" />
      <div className="mx-auto max-w-[min(100rem,calc(100vw-2rem))] space-y-4 px-3 py-4 sm:p-6 md:p-10">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="ordem-producao-data" className="block text-xs font-medium text-slate-600">
              Data de produção
            </label>
            <input
              id="ordem-producao-data"
              type="date"
              value={selectedDateIso}
              onChange={(e) => {
                const v = e.target.value;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
                router.replace(v === todayIso ? ordemProducaoUrl() : ordemProducaoUrl({ data: v }));
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            onClick={() => router.replace(ordemProducaoUrl())}
            disabled={selectedDateIso === todayIso}
          >
            Hoje
          </button>
        </div>

        {showSkeletonOnly && error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Pré-visualização — banco sem tabelas da ordem diária</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )
        )}

        {ordem || showSkeletonOnly ? (
          <>
            <OrdemProducaoHeader
              dataProducao={ordem?.dataProducao ?? selectedDateIso}
              dataEtiquetaDefault={ordem?.dataEtiquetaDefault ?? selectedDateIso}
              status={showSkeletonOnly ? 'Pré-visualização (sem tabelas)' : (ordem?.status ?? '')}
              onPublish={handlePublish}
              publishLoading={loadingPublish}
              publishDisabled={showSkeletonOnly}
            />

            <OrdemProducaoGrid
              items={showSkeletonOnly ? [] : itens}
              ordemDiariaId={ordem?.id ?? ''}
              onRemoveLineResult={(msg) => setError(msg)}
              previewMode={showSkeletonOnly}
              onMoveUp={(id) => {
                if (showSkeletonOnly) return;
                void moveItem(id, -1);
              }}
              onMoveDown={(id) => {
                if (showSkeletonOnly) return;
                void moveItem(id, 1);
              }}
              onSaveRow={(payload) => {
                if (showSkeletonOnly) return;
                void handleSaveRow(payload);
              }}
              savingItemId={showSkeletonOnly ? null : savingItemId}
            />

            <div
              className={
                showSkeletonOnly
                  ? 'select-none rounded-2xl border border-slate-200 bg-white p-4 opacity-60 shadow-sm pointer-events-none'
                  : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
              }
              aria-hidden={showSkeletonOnly}
            >
              <h3 className="text-base font-semibold text-slate-900">Adicionar item</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                <input type="hidden" value={novoProdutoId} readOnly />
                <SelectRemoteAutocomplete
                  value={novoProdutoId}
                  onChange={setNovoProdutoId}
                  stage="produtos"
                  label="Produto"
                  placeholder="Buscar produto..."
                  onOptionSelected={(opt: ProdutoAutocompleteOption | null) => {
                    setNovoProdutoLabel(opt?.label ?? '');
                  }}
                />
                <select
                  value={novoTipoLata}
                  onChange={(e) => setNovoTipoLata(e.target.value as OrdemProducaoTipoLata)}
                  className="rounded border px-2 py-2 text-sm"
                >
                  <option value="antiga">antiga</option>
                  <option value="nova">nova</option>
                  <option value="outra">outra</option>
                </select>
                <input
                  value={novoLatas}
                  onChange={(e) => setNovoLatas(e.target.value)}
                  className="rounded border px-2 py-2 text-sm"
                  placeholder="Latas"
                />
                <input
                  value={novoClientes}
                  onChange={(e) => setNovoClientes(e.target.value)}
                  className="rounded border px-2 py-2 text-sm"
                  placeholder="Clientes separados por vírgula"
                />
                <button
                  type="button"
                  onClick={() => void handleAddItem()}
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                >
                  Adicionar
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Caixas estimadas (informativo): {caixasEstimadasNovo}</p>
              {novoProdutoLabel && (
                <p className="mt-1 text-xs text-slate-500">Produto selecionado: {novoProdutoLabel}</p>
              )}
              {showSkeletonOnly && (
                <p className="mt-2 text-xs font-medium text-amber-900">
                  Após aplicar a migração, recarregue a página e use &quot;Criar ordem do dia&quot; para habilitar este
                  bloco.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Nenhuma ordem para esta data</h2>
            <p className="mt-1 text-sm text-slate-600">
              Crie a ordem diária para definir produtos e quantidades deste dia.
            </p>
            <button
              type="button"
              onClick={() => void handleCreateOrdem()}
              disabled={loadingCreate}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loadingCreate ? 'Criando...' : 'Criar ordem do dia'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

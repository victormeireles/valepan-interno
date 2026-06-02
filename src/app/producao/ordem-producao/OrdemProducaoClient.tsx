'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import type { OrdemProducaoLataSelecao } from '@/domain/types/ordem-producao';
import type { OrdemProducaoDiariaView } from '@/app/actions/producao-actions';
import {
  createOrdemProducaoDiaria,
  publishOrdemProducao,
  reorderOrdemProducaoItems,
  upsertOrdemProducaoItem,
} from '@/app/actions/producao-actions';
import { ordemProducaoUrl } from '@/lib/production/production-station-routes';
import OrdemProducaoHeader from '@/components/Producao/ordem/OrdemProducaoHeader';
import LatasUsoCard from '@/components/Producao/ordem/LatasUsoCard';
import type { LataUsoTipoResumo } from '@/lib/production/latas-uso-resumo';
import { totaisOrdemDiariaDia } from '@/lib/production/ordem-producao-cell-selection';
import OrdemProducaoGrid from '@/components/Producao/ordem/OrdemProducaoGrid';
import OrdemProducaoNovoItemModal from '@/components/Producao/ordem/OrdemProducaoNovoItemModal';
import type { OrdemProducaoNovoItemSubmitValues } from '@/components/Producao/ordem/OrdemProducaoNovoItemModal';
import type { TipoCaixaOrdemOpcao } from '@/app/actions/tipos-caixa-embalagem-actions';
import type { ClienteOrdemProducaoOpcao } from '@/app/actions/producao-actions';

type Props = {
  /** Data filtrada (YYYY-MM-DD, fuso Brasil no servidor quando sem query). */
  selectedDateIso: string;
  /** "Hoje" no fuso Brasil, para botão rápido e placeholder. */
  todayIso: string;
  initialData: OrdemProducaoDiariaView | null;
  initialError: string | null;
  /** Banco sem tabelas da ordem diária: mostra cabeçalho + grade vazia (esqueleto). */
  migrationPendingSkeleton?: boolean;
  /** Tipos de caixa ativos para o select nas linhas e no modal de novo item. */
  tiposCaixaOpcoesInicial: TipoCaixaOrdemOpcao[];
  /** Clientes para multiseleção nas linhas e no modal. */
  clientesOrdemOpcoesInicial: ClienteOrdemProducaoOpcao[];
  /** Latas em uso vs. estoque por tipo de assadeira (card do topo). */
  latasUsoResumoInicial: LataUsoTipoResumo[];
};

export default function OrdemProducaoClient({
  selectedDateIso,
  todayIso,
  initialData,
  initialError,
  migrationPendingSkeleton = false,
  tiposCaixaOpcoesInicial,
  clientesOrdemOpcoesInicial,
  latasUsoResumoInicial,
}: Props) {
  const router = useRouter();
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishOkHint, setPublishOkHint] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);

  useEffect(() => {
    setError(initialError);
    setPublishOkHint(null);
  }, [selectedDateIso, initialError, initialData]);

  const [novoItemOpen, setNovoItemOpen] = useState(false);

  const ordem = initialData;
  const showSkeletonOnly = migrationPendingSkeleton && !ordem;
  const itens = useMemo(() => ordem?.itens ?? [], [ordem]);
  const totaisDia = useMemo(() => (itens.length > 0 ? totaisOrdemDiariaDia(itens) : null), [itens]);

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
    setPublishOkHint(null);
    setLoadingPublish(true);
    try {
      const r = await publishOrdemProducao(ordem.id);
      if (!r.success) {
        setError(r.error);
        return;
      }
      setPublishOkHint('Dia marcado como pronto. A lista foi atualizada.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro inesperado ao marcar o dia como pronto.');
    } finally {
      setLoadingPublish(false);
    }
  };

  const reorderByDrag = async (sourceId: string, targetId: string, placeBefore: boolean) => {
    if (!ordem) return false;
    const ids = itens.map((x) => x.id);
    if (ids.indexOf(sourceId) < 0) return false;
    const semOrigem = ids.filter((id) => id !== sourceId);
    const targetIdx = semOrigem.indexOf(targetId);
    if (targetIdx < 0) return false;
    const insertIdx = placeBefore ? targetIdx : targetIdx + 1;
    const novaOrdem = [...semOrigem.slice(0, insertIdx), sourceId, ...semOrigem.slice(insertIdx)];
    // Nada mudou na ordem → evita gravação desnecessária.
    if (novaOrdem.every((id, i) => id === ids[i])) return false;
    const payload = novaOrdem.map((id, i) => ({ itemId: id, prioridade: i + 1 }));
    setError(null);
    const r = await reorderOrdemProducaoItems(ordem.id, payload);
    if (!r.success) {
      setError(r.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const handleDividirItem = async (
    itemId: string,
    parte1: {
      latasPlanejadas: number;
      caixasEstimadas: number;
      observacaoProducao: string | null;
      observacaoEmbalagem: string | null;
    },
    parte2: {
      latasPlanejadas: number;
      caixasEstimadas: number;
      observacaoProducao: string | null;
      observacaoEmbalagem: string | null;
    },
  ) => {
    if (!ordem) return false;
    const original = itens.find((x) => x.id === itemId);
    if (!original) return false;
    setError(null);

    // 1) Atualiza a ordem original com os valores da 1ª parte.
    const r1 = await upsertOrdemProducaoItem({
      ordemId: ordem.id,
      itemId,
      prioridade: original.prioridade,
      produtoId: original.produtoId,
      tipoLata: original.tipoLata,
      latasPlanejadas: parte1.latasPlanejadas,
      caixasEstimadas: parte1.caixasEstimadas,
      clientes: original.clientes,
      observacaoEmbalagem: parte1.observacaoEmbalagem,
      observacaoProducao: parte1.observacaoProducao,
      tipoCaixaEmbalagemId: original.tipoCaixaEmbalagemId,
    });
    if (!r1.success) {
      setError(r1.error);
      return false;
    }

    // 2) Cria a 2ª parte como novo item (mesmo produto/lata/tipo de caixa/clientes).
    const r2 = await upsertOrdemProducaoItem({
      ordemId: ordem.id,
      produtoId: original.produtoId,
      tipoLata: original.tipoLata,
      latasPlanejadas: parte2.latasPlanejadas,
      caixasEstimadas: parte2.caixasEstimadas,
      clientes: original.clientes,
      observacaoEmbalagem: parte2.observacaoEmbalagem,
      observacaoProducao: parte2.observacaoProducao,
      tipoCaixaEmbalagemId: original.tipoCaixaEmbalagemId,
    });
    if (!r2.success) {
      setError(r2.error);
      return false;
    }

    // 3) Reordena para a 2ª parte ficar logo após a original.
    const ordemIds = itens.map((x) => x.id);
    const idx = ordemIds.indexOf(itemId);
    const novaOrdem =
      idx >= 0
        ? [...ordemIds.slice(0, idx + 1), r2.itemId, ...ordemIds.slice(idx + 1)]
        : [...ordemIds, r2.itemId];
    const reorderPayload = novaOrdem.map((id, i) => ({ itemId: id, prioridade: i + 1 }));
    const r3 = await reorderOrdemProducaoItems(ordem.id, reorderPayload);
    if (!r3.success) {
      setError(r3.error);
      return false;
    }

    router.refresh();
    return true;
  };

  const handleSaveRow = async (payload: {
    itemId: string;
    prioridade: number;
    produtoId: string;
    tipoLata: OrdemProducaoLataSelecao;
    latasPlanejadas: number;
    caixasEstimadas: number;
    clientes: string[];
    observacaoEmbalagem?: string | null;
    observacaoProducao?: string | null;
    tipoCaixaEmbalagemId?: string | null;
  }) => {
    if (!ordem) return false;
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
      observacaoEmbalagem: payload.observacaoEmbalagem,
      observacaoProducao: payload.observacaoProducao,
      tipoCaixaEmbalagemId: payload.tipoCaixaEmbalagemId,
    });
    setSavingItemId(null);
    if (!r.success) {
      setError(r.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const handleAddItem = async (values: OrdemProducaoNovoItemSubmitValues) => {
    if (!ordem) return { success: false as const, error: 'Ordem inválida.' };
    setError(null);
    const r = await upsertOrdemProducaoItem({
      ordemId: ordem.id,
      produtoId: values.produtoId.trim(),
      tipoLata: values.tipoLata,
      latasPlanejadas: values.latasPlanejadas,
      caixasEstimadas: values.caixasEstimadas,
      clientes: values.clientes,
      observacaoEmbalagem: values.observacaoEmbalagem,
      observacaoProducao: values.observacaoProducao,
      tipoCaixaEmbalagemId: values.tipoCaixaEmbalagemId,
    });
    if (!r.success) {
      setError(r.error);
      return { success: false as const, error: r.error };
    }
    router.refresh();
    return { success: true as const };
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Producao - Ordem de producao" icon="list_alt" />
      <div className="mx-auto max-w-[min(100rem,calc(100vw-2rem))] space-y-4 px-3 py-4 sm:p-6 md:p-10">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="min-w-[10rem] flex-1">
                <label
                  htmlFor="ordem-producao-data"
                  className="block text-xs font-medium text-slate-600"
                >
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

            {ordem || showSkeletonOnly ? (
              <OrdemProducaoHeader
                dataProducao={ordem?.dataProducao ?? selectedDateIso}
                dataEtiquetaDefault={ordem?.dataEtiquetaDefault ?? selectedDateIso}
                status={showSkeletonOnly ? 'Pré-visualização (sem tabelas)' : (ordem?.status ?? '')}
                onPublish={handlePublish}
                publishLoading={loadingPublish}
                publishDisabled={showSkeletonOnly}
                publishAllowed={
                  showSkeletonOnly ||
                  !ordem ||
                  String(ordem.status ?? '').trim().toLowerCase() === 'rascunho'
                }
              />
            ) : null}
          </div>

          {ordem && !showSkeletonOnly ? (
            <LatasUsoCard
              resumo={latasUsoResumoInicial}
              totaisDia={totaisDia}
              className="lg:col-span-1"
            />
          ) : null}
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

        {publishOkHint && !error ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {publishOkHint}
          </div>
        ) : null}

        {ordem || showSkeletonOnly ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNovoItemOpen(true)}
                disabled={showSkeletonOnly}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                Novo item
              </button>
            </div>

            <OrdemProducaoGrid
              items={showSkeletonOnly ? [] : itens}
              ordemDiariaId={ordem?.id ?? ''}
              tiposCaixaOpcoes={tiposCaixaOpcoesInicial}
              clientesOrdemOpcoes={clientesOrdemOpcoesInicial}
              onRemoveLineResult={(msg) => setError(msg)}
              previewMode={showSkeletonOnly}
              onSaveRow={async (payload) => {
                if (showSkeletonOnly) return false;
                return handleSaveRow(payload);
              }}
              savingItemId={showSkeletonOnly ? null : savingItemId}
              onReorderDrag={async (sourceId, targetId, placeBefore) => {
                if (showSkeletonOnly) return false;
                return reorderByDrag(sourceId, targetId, placeBefore);
              }}
              onDividirItem={async (itemId, parte1, parte2) => {
                if (showSkeletonOnly) return false;
                return handleDividirItem(itemId, parte1, parte2);
              }}
            />

            <OrdemProducaoNovoItemModal
              open={novoItemOpen}
              onClose={() => setNovoItemOpen(false)}
              disabled={showSkeletonOnly}
              tiposCaixaOpcoes={tiposCaixaOpcoesInicial}
              clientesOrdemOpcoes={clientesOrdemOpcoesInicial}
              onSubmit={handleAddItem}
            />
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

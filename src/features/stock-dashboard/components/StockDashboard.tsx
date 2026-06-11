'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import { StockTipoPanel } from './StockTipoPanel';
import { StockTipoTabs } from './StockTipoNav';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';
import { StockOutflowDialog } from './StockOutflowDialog';
import { StockHistoryDialog } from './StockHistoryDialog';
import { NewStockDialog } from './NewStockDialog';
import {
  adjustStockAction,
  registerOutflowAction,
} from '@/app/actions/stock-actions';
import type { StockCardSelection } from '../types';

interface Props {
  initialData: EstoqueRecord[];
}

type FeedbackState =
  | { type: 'success' | 'error'; message: string }
  | null;

type OutflowFormPayload = {
  data: string;
  clienteDestino: string;
  observacao?: string;
  quantidade: Quantidade;
  foto?: File | null;
};

const quantidadeZerada: Quantidade = {
  caixas: 0,
  pacotes: 0,
  unidades: 0,
  kg: 0,
};

export const StockDashboard: React.FC<Props> = ({ initialData }) => {
  const [currentData, setCurrentData] = useState(initialData);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [adjustTarget, setAdjustTarget] =
    useState<StockCardSelection | null>(null);
  const [outflowTarget, setOutflowTarget] =
    useState<StockCardSelection | null>(null);
  const [historyTarget, setHistoryTarget] =
    useState<StockCardSelection | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [outflowLoading, setOutflowLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newStockOpen, setNewStockOpen] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');
  const [selectedTipoId, setSelectedTipoId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentData(initialData);
  }, [initialData]);

  const { summary, isEmpty, filterTree } =
    useStockDashboardViewModel(currentData);

  const filteredTree = useMemo(
    () => filterTree(filterTerm),
    [filterTree, filterTerm],
  );

  useEffect(() => {
    if (filteredTree.length === 0) {
      setSelectedTipoId(null);
      return;
    }

    const stillVisible = filteredTree.some(
      (t) => t.tipoEstoqueId === selectedTipoId,
    );

    if (!selectedTipoId || !stillVisible) {
      setSelectedTipoId(filteredTree[0].tipoEstoqueId);
    }
  }, [filteredTree, selectedTipoId]);

  const selectedTipo = useMemo(
    () =>
      filteredTree.find((t) => t.tipoEstoqueId === selectedTipoId) ?? null,
    [filteredTree, selectedTipoId],
  );

  const showFeedback = useCallback((feedbackState: FeedbackState) => {
    setFeedback(feedbackState);
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const upsertRecord = useCallback((record: EstoqueRecord) => {
    setCurrentData((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.cliente === record.cliente &&
          item.produto === record.produto,
      );
      if (idx === -1) {
        return [...prev, record];
      }
      const clone = [...prev];
      clone[idx] = record;
      return clone;
    });
  }, []);

  const applyOutflow = useCallback(
    (selection: StockCardSelection, delta: Quantidade) => {
      setCurrentData((prev) => {
        let updated = false;
        const next = prev.map((record) => {
          if (
            record.cliente === selection.estoqueNome &&
            record.produto === selection.produto
          ) {
            updated = true;
            return {
              ...record,
              quantidade: subtrairQuantidade(
                record.quantidade,
                delta,
              ),
              atualizadoEm: new Date().toISOString(),
            };
          }
          return record;
        });
        if (updated) return next;
        return [
          ...next,
          {
            cliente: selection.estoqueNome,
            produto: selection.produto,
            quantidade: subtrairQuantidade(
              selection.quantidade,
              delta,
            ),
            inventarioAtualizadoEm: undefined,
            atualizadoEm: new Date().toISOString(),
          },
        ];
      });
    },
    [],
  );

  const handleAdjustRequest = useCallback((selection: StockCardSelection) => {
    setAdjustTarget(selection);
  }, []);

  const handleOutflowRequest = useCallback((selection: StockCardSelection) => {
    setOutflowTarget(selection);
  }, []);

  const handleConfirmAdjust = useCallback(
    async (novaQuantidade: Quantidade) => {
      if (!adjustTarget) {
        throw new Error('Nenhum produto selecionado');
      }
      setAdjustLoading(true);
      try {
        const response = await adjustStockAction({
          estoqueNome: adjustTarget.estoqueNome,
          produto: adjustTarget.produto,
          quantidade: novaQuantidade,
        });
        upsertRecord(response.record);
        setAdjustTarget(null);
        showFeedback({
          type: 'success',
          message: 'Estoque atualizado com sucesso!',
        });
      } catch (error) {
        showFeedback({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Falha ao ajustar estoque.',
        });
        throw error;
      } finally {
        setAdjustLoading(false);
      }
    },
    [adjustTarget, showFeedback, upsertRecord],
  );

  const handleOutflowSubmit = useCallback(
    async (payload: OutflowFormPayload) => {
      if (!outflowTarget) {
        throw new Error('Nenhum produto selecionado');
      }
      setOutflowLoading(true);
      const deveAnexarFoto = Boolean(payload.foto);
      try {
        await registerOutflowAction({
          data: payload.data,
          clienteDestino: payload.clienteDestino,
          produto: outflowTarget.produto,
          quantidade: payload.quantidade,
          observacao: payload.observacao,
          estoqueOrigem: outflowTarget.estoqueNome,
          skipNotification: deveAnexarFoto,
        });
        applyOutflow(outflowTarget, payload.quantidade);
        if (payload.foto) {
          setPhotoUploading(true);
          await anexarFotoNaSaida({
            data: payload.data,
            cliente: payload.clienteDestino,
            produto: outflowTarget.produto,
            quantidade: payload.quantidade,
            foto: payload.foto,
          });
        }
        setOutflowTarget(null);
        showFeedback({
          type: 'success',
          message: 'Saída registrada com sucesso!',
        });
      } catch (error) {
        showFeedback({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Falha ao registrar saída.',
        });
        throw error;
      } finally {
        setOutflowLoading(false);
        if (deveAnexarFoto) {
          setPhotoUploading(false);
        }
      }
    },
    [outflowTarget, applyOutflow, showFeedback],
  );

  const reloadStock = useCallback(async () => {
    try {
      const res = await fetch('/api/painel/estoque');
      const json = await res.json();
      if (res.ok && json.data) {
        setCurrentData(json.data);
        showFeedback({
          type: 'success',
          message: 'Estoque criado/atualizado com sucesso!',
        });
      }
    } catch {
      // Erro ao recarregar estoque
    }
  }, [showFeedback]);

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-medium text-gray-800">
          Nenhum dado de estoque encontrado
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Use &quot;Novo Estoque&quot; para cadastrar o primeiro item.
        </p>
        <button
          type="button"
          onClick={() => setNewStockOpen(true)}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          + Novo Estoque
        </button>
        <NewStockDialog
          isOpen={newStockOpen}
          loading={false}
          onClose={() => setNewStockOpen(false)}
          onSuccess={reloadStock}
        />
      </div>
    );
  }

  const hasFilter = filterTerm.trim().length > 0;
  const noFilterResults = hasFilter && filteredTree.length === 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <p className="text-sm font-medium">{feedback.message}</p>
          <button
            type="button"
            onClick={closeFeedback}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-current min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label="Total estoque"
              value={formatQuantidade(summary.totalEstoque)}
              accent="blue"
            />
            <StatCard
              label="Tipos de estoque"
              value={String(summary.totalClientes)}
              accent="gray"
            />
            <StatCard
              label="Produtos"
              value={String(summary.totalProdutos)}
              accent="gray"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewStockOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-stretch rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 sm:self-center"
          >
            <span aria-hidden="true">+</span>
            Novo Estoque
          </button>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <StockTipoTabs
              tipos={filteredTree}
              selectedId={selectedTipoId}
              onSelect={setSelectedTipoId}
              className="min-w-0"
            />

            <div className="relative w-full shrink-0 lg:w-72 xl:w-80">
              <label htmlFor="stock-filter" className="sr-only">
                Filtrar por família ou produto
              </label>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <SearchIcon />
              </div>
              <input
                id="stock-filter"
                type="search"
                value={filterTerm}
                onChange={(e) => setFilterTerm(e.target.value)}
                placeholder="Buscar família ou produto…"
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-10 text-base text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 min-h-11"
                autoComplete="off"
              />
              {hasFilter && (
                <button
                  type="button"
                  onClick={() => setFilterTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-gray-700 min-w-11 justify-center"
                  aria-label="Limpar filtro"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {hasFilter && !noFilterResults && (
            <p className="mt-2 text-xs font-medium text-gray-500">
              {filteredTree.length} tipo
              {filteredTree.length === 1 ? '' : 's'} de estoque encontrado
              {filteredTree.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

      {noFilterResults ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="text-sm font-medium text-gray-800">
            Nenhum resultado para &quot;{filterTerm.trim()}&quot;
          </p>
          <button
            type="button"
            onClick={() => setFilterTerm('')}
            className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline"
          >
            Limpar filtro
          </button>
        </div>
      ) : (
        selectedTipo && (
          <StockTipoPanel
            tipo={selectedTipo}
            filterTerm={filterTerm.trim()}
            onAdjustStock={handleAdjustRequest}
            onRegisterOutflow={handleOutflowRequest}
            onViewHistory={setHistoryTarget}
          />
        )
      )}

      <StockAdjustmentDialog
        isOpen={Boolean(adjustTarget)}
        produto={adjustTarget?.produto ?? ''}
        estoqueNome={adjustTarget?.estoqueNome ?? ''}
        quantidadeAtual={adjustTarget?.quantidade ?? quantidadeZerada}
        loading={adjustLoading}
        onClose={() => setAdjustTarget(null)}
        onConfirm={handleConfirmAdjust}
      />

      <StockHistoryDialog
        isOpen={Boolean(historyTarget)}
        estoqueNome={historyTarget?.estoqueNome ?? ''}
        produto={historyTarget?.produto ?? ''}
        quantidadeAtual={historyTarget?.quantidade ?? quantidadeZerada}
        tipoEstoqueId={historyTarget?.tipoEstoqueId}
        produtoId={historyTarget?.produtoId}
        onClose={() => setHistoryTarget(null)}
      />

      <StockOutflowDialog
        isOpen={Boolean(outflowTarget)}
        estoqueNome={outflowTarget?.estoqueNome ?? ''}
        produto={outflowTarget?.produto ?? ''}
        quantidadeDisponivel={
          outflowTarget?.quantidade ?? quantidadeZerada
        }
        loading={outflowLoading || photoUploading}
        onClose={() => setOutflowTarget(null)}
        onSubmit={handleOutflowSubmit}
      />

      <NewStockDialog
        isOpen={newStockOpen}
        loading={false}
        onClose={() => setNewStockOpen(false)}
        onSuccess={reloadStock}
      />
    </div>
  );
};

type PainelSaidaItem = {
  id?: string;
  data?: string;
  cliente?: string;
  produto?: string;
  saidaUpdatedAt?: string;
  fotoUrl?: string;
};

type AnexarFotoPayload = {
  data: string;
  cliente: string;
  produto: string;
  quantidade: Quantidade;
  foto: File;
};

async function anexarFotoNaSaida({
  data,
  cliente,
  produto,
  quantidade,
  foto,
}: AnexarFotoPayload) {
  const painelRes = await fetch(`/api/painel/saidas?date=${data}`);
  const painelData = await painelRes.json();
  if (!painelRes.ok) {
    throw new Error(
      painelData.error ||
        'Saída criada, mas falhou ao localizar a linha para anexar foto.',
    );
  }

  const rows = (painelData.items || []) as PainelSaidaItem[];
  const candidate = [...rows]
    .reverse()
    .find(
      (row) =>
        row.data === data &&
        row.cliente === cliente &&
        row.produto === produto &&
        (!row.saidaUpdatedAt || !row.fotoUrl),
    );

  if (!candidate?.id) {
    throw new Error(
      'Saída criada, mas não foi possível identificar a linha para anexar foto.',
    );
  }

  const formData = new FormData();
  formData.append('photo', foto);
  formData.append('rowId', candidate.id);
  formData.append('photoType', 'saida');
  formData.append('process', 'saidas');

  const uploadRes = await fetch('/api/upload/photo', {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    throw new Error(
      uploadData.error || 'Falha ao enviar foto da saída.',
    );
  }

  await fetch(`/api/producao/saidas/${candidate.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      realizado: quantidade,
      fotoUrl: uploadData.photoUrl,
      fotoId: uploadData.photoId,
    }),
  });
}

function subtrairQuantidade(
  base: Quantidade,
  delta: Quantidade,
): Quantidade {
  return {
    caixas: base.caixas - (delta.caixas || 0),
    pacotes: base.pacotes - (delta.pacotes || 0),
    unidades: base.unidades - (delta.unidades || 0),
    kg: parseFloat((base.kg - (delta.kg || 0)).toFixed(3)),
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'blue' | 'gray';
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        accent === 'blue'
          ? 'bg-blue-50 ring-1 ring-blue-100'
          : 'bg-gray-50 ring-1 ring-gray-100'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>
      <p
        className={`mt-0.5 text-base font-bold tabular-nums leading-tight sm:text-lg ${
          accent === 'blue' ? 'text-blue-900' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

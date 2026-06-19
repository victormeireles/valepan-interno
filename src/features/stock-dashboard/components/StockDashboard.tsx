'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import { StockTipoPanel } from './StockTipoPanel';
import { StockDashboardToolbar } from './StockDashboardToolbar';
import { StatTile } from '@/components/ui/StatTile';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
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

  const { isEmpty, filterTree } =
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

  const tipoStats = useMemo(() => {
    if (!selectedTipo) {
      return { totalCx: 0, familias: 0, skus: 0, zeradas: 0 };
    }

    const familias = selectedTipo.familias;
    const totalCx = familias.reduce(
      (acc, familia) =>
        acc +
        familia.produtos.reduce((sum, p) => sum + p.quantidade.caixas, 0),
      0,
    );
    const skus = familias.reduce((acc, f) => acc + f.produtos.length, 0);
    const zeradas = familias.reduce(
      (acc, familia) =>
        acc +
        familia.produtos.filter(
          (p) =>
            p.quantidade.caixas === 0 &&
            p.quantidade.pacotes === 0 &&
            p.quantidade.unidades === 0 &&
            p.quantidade.kg === 0,
        ).length,
      0,
    );

    return {
      totalCx,
      familias: familias.length,
      skus,
      zeradas,
    };
  }, [selectedTipo]);

  const fmtInt = (n: number) =>
    n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  const updatedAtLabel = useMemo(() => {
    const timestamps = currentData
      .map((record) => record.atualizadoEm || record.inventarioAtualizadoEm)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));

    if (timestamps.length === 0) {
      return null;
    }

    return new Date(Math.max(...timestamps)).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [currentData]);

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
      <>
        <StockDashboardToolbar
          filterTerm={filterTerm}
          onFilterChange={setFilterTerm}
          tipos={[]}
          selectedTipoId={null}
          onSelectTipo={setSelectedTipoId}
          onNewStock={() => setNewStockOpen(true)}
          updatedAtLabel={updatedAtLabel}
        />
        <div>
          <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <EmptyState
              icon="inventory_2"
              title="Nenhum dado de estoque encontrado"
              description='Use "Novo estoque" para cadastrar o primeiro item.'
              action={
                <Button icon="add" onClick={() => setNewStockOpen(true)}>
                  Novo estoque
                </Button>
              }
            />
          </div>
          <NewStockDialog
            isOpen={newStockOpen}
            loading={false}
            onClose={() => setNewStockOpen(false)}
            onSuccess={reloadStock}
          />
        </div>
      </>
    );
  }

  const hasFilter = filterTerm.trim().length > 0;
  const noFilterResults = hasFilter && filteredTree.length === 0;
  const filterResultHint =
    hasFilter && !noFilterResults
      ? `${filteredTree.length} tipo${filteredTree.length === 1 ? '' : 's'} de estoque encontrado${filteredTree.length === 1 ? '' : 's'}`
      : null;

  return (
    <>
      <StockDashboardToolbar
        filterTerm={filterTerm}
        onFilterChange={setFilterTerm}
        tipos={filteredTree}
        selectedTipoId={selectedTipoId}
        onSelectTipo={setSelectedTipoId}
        onNewStock={() => setNewStockOpen(true)}
        updatedAtLabel={updatedAtLabel}
        filterResultHint={filterResultHint}
      />

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
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="Fechar aviso"
            >
              <span className="material-icons text-base" aria-hidden="true">
                close
              </span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Total em caixas"
            value={fmtInt(tipoStats.totalCx)}
            unit="cx"
            tone="accent"
            icon="inventory_2"
          />
          <StatTile
            label="Famílias"
            value={fmtInt(tipoStats.familias)}
            tone="default"
            icon="bakery_dining"
          />
          <StatTile
            label="SKUs ativos"
            value={fmtInt(tipoStats.skus)}
            tone="default"
            icon="category"
          />
          <StatTile
            label="Variações zeradas"
            value={fmtInt(tipoStats.zeradas)}
            tone={tipoStats.zeradas > 0 ? 'danger' : 'default'}
            icon={tipoStats.zeradas > 0 ? 'error_outline' : 'check_circle'}
          />
        </div>

        {noFilterResults ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white shadow-sm">
            <EmptyState
              icon="search_off"
              title={`Nenhum resultado para "${filterTerm.trim()}"`}
              action={
                <Button variant="ghost" onClick={() => setFilterTerm('')}>
                  Limpar filtro
                </Button>
              }
            />
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
    </>
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

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { EstoqueRecord, Quantidade } from '@/domain/types/inventario';
import { useStockDashboardViewModel } from '../hooks/useStockDashboardViewModel';
import {
  ClientStockBlock,
  StockCardSelection,
} from './ClientStockBlock';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';
import { StockOutflowDialog } from './StockOutflowDialog';
import { NewStockDialog } from './NewStockDialog';
import {
  adjustStockAction,
  registerOutflowAction,
} from '@/app/actions/stock-actions';

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
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [outflowLoading, setOutflowLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newStockOpen, setNewStockOpen] = useState(false);

  useEffect(() => {
    setCurrentData(initialData);
  }, [initialData]);

  const { stockData, summary, isEmpty } =
    useStockDashboardViewModel(currentData);

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

  if (isEmpty) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
        Nenhum dado de estoque encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 ${
            feedback.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <p className="text-sm font-medium">{feedback.message}</p>
          <button
            type="button"
            onClick={closeFeedback}
            className="text-xs font-semibold uppercase tracking-wide"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                Total Estoque
              </p>
              <p className="text-lg font-bold text-gray-900">
                {formatQuantidade(summary.totalEstoque)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                Total Produtos
              </p>
              <p className="text-lg font-bold text-gray-900">
                {summary.totalProdutos}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNewStockOpen(true)}
            className="ml-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>Novo Estoque</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {stockData.clients.map((cliente) => {
          const clientSummary = stockData.stockByClient.get(cliente);
          if (!clientSummary) return null;
          
          return (
            <ClientStockBlock
              key={cliente}
              cliente={cliente}
              summary={clientSummary}
              onAdjustStock={handleAdjustRequest}
              onRegisterOutflow={handleOutflowRequest}
            />
          );
        })}
      </div>

        <StockAdjustmentDialog
        isOpen={Boolean(adjustTarget)}
        produto={adjustTarget?.produto ?? ''}
        estoqueNome={adjustTarget?.estoqueNome ?? ''}
        quantidadeAtual={adjustTarget?.quantidade ?? quantidadeZerada}
        loading={adjustLoading}
        onClose={() => setAdjustTarget(null)}
        onConfirm={handleConfirmAdjust}
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
        onSuccess={async () => {
          // Recarregar dados do estoque
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
          } catch (_error) {
            // Erro ao recarregar estoque
          }
        }}
      />
    </div>
  );
};

type PainelSaidaItem = {
  rowIndex?: number;
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

  if (!candidate?.rowIndex) {
    throw new Error(
      'Saída criada, mas não foi possível identificar a linha para anexar foto.',
    );
  }

  const formData = new FormData();
  formData.append('photo', foto);
  formData.append('rowId', candidate.rowIndex.toString());
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

  await fetch(`/api/producao/saidas/${candidate.rowIndex}`, {
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
    caixas: clampZero(base.caixas - (delta.caixas || 0)),
    pacotes: clampZero(base.pacotes - (delta.pacotes || 0)),
    unidades: clampZero(base.unidades - (delta.unidades || 0)),
    kg: clampZero(base.kg - (delta.kg || 0)),
  };
}

function clampZero(value: number) {
  return value < 0 ? 0 : value;
}


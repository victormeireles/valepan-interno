'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMassaLote, getMassaLotesByOrder } from '@/app/actions/producao-massa-actions';
import { getMasseiras } from '@/app/actions/producao-etapas-actions';
import { MassaLote } from '@/domain/types/producao-massa';
import { formatReceitasBatidasDisplay } from '@/lib/utils/number-utils';

interface MassaLotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLote: (loteId: string) => void;
  onNewLote: () => void;
  reloadToken?: number;
  ordemProducaoId: string;
  produtoNome: string;
  loteCodigo: string;
}

interface Masseira {
  id: string;
  nome: string;
}

function minutosInteiroDoDecimal(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 0) return 0;
  return Math.max(0, Math.round(decimal));
}

export default function MassaLotesModal({
  isOpen,
  onClose,
  onOpenLote,
  onNewLote,
  reloadToken,
  ordemProducaoId,
  produtoNome,
  loteCodigo,
}: MassaLotesModalProps) {
  const router = useRouter();
  const [lotes, setLotes] = useState<MassaLote[]>([]);
  const [masseiras, setMasseiras] = useState<Masseira[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, ordemProducaoId, reloadToken]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lotesResult, masseirasResult] = await Promise.all([
        getMassaLotesByOrder(ordemProducaoId),
        getMasseiras(),
      ]);

      if (lotesResult.success && lotesResult.data) {
        setLotes(lotesResult.data);
      } else {
        setLotes([]);
      }

      if (masseirasResult.success && masseirasResult.data) {
        setMasseiras(masseirasResult.data);
      }
    } catch {
      setLotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLote = (loteId: string) => {
    onOpenLote(loteId);
  };

  const handleNewLote = () => {
    onNewLote();
  };

  const handleDeleteLote = async (loteId: string) => {
    const ok = window.confirm(
      'Excluir este lote de massa? Os ingredientes registrados serão removidos. Esta ação não pode ser desfeita.',
    );
    if (!ok) return;

    setDeletingId(loteId);
    try {
      const result = await deleteMassaLote(loteId);
      if (!result.success) {
        window.alert(result.error || 'Não foi possível excluir o lote.');
        return;
      }
      await loadData();
      router.refresh();
    } catch {
      window.alert('Erro ao excluir o lote.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/45 p-0 sm:items-center sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="massa-lotes-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Fechar" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-200 bg-gray-50/90 px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            <h2 id="massa-lotes-modal-title" className="truncate text-sm font-semibold leading-tight text-gray-900">
              Massa — lotes
            </h2>
            <p className="truncate text-[11px] leading-snug text-gray-600">
              <span className="font-mono text-gray-700">{loteCodigo}</span>
              <span className="text-gray-400"> · </span>
              {produtoNome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
            aria-label="Fechar"
          >
            <span className="material-icons text-lg leading-none">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
            </div>
          ) : (
            <>
              {lotes.length > 0 ? (
                <div className="mb-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Lotes ({lotes.length})
                  </p>
                  {lotes.map((lote) => {
                    const masseira = lote.masseira_id ? masseiras.find((m) => m.id === lote.masseira_id) : null;
                    const tempoLentaMin =
                      lote.tempo_lenta != null ? minutosInteiroDoDecimal(lote.tempo_lenta) : null;
                    const tempoRapidaMin =
                      lote.tempo_rapida != null ? minutosInteiroDoDecimal(lote.tempo_rapida) : null;

                    const detalhes: string[] = [];
                    if (masseira) detalhes.push(masseira.nome);
                    if (lote.temperatura_final != null) detalhes.push(`${lote.temperatura_final}°C`);
                    if (lote.ph_massa != null && !Number.isNaN(lote.ph_massa)) {
                      detalhes.push(
                        `pH ${lote.ph_massa.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
                      );
                    }
                    if (tempoLentaMin != null && tempoLentaMin > 0) detalhes.push(`Lenta ${tempoLentaMin}′`);
                    if (tempoRapidaMin != null && tempoRapidaMin > 0) detalhes.push(`Rápida ${tempoRapidaMin}′`);

                    return (
                      <div
                        key={lote.id}
                        className="rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                              <span className="text-xs font-semibold text-gray-900">
                                {formatReceitasBatidasDisplay(lote.receitas_batidas) || '0'} rec.
                              </span>
                              <span className="text-[10px] tabular-nums text-gray-500">
                                {new Date(lote.created_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {detalhes.length > 0 && (
                              <p className="mt-0.5 text-[10px] leading-snug text-gray-600">{detalhes.join(' · ')}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditLote(lote.id)}
                              className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === lote.id}
                              onClick={() => void handleDeleteLote(lote.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              title="Excluir lote"
                            >
                              {deletingId === lote.id ? (
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-700" />
                              ) : (
                                <span className="material-icons text-base leading-none">delete_outline</span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mb-3 py-4 text-center">
                  <span className="material-icons mb-1 text-2xl text-gray-300">inventory_2</span>
                  <p className="text-xs text-gray-600">Nenhum lote ainda</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleNewLote}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-black"
              >
                <span className="material-icons text-base leading-none">add</span>
                {lotes.length === 0 ? 'Novo lote' : 'Novo lote'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

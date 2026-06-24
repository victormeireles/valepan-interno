'use client';

import { useCallback, useEffect, useState } from 'react';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';
import type { Quantidade } from '@/domain/types/inventario';
import { formatQuantidade } from '@/lib/utils/quantidade-formatter';
import {
  dateInputsToIsoRange,
  getPresetRange,
  type EstoqueDatePreset,
} from '@/lib/utils/estoque-date-range';
import { StockMovementTimeline } from './StockMovementTimeline';

export type StockHistoryDialogProps = {
  isOpen: boolean;
  estoqueNome: string;
  produto: string;
  quantidadeAtual: Quantidade;
  tipoEstoqueId?: string;
  produtoId?: string;
  onClose: () => void;
};

const PRESETS: { id: EstoqueDatePreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: '7 dias' },
];

export function StockHistoryDialog({
  isOpen,
  estoqueNome,
  produto,
  quantidadeAtual,
  tipoEstoqueId,
  produtoId,
  onClose,
}: StockHistoryDialogProps) {
  const [activePreset, setActivePreset] = useState<EstoqueDatePreset | null>(
    'hoje',
  );
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [movimentos, setMovimentos] = useState<EstoqueMovimentoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canFetch = Boolean(tipoEstoqueId && produtoId);
  const truncated = movimentos.length >= 100;
  const showDateOnTime = de !== ate;

  const carregar = useCallback(async () => {
    if (!tipoEstoqueId || !produtoId || !de || !ate) {
      setMovimentos([]);
      setError(
        'Histórico disponível apenas com estoque no banco de dados.',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { de: deIso, ate: ateIso } = dateInputsToIsoRange(de, ate);
      const params = new URLSearchParams({
        tipoEstoqueId,
        produtoId,
        de: deIso,
        ate: ateIso,
        limit: '100',
      });
      const res = await fetch(`/api/estoque/movimentos?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Erro ao carregar movimentos');
      }
      setMovimentos(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMovimentos([]);
    } finally {
      setLoading(false);
    }
  }, [tipoEstoqueId, produtoId, de, ate]);

  useEffect(() => {
    if (!isOpen) return;
    const range = getPresetRange('hoje');
    setActivePreset('hoje');
    setDe(range.de);
    setAte(range.ate);
    setMovimentos([]);
    setError(null);
  }, [isOpen, produto, estoqueNome]);

  useEffect(() => {
    if (!isOpen || !de || !ate) return;
    void carregar();
  }, [isOpen, de, ate, carregar]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const applyPreset = (preset: EstoqueDatePreset) => {
    const range = getPresetRange(preset);
    setActivePreset(preset);
    setDe(range.de);
    setAte(range.ate);
  };

  if (!isOpen) return null;

  const titleId = 'stock-history-dialog-title';
  const countLabel =
    loading || error || !canFetch
      ? null
      : movimentos.length === 0
        ? 'Nenhum movimento'
        : `${movimentos.length} movimento${movimentos.length === 1 ? '' : 's'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 px-0 sm:px-4 py-0 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="flex w-full sm:max-w-xl max-h-[92dvh] sm:max-h-[90dvh] flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 px-5 pt-5 pb-4 sm:px-6">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />

          <div className="flex items-start justify-between gap-3">
            <header className="min-w-0 flex-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                Histórico de movimentos
              </p>
              <h2
                id={titleId}
                className="text-xl font-bold leading-tight text-gray-900 truncate"
                title={produto}
              >
                {produto}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {estoqueNome}
                </span>
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-blue-800 ring-1 ring-blue-100">
                  Atual: {formatQuantidade(quantidadeAtual)}
                </span>
                {countLabel && (
                  <span
                    className="inline-flex rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-medium tabular-nums text-white"
                    aria-live="polite"
                  >
                    {countLabel}
                  </span>
                )}
              </div>
            </header>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 flex items-center justify-center rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-11 min-w-11"
              aria-label="Fechar"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 p-3 space-y-3">
            <div
              className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200"
              role="group"
              aria-label="Atalhos de período"
            >
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-colors min-h-11 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    activePreset === preset.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                De
                <input
                  type="date"
                  value={de}
                  onChange={(e) => {
                    setActivePreset(null);
                    setDe(e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm min-h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-700">
                Até
                <input
                  type="date"
                  value={ate}
                  onChange={(e) => {
                    setActivePreset(null);
                    setAte(e.target.value);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm min-h-11 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            {loading && (
              <p className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <SpinnerIcon />
                Carregando movimentos…
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6 min-h-0 bg-gray-50/80">
          {truncated && (
            <div className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100">
              Mostrando os 100 movimentos mais recentes — refine o período se
              precisar de mais detalhe.
            </div>
          )}

          {error && (
            <div className="space-y-3 py-4">
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-100">
                {error}
              </div>
              {canFetch && (
                <button
                  type="button"
                  onClick={() => void carregar()}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          {loading && (
            <div className="space-y-2 animate-pulse py-1" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="rounded-r-xl border border-gray-100 border-l-4 border-l-gray-200 bg-white py-3 px-3"
                >
                  <div className="flex justify-between gap-2">
                    <div className="h-4 w-12 rounded bg-gray-200" />
                    <div className="h-5 w-20 rounded-full bg-gray-200" />
                  </div>
                  <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && movimentos.length === 0 && canFetch && (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-gray-800">
                Nenhum movimento neste período
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Tente ampliar o intervalo com os atalhos ou as datas acima.
              </p>
            </div>
          )}

          {!loading && !error && movimentos.length > 0 && (
            <StockMovementTimeline
              movimentos={movimentos}
              showDateOnTime={showDateOnTime}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

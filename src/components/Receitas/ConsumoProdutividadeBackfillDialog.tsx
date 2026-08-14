'use client';

import { useEffect, useId, useState } from 'react';
import {
  aplicarConsumoProdutividadeBackfill,
  previewConsumoProdutividadeBackfill,
} from '@/app/actions/insumo-consumo-produtividade-backfill-actions';
import type { ProdutividadeConsumoChange } from '@/domain/insumos/insumo-consumo-produtividade-change';
import type { ConsumoProdutividadeBackfillPreview } from '@/lib/services/insumo-consumo-produtividade-backfill-service';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  changes: ProdutividadeConsumoChange[];
  onSkip: () => void;
  onDone: (message: string) => void;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value);
}

function resumirProdutos(nomes: string[]): string {
  if (nomes.length === 0) return '';
  if (nomes.length === 1) return nomes[0];
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1]}`;
  return `${nomes[0]} e mais ${nomes.length - 1}`;
}

export default function ConsumoProdutividadeBackfillDialog({
  open,
  changes,
  onSkip,
  onDone,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const dateId = useId();
  const [desde, setDesde] = useState('');
  const [preview, setPreview] = useState<ConsumoProdutividadeBackfillPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || changes.length === 0) {
      setPreview(null);
      setError(null);
      setDesde('');
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);
    setError(null);

    void previewConsumoProdutividadeBackfill({ changes, desde: null }).then((result) => {
      if (cancelled) return;
      setLoadingPreview(false);
      if (!result.success) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(result.preview);
    });

    return () => {
      cancelled = true;
    };
  }, [open, changes]);

  const handleRefreshPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    const result = await previewConsumoProdutividadeBackfill({
      changes,
      desde: desde || null,
    });
    setLoadingPreview(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPreview(result.preview);
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    const result = await aplicarConsumoProdutividadeBackfill({
      changes,
      desde: desde || null,
    });
    setApplying(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone(
      `Consumo histórico recalculado: ${result.result.lotesProcessados} lote(s), ${result.result.movimentosInseridos} ajuste(s).`,
    );
  };

  if (!open) return null;

  const busy = loadingPreview || applying;
  const produtosUnicos = [...new Set(changes.map((change) => change.produtoNome))];
  const produtosResumo = resumirProdutos(produtosUnicos);
  const canApply = Boolean(preview && preview.lotesTotais > 0 && !busy);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={busy ? undefined : onSkip}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-[0_12px_40px_-12px_rgb(28_25_23/0.28)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-stone-100 bg-stone-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"
              aria-hidden="true"
            >
              <span className="material-icons text-[22px]">history</span>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Receita / produtividade
              </p>
              <h2 id={titleId} className="mt-0.5 text-lg font-bold tracking-tight text-stone-900">
                Recalcular consumo histórico?
              </h2>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <p id={descId} className="text-sm leading-relaxed text-stone-600">
            O consumo futuro já usa a receita/produtividade atual
            {produtosResumo ? (
              <>
                {' '}
                de <span className="font-medium text-stone-800">{produtosResumo}</span>
              </>
            ) : null}
            . Se confirmar, os lotes são reconciliados na data de cada um (não em hoje). O saldo
            do novo insumo pode ficar mais negativo até o ajuste manual de estoque/entradas.
          </p>

          <div className="mt-4">
            <label htmlFor={dateId} className="block text-sm font-medium text-stone-800">
              A partir de
              <span className="ml-1 font-normal text-stone-500">(opcional)</span>
            </label>
            <input
              id={dateId}
              type="date"
              value={desde}
              disabled={busy}
              onChange={(event) => setDesde(event.target.value)}
              onBlur={() => void handleRefreshPreview()}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1.5 text-xs text-stone-500">Em branco = todo o histórico.</p>
          </div>

          {loadingPreview && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-600">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-amber-600"
                aria-hidden="true"
              />
              Estimando impacto…
            </div>
          )}

          {preview && !loadingPreview && (
            <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-stone-200/80 bg-white/70 px-3 py-2.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  <span className="font-mono tabular-nums">{formatNumber(preview.lotesTotais)}</span>
                  <span className="font-sans font-medium">lotes</span>
                </span>
                <span className="text-xs text-stone-500">
                  <span className="font-mono tabular-nums">{preview.items.length}</span> alteração
                  {preview.items.length === 1 ? '' : 'ões'}
                </span>
              </div>
              <ul className="max-h-44 divide-y divide-stone-100 overflow-y-auto px-3 py-1 text-sm">
                {preview.items.slice(0, 6).map((item) => (
                  <li
                    key={`${item.produtoId}-${item.tipo}`}
                    className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                  >
                    <span className="min-w-0 truncate font-medium text-stone-800">
                      {item.produtoNome}
                      <span className="ml-1.5 text-xs font-normal uppercase tracking-wide text-stone-400">
                        {item.tipo}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-stone-600">
                      {formatNumber(item.quantidadeAntes)} → {formatNumber(item.quantidadeDepois)}
                      <span className="text-stone-400"> · ×{formatNumber(item.fator)}</span>
                      <span className="text-stone-400"> · {item.lotesAfetados} lotes</span>
                    </span>
                  </li>
                ))}
              </ul>
              {preview.items.length > 6 && (
                <p className="border-t border-stone-200/80 px-3 py-2 text-xs text-stone-500">
                  +{preview.items.length - 6} produto(s) na mesma alteração
                </p>
              )}
            </div>
          )}

          {error && (
            <p
              className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-stone-100 bg-stone-50/60 px-5 py-4 sm:px-6">
          <p className="mb-3 text-xs leading-relaxed text-stone-500">
            Recomendado: manter só o futuro. Recalcular o histórico altera movimentos e saldo já
            registrados.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={!canApply}
              className="w-full sm:w-auto"
              icon={applying ? undefined : 'replay'}
              onClick={() => void handleApply()}
            >
              {applying ? 'Recalculando…' : 'Também o histórico'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={busy}
              className="w-full sm:w-auto"
              icon="check"
              onClick={onSkip}
            >
              Só futuro
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

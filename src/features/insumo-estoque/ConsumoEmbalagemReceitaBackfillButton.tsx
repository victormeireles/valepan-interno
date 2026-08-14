'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  aplicarBackfillEmbalagemPorInsumo,
  previewBackfillEmbalagemPorInsumo,
  resolverInsumoIdPorNome,
} from '@/app/actions/insumo-consumo-produtividade-backfill-actions';
import type { ConsumoProdutividadeBackfillPreview } from '@/lib/services/insumo-consumo-produtividade-backfill-service';
import { Button } from '@/components/ui/Button';

const INSUMO_ALVO = 'Embalagem plástica 560';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value);
}

export default function ConsumoEmbalagemReceitaBackfillButton() {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const dateId = useId();
  const [open, setOpen] = useState(false);
  const [insumoId, setInsumoId] = useState<string | null>(null);
  const [desde, setDesde] = useState('');
  const [preview, setPreview] = useState<ConsumoProdutividadeBackfillPreview | null>(null);
  const [produtos, setProdutos] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const busy = loadingPreview || applying;

  const loadPreview = async (resolvedInsumoId: string, desdeValue: string | null) => {
    setLoadingPreview(true);
    setError(null);
    const result = await previewBackfillEmbalagemPorInsumo({
      insumoId: resolvedInsumoId,
      desde: desdeValue,
    });
    setLoadingPreview(false);
    if (!result.success) {
      setError(result.error);
      setPreview(null);
      return;
    }
    setPreview(result.preview);
    setProdutos(result.produtos);
  };

  const handleOpen = async () => {
    setOpen(true);
    setDoneMessage(null);
    setDesde('');
    setPreview(null);
    setError(null);
    setLoadingPreview(true);

    const resolved = await resolverInsumoIdPorNome(INSUMO_ALVO);
    if (!resolved.success) {
      setLoadingPreview(false);
      setError(resolved.error);
      return;
    }
    setInsumoId(resolved.insumoId);
    await loadPreview(resolved.insumoId, null);
  };

  const handleRefreshPreview = async () => {
    if (!insumoId) return;
    await loadPreview(insumoId, desde || null);
  };

  const handleApply = async () => {
    if (!insumoId) return;
    setApplying(true);
    setError(null);
    const result = await aplicarBackfillEmbalagemPorInsumo({
      insumoId,
      desde: desde || null,
    });
    setApplying(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDoneMessage(
      `Consumo histórico recalculado: ${result.result.lotesProcessados} lote(s), ${result.result.movimentosInseridos} ajuste(s).`,
    );
    setOpen(false);
    router.refresh();
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
  };

  const canApply = Boolean(preview && preview.lotesTotais > 0 && !busy && insumoId);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button
        type="button"
        variant="secondary"
        icon="history"
        className="h-11"
        onClick={() => void handleOpen()}
      >
        Recalcular embalagem 560
      </Button>

      {doneMessage ? (
        <p className="max-w-xs text-right text-xs text-emerald-800" role="status">
          {doneMessage}
        </p>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={handleClose}
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
              <h2 id={titleId} className="text-lg font-bold tracking-tight text-stone-900">
                Recalcular consumo histórico?
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <p id={descId} className="text-sm leading-relaxed text-stone-600">
                Reconcilia lotes dos produtos com receita de{' '}
                <span className="font-medium text-stone-800">{INSUMO_ALVO}</span> pela receita
                atual, gravando os ajustes na data de cada lote (não em hoje). O saldo desse
                insumo pode ficar mais negativo até o ajuste manual de estoque/entradas.
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

              {loadingPreview ? (
                <p className="mt-4 text-sm text-stone-600">Estimando impacto…</p>
              ) : null}

              {preview && !loadingPreview ? (
                <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
                  <p className="font-mono tabular-nums text-stone-800">
                    {formatNumber(preview.lotesTotais)} lotes · {produtos} produtos
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-stone-600">
                    {preview.items.slice(0, 8).map((item) => (
                      <li key={item.produtoId}>
                        {item.produtoNome}{' '}
                        <span className="font-mono tabular-nums text-stone-500">
                          ({item.lotesAfetados})
                        </span>
                      </li>
                    ))}
                    {preview.items.length > 8 ? (
                      <li className="text-stone-500">+{preview.items.length - 8} produtos</li>
                    ) : null}
                  </ul>
                  {preview.avisos.length > 0 ? (
                    <p className="mt-2 text-xs text-amber-800">{preview.avisos[0]}</p>
                  ) : null}
                </div>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-stone-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="secondary" disabled={busy} onClick={handleClose}>
                Pular
              </Button>
              <Button
                type="button"
                disabled={!canApply}
                icon={applying ? 'sync' : 'check'}
                onClick={() => void handleApply()}
              >
                {applying ? 'Aplicando…' : 'Recalcular'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

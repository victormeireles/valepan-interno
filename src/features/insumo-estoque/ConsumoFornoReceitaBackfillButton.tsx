'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  aplicarBackfillFornoPorInsumo,
  previewBackfillFornoPorInsumo,
  resolverInsumoIdPorNome,
} from '@/app/actions/insumo-consumo-produtividade-backfill-actions';
import type { ConsumoProdutividadeBackfillPreview } from '@/lib/services/insumo-consumo-produtividade-backfill-service';
import { Button } from '@/components/ui/Button';

const INSUMOS_ALVO = ['Fubá', 'Gema de Ovo Pasteurizada (top alto)'] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3,
  }).format(value);
}

type PreviewPorInsumo = {
  nome: string;
  insumoId: string;
  produtos: number;
  preview: ConsumoProdutividadeBackfillPreview;
};

export default function ConsumoFornoReceitaBackfillButton() {
  const router = useRouter();
  const titleId = useId();
  const descId = useId();
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<PreviewPorInsumo[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const busy = loadingPreview || applying;
  const lotesTotais = previews.reduce((acc, item) => acc + item.preview.lotesTotais, 0);

  const handleOpen = async () => {
    setOpen(true);
    setDoneMessage(null);
    setError(null);
    setPreviews([]);
    setLoadingPreview(true);

    const loaded: PreviewPorInsumo[] = [];
    for (const nome of INSUMOS_ALVO) {
      const resolved = await resolverInsumoIdPorNome(nome);
      if (!resolved.success) {
        setLoadingPreview(false);
        setError(resolved.error);
        return;
      }
      const result = await previewBackfillFornoPorInsumo({
        insumoId: resolved.insumoId,
        desde: null,
      });
      if (!result.success) {
        setLoadingPreview(false);
        setError(result.error);
        return;
      }
      loaded.push({
        nome,
        insumoId: resolved.insumoId,
        produtos: result.produtos,
        preview: result.preview,
      });
    }

    setPreviews(loaded);
    setLoadingPreview(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    let lotes = 0;
    let movimentos = 0;

    for (const item of previews) {
      const result = await aplicarBackfillFornoPorInsumo({
        insumoId: item.insumoId,
        desde: null,
      });
      if (!result.success) {
        setApplying(false);
        setError(result.error);
        return;
      }
      lotes += result.result.lotesProcessados;
      movimentos += result.result.movimentosInseridos;
    }

    setApplying(false);
    setDoneMessage(
      `Forno recalculado: ${lotes} lote(s), ${movimentos} ajuste(s) (Fubá + Gema).`,
    );
    setOpen(false);
    router.refresh();
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
  };

  const canApply = Boolean(previews.length > 0 && lotesTotais > 0 && !busy);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <Button
        type="button"
        variant="secondary"
        icon="history"
        className="h-11"
        onClick={() => void handleOpen()}
      >
        Recalcular forno (Fubá/Gema)
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
                Recalcular consumo de forno?
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <p id={descId} className="text-sm leading-relaxed text-stone-600">
                Reconcilia lotes de forno dos produtos com receita de Fubá (confeito) e Gema de
                ovo pasteurizada (brilho), na data de cada lote.
              </p>

              {loadingPreview ? (
                <p className="mt-4 text-sm text-stone-600">Estimando impacto…</p>
              ) : null}

              {previews.length > 0 && !loadingPreview ? (
                <div className="mt-4 space-y-3">
                  <p className="font-mono tabular-nums text-sm text-stone-800">
                    {formatNumber(lotesTotais)} lotes no total
                  </p>
                  {previews.map((item) => (
                    <div
                      key={item.insumoId}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm"
                    >
                      <p className="font-medium text-stone-800">{item.nome}</p>
                      <p className="mt-1 font-mono tabular-nums text-stone-600">
                        {item.produtos} produtos · {formatNumber(item.preview.lotesTotais)} lotes
                      </p>
                    </div>
                  ))}
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

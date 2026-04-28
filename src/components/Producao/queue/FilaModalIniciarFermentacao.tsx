'use client';

import { useEffect, useState } from 'react';
import NumberDecimalInput from '@/components/Producao/NumberDecimalInput';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';
import {
  fermentacaoIniciarEFinalizar,
  FERMENTACAO_ASSADEIRAS_MAX,
} from '@/lib/production/fermentacao-iniciar-e-finalizar';

const ASSADEIRAS_PADRAO = 20;

interface Props {
  open: boolean;
  item: ProductionQueueItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FilaModalIniciarFermentacao({ open, item, onClose, onSuccess }: Props) {
  const [numeroCarrinho, setNumeroCarrinho] = useState('');
  const [assadeiras, setAssadeiras] = useState(ASSADEIRAS_PADRAO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset ao abrir ou ao mudar de ordem (identificada por id, não pela referência do objeto).
  useEffect(() => {
    if (open && item) {
      setNumeroCarrinho('');
      setAssadeiras(ASSADEIRAS_PADRAO);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só queremos reagir a item.id
  }, [open, item?.id]);

  if (!open || !item) return null;

  const ua = item.produtos.unidades_assadeira ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fermentacaoIniciarEFinalizar({
        ordemProducaoId: item.id,
        numeroCarrinho,
        assadeirasProduzidas: assadeiras,
        unidadesAssadeira: ua,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setNumeroCarrinho('');
      setAssadeiras(ASSADEIRAS_PADRAO);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ferm-fila-titulo"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[min(90vh,560px)]">
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h2 id="modal-ferm-fila-titulo" className="text-lg font-bold text-slate-900">
              Fermentação
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              <span className="font-medium text-slate-800">{item.produtos.nome}</span>
              <span className="text-slate-400"> · </span>
              <span className="font-mono text-xs text-slate-500">{item.lote_codigo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!loading) onClose();
            }}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Fechar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-800" htmlFor="ferm-fila-carrinho">
              Número do carrinho
            </label>
            <input
              id="ferm-fila-carrinho"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={numeroCarrinho}
              onChange={(e) => setNumeroCarrinho(e.target.value)}
              placeholder="ex.: 12"
              required
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
            />
          </div>

          <NumberDecimalInput
            label="Quantidade de assadeiras produzidas"
            value={assadeiras}
            onChange={(value) => {
              const v = Math.round(value);
              setAssadeiras(Math.min(FERMENTACAO_ASSADEIRAS_MAX, Math.max(1, v)));
            }}
            min={1}
            max={FERMENTACAO_ASSADEIRAS_MAX}
            step={1}
            placeholder={String(ASSADEIRAS_PADRAO)}
            required
            disabled={loading}
          />

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => !loading && onClose()}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !numeroCarrinho.trim()}
              className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  A registar…
                </>
              ) : (
                <>
                  <span className="material-icons text-lg">check_circle</span>
                  Registar fermentação
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

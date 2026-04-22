'use client';

import BandejasStepper, {
  DEFAULT_BANDEJAS_SAIDA,
  MAX_BANDEJAS_SAIDA,
} from '@/components/Producao/BandejasStepper';
import type { ProductionQueueItem } from '@/components/Producao/queue/production-queue-types';

interface Props {
  open: boolean;
  onClose: () => void;
  saidaPosConfirm: 'form' | 'nextChoice';
  saidaLastProdutoNome: string;
  ordensParaSelectSaida: ProductionQueueItem[];
  saidaOrdemId: string;
  onSaidaOrdemIdChange: (id: string) => void;
  saidaCarrinhoField: string;
  onSaidaCarrinhoChange: (v: string) => void;
  saidaBandejasField: string;
  onSaidaBandejasChange: (v: string) => void;
  saidaActionLoading: boolean;
  saidaActionError: string | null;
  onConfirmRegister: () => void;
  onNextChoiceSim: () => void;
  onNextChoiceNao: () => void;
}

export default function FilaModalSaidaForno({
  open,
  onClose,
  saidaPosConfirm,
  saidaLastProdutoNome,
  ordensParaSelectSaida,
  saidaOrdemId,
  onSaidaOrdemIdChange,
  saidaCarrinhoField,
  onSaidaCarrinhoChange,
  saidaBandejasField,
  onSaidaBandejasChange,
  saidaActionLoading,
  saidaActionError,
  onConfirmRegister,
  onNextChoiceSim,
  onNextChoiceNao,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-saida-forno-fila-titulo"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[min(90vh,620px)]">
        <div className="p-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-3">
          <div>
            <h2 id="modal-saida-forno-fila-titulo" className="text-lg font-bold text-slate-900">
              {saidaPosConfirm === 'nextChoice' ? 'Registrar outro carrinho?' : 'Registrar saída do forno'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {saidaPosConfirm === 'nextChoice'
                ? `Você pode lançar outro carrinho do mesmo produto (${saidaLastProdutoNome}) ou voltar à fila.`
                : 'Escolha o produto (ordem/lote), o número do carrinho e quantas bandejas saíram (1 bandeja = 1 LT).'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
            aria-label="Fechar"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        {saidaPosConfirm === 'nextChoice' ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-700">
              Deseja registrar <strong>outro carrinho</strong> de <strong>{saidaLastProdutoNome}</strong>?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onNextChoiceSim}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Sim, outro carrinho
              </button>
              <button
                type="button"
                onClick={onNextChoiceNao}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-800 font-semibold hover:bg-slate-50"
              >
                Não, voltar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 pt-2 space-y-4 overflow-y-auto flex-1">
              {saidaActionError && (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {saidaActionError}
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="saida-produto-ordem">
                  Produto e ordem (lote)
                </label>
                <select
                  id="saida-produto-ordem"
                  value={saidaOrdemId}
                  onChange={(e) => onSaidaOrdemIdChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 bg-white"
                >
                  <option value="">Selecione…</option>
                  {ordensParaSelectSaida.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.produtos.nome} · {item.lote_codigo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="saida-carrinho-fila">
                  Número do carrinho
                </label>
                <input
                  id="saida-carrinho-fila"
                  type="text"
                  autoComplete="off"
                  value={saidaCarrinhoField}
                  onChange={(e) => onSaidaCarrinhoChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  placeholder="ex.: 15"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="saida-bandejas-fila">
                  Bandejas (latas na saída)
                </label>
                <p className="text-xs text-slate-500">
                  Padrão {DEFAULT_BANDEJAS_SAIDA} — use − / + para ajustar de 1 em 1 (máximo{' '}
                  {MAX_BANDEJAS_SAIDA}). Cada bandeja conta como 1 LT na barra de progresso (alinhado à entrada no
                  forno).
                </p>
                <BandejasStepper
                  id="saida-bandejas-fila"
                  value={saidaBandejasField}
                  onChange={onSaidaBandejasChange}
                  disabled={saidaActionLoading}
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
              <button
                type="button"
                disabled={saidaActionLoading}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saidaActionLoading}
                onClick={onConfirmRegister}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {saidaActionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <span className="material-icons text-lg">check</span>
                    OK
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

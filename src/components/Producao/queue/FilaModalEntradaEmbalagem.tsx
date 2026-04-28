'use client';

import BandejasStepper from '@/components/Producao/BandejasStepper';
import type { CarrinhoSaidaFornoParaEmbalagemVM } from '@/app/actions/producao-etapas-actions';

export type CarrinhoEmbalagemFilaRow = CarrinhoSaidaFornoParaEmbalagemVM & {
  ordem_producao_id: string;
  lote_codigo: string;
  produto_nome: string;
};

type EsperaTone = 'normal' | 'atencao' | 'critico';

function getEsperaTone(saidaFimIso: string): EsperaTone {
  const saidaMs = Date.parse(saidaFimIso);
  if (!Number.isFinite(saidaMs)) return 'normal';
  const minutos = (Date.now() - saidaMs) / 60000;
  if (minutos >= 60) return 'critico';
  if (minutos >= 30) return 'atencao';
  return 'normal';
}

function getEsperaLabel(tone: EsperaTone): string | null {
  if (tone === 'critico') return 'Aguardando há bastante tempo';
  if (tone === 'atencao') return 'Aguardando há mais tempo';
  return null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  loadingLista: boolean;
  busca: string;
  onBuscaChange: (v: string) => void;
  carrinhos: CarrinhoEmbalagemFilaRow[];
  carrinhosFiltrados: CarrinhoEmbalagemFilaRow[];
  selecionado: CarrinhoEmbalagemFilaRow | null;
  onSelect: (row: CarrinhoEmbalagemFilaRow) => void;
  latasField: string;
  onLatasChange: (v: string) => void;
  saving: boolean;
  actionError: string | null;
  onConfirm: () => void;
}

export default function FilaModalEntradaEmbalagem({
  open,
  onClose,
  loadingLista,
  busca,
  onBuscaChange,
  carrinhos,
  carrinhosFiltrados,
  selecionado,
  onSelect,
  latasField,
  onLatasChange,
  saving,
  actionError,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-embalagem-entrada-titulo"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[min(90vh,680px)]">
        <div className="p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="modal-embalagem-entrada-titulo" className="text-lg font-bold text-slate-900">
                Entrada na embalagem
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label="Fechar"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          <div className="mt-4 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
              search
            </span>
            <input
              type="search"
              value={busca}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Carrinho, lote ou produto…"
              autoComplete="off"
              disabled={saving}
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
            />
          </div>
          {actionError && (
            <p className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[120px]">
          {loadingLista ? (
            <div className="flex justify-center py-12">
              <span className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : carrinhos.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhum carrinho disponível na fila. Registre a saída do forno para os lotes desta fila.
            </p>
          ) : carrinhosFiltrados.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhum carrinho corresponde à busca.</p>
          ) : (
            <ul className="space-y-2">
              {carrinhosFiltrados.map((row) => {
                const sel = selecionado?.saida_forno_log_id === row.saida_forno_log_id;
                const esperaTone = getEsperaTone(row.saida_fim);
                const esperaLabel = getEsperaLabel(esperaTone);
                return (
                  <li key={`${row.ordem_producao_id}-${row.saida_forno_log_id}`}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onSelect(row)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
                        sel
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : esperaTone === 'critico'
                            ? 'border-rose-300 bg-rose-50 hover:border-rose-400'
                            : esperaTone === 'atencao'
                              ? 'border-amber-300 bg-amber-50 hover:border-amber-400'
                              : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-base">Carrinho {row.numero_carrinho}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {row.produto_nome} · <span className="font-mono">{row.lote_codigo}</span>
                      </p>
                      {esperaLabel && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            esperaTone === 'critico' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          {esperaLabel}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selecionado && (
          <div className="border-t border-slate-100 p-5 space-y-3 bg-slate-50/90 shrink-0">
            <p className="text-sm text-slate-700">
              Carrinho <strong>{selecionado.numero_carrinho}</strong> — quantas latas entram na embalagem?
            </p>
            <BandejasStepper
              id="latas-fila-embalagem"
              value={latasField}
              onChange={onLatasChange}
              disabled={saving}
              maxBandejas={selecionado.latas_disponiveis}
            />
          </div>
        )}

        <div className="p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || !selecionado}
            onClick={() => void onConfirm()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registrando…
              </>
            ) : (
              'Registrar entrada'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

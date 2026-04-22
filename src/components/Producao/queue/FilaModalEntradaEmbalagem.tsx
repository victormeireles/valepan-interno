'use client';

import BandejasStepper, { MAX_BANDEJAS_SAIDA } from '@/components/Producao/BandejasStepper';
import type { CarrinhoSaidaFornoParaEmbalagemVM } from '@/app/actions/producao-etapas-actions';

export type CarrinhoEmbalagemFilaRow = CarrinhoSaidaFornoParaEmbalagemVM & {
  ordem_producao_id: string;
  lote_codigo: string;
  produto_nome: string;
};

function fmtDataHora(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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

  const maxParaSelecionado = selecionado
    ? Math.min(MAX_BANDEJAS_SAIDA, Math.max(1, selecionado.latas_disponiveis))
    : MAX_BANDEJAS_SAIDA;

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
              <p className="text-sm text-slate-600 mt-1">
                Busque pelo carrinho, lote ou produto. Os carrinhos vêm da <strong>saída do forno</strong> com latas
                ainda disponíveis.
              </p>
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
                return (
                  <li key={`${row.ordem_producao_id}-${row.saida_forno_log_id}`}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onSelect(row)}
                      className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
                        sel
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <p className="font-bold text-slate-900 text-base">Carrinho {row.numero_carrinho}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {row.produto_nome} · <span className="font-mono">{row.lote_codigo}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Saída: {row.latas_saida} LT · Disponível:{' '}
                        <strong className="text-slate-800">{row.latas_disponiveis}</strong> LT ·{' '}
                        <span className="text-slate-500">{fmtDataHora(row.saida_fim)}</span>
                      </p>
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
            <p className="text-xs text-slate-500">
              Máximo {maxParaSelecionado} neste lançamento (até {MAX_BANDEJAS_SAIDA} por regra ou o saldo do carrinho).
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

'use client';

import type { CarrinhoFilaForno } from '@/components/Producao/queue/production-queue-types';
import { useState } from 'react';

const MAX_LATAS_POR_CARRINHO = 20;

function parseStepperLatas(raw: string, fallback: number): number {
  const p = Math.round(Number(String(raw).replace(',', '.')));
  if (!Number.isFinite(p) || p < 1) return Math.max(1, Math.round(fallback));
  return Math.min(MAX_LATAS_POR_CARRINHO, p);
}

interface Props {
  open: boolean;
  onClose: () => void;
  buscaFornoCarrinho: string;
  onBuscaChange: (v: string) => void;
  carrinhosParaModalForno: CarrinhoFilaForno[];
  carrinhosFiltradosModalForno: CarrinhoFilaForno[];
  carrinhoFornoSelecionado: CarrinhoFilaForno | null;
  onSelectCarrinho: (c: CarrinhoFilaForno) => void;
  latasFornoField: string;
  onLatasChange: (v: string) => void;
  fornoActionLoading: boolean;
  fornoActionError: string | null;
  onConfirm: () => void;
  onMarcarPerdaTotal: () => void;
}

export default function FilaModalEntradaForno({
  open,
  onClose,
  buscaFornoCarrinho,
  onBuscaChange,
  carrinhosParaModalForno,
  carrinhosFiltradosModalForno,
  carrinhoFornoSelecionado,
  onSelectCarrinho,
  latasFornoField,
  onLatasChange,
  fornoActionLoading,
  fornoActionError,
  onConfirm,
  onMarcarPerdaTotal,
}: Props) {
  const [showPerdaOptions, setShowPerdaOptions] = useState(false);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-forno-carrinhos-titulo"
    >
      <div className="flex h-[92dvh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white shadow-xl max-h-[92dvh] sm:h-auto sm:max-h-[min(92vh,820px)] sm:max-w-3xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="modal-forno-carrinhos-titulo" className="text-lg font-bold text-slate-900">
                Entrada no forno
              </h2>
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
          <div className="mt-3 relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">
              search
            </span>
            <input
              type="search"
              value={buscaFornoCarrinho}
              onChange={(e) => onBuscaChange(e.target.value)}
              placeholder="Número do carrinho…"
              autoComplete="off"
              className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 text-slate-900"
            />
          </div>
          {fornoActionError && (
            <p className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              {fornoActionError}
            </p>
          )}
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-3 py-2 sm:px-4">
          <p className="mb-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Selecione o carrinho
          </p>
          {carrinhosParaModalForno.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum carrinho disponível.</p>
          ) : carrinhosFiltradosModalForno.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nenhum carrinho corresponde à busca.</p>
          ) : (
            <ul className="space-y-1">
              {carrinhosFiltradosModalForno.map((c) => {
                const sel = carrinhoFornoSelecionado?.log_id === c.log_id;
                return (
                  <li key={c.log_id}>
                    <button
                      type="button"
                      disabled={fornoActionLoading || !c.pode_colocar_no_forno}
                      title={
                        !c.pode_colocar_no_forno
                          ? 'Finalize a fermentação com latas para liberar este carrinho.'
                          : undefined
                      }
                      onClick={() => {
                        if (!c.pode_colocar_no_forno) return;
                        onSelectCarrinho(c);
                      }}
                      className={`flex w-full min-h-[44px] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                        sel
                          ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      } disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          Carrinho {c.carrinho}
                        </span>
                        <span className="block truncate text-[11px] leading-tight text-slate-500 sm:text-xs">
                          {c.produto_nome}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {carrinhoFornoSelecionado && (
          <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/90 shrink-0">
            <p className="text-sm text-slate-700">
              Carrinho <strong>{carrinhoFornoSelecionado.carrinho}</strong> — quantas latas entram no forno?
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="latas-fila-forno">
                Latas
              </label>
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <button
                  type="button"
                  disabled={fornoActionLoading}
                  onClick={() => {
                    const base = parseStepperLatas(
                      latasFornoField,
                      carrinhoFornoSelecionado.latas_registradas > 0 ? carrinhoFornoSelecionado.latas_registradas : 1,
                    );
                    onLatasChange(String(Math.max(1, base - 1)));
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Diminuir uma lata"
                >
                  <span className="material-icons text-2xl">remove</span>
                </button>
                <input
                  id="latas-fila-forno"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={latasFornoField}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d,.]/g, '');
                    if (!raw) {
                      onLatasChange('');
                      return;
                    }
                    const parsed = Math.round(Number(raw.replace(',', '.')));
                    if (!Number.isFinite(parsed)) {
                      onLatasChange(raw);
                      return;
                    }
                    onLatasChange(String(Math.min(MAX_LATAS_POR_CARRINHO, Math.max(1, parsed))));
                  }}
                  className="w-20 sm:w-24 shrink-0 rounded-xl border-2 border-slate-200 px-2 py-2.5 text-center text-lg font-semibold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 bg-white"
                  placeholder="ex.: 12"
                />
                <button
                  type="button"
                  onClick={() => {
                    const base = parseStepperLatas(
                      latasFornoField,
                      carrinhoFornoSelecionado.latas_registradas > 0 ? carrinhoFornoSelecionado.latas_registradas : 1,
                    );
                      onLatasChange(String(Math.min(MAX_LATAS_POR_CARRINHO, base + 1)));
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Aumentar uma lata"
                    disabled={
                      fornoActionLoading ||
                      parseStepperLatas(
                        latasFornoField,
                        carrinhoFornoSelecionado.latas_registradas > 0 ? carrinhoFornoSelecionado.latas_registradas : 1,
                      ) >= MAX_LATAS_POR_CARRINHO
                    }
                >
                  <span className="material-icons text-2xl">add</span>
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={fornoActionLoading}
                onClick={onConfirm}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {fornoActionLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registrando…
                  </>
                ) : (
                  <>
                    <span className="material-icons text-lg">local_fire_department</span>
                    Confirmar entrada no forno
                  </>
                )}
              </button>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPerdaOptions((v) => !v)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                {showPerdaOptions ? 'Ocultar opções avançadas' : 'Opções avançadas'}
              </button>
              {showPerdaOptions && (
                <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 p-2">
                  <button
                    type="button"
                    disabled={fornoActionLoading}
                    onClick={onMarcarPerdaTotal}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-800 disabled:opacity-60"
                  >
                    Marcar perda total deste carrinho
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

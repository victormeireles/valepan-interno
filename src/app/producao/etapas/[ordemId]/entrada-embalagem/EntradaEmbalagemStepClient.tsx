'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSaidaFornoCarrinhosParaEmbalagem,
  registerEntradaEmbalagemCarrinhoELatas,
  type CarrinhoSaidaFornoParaEmbalagemVM,
} from '@/app/actions/producao-etapas-actions';
import BandejasStepper, {
  DEFAULT_BANDEJAS_SAIDA,
  MAX_BANDEJAS_SAIDA,
} from '@/components/Producao/BandejasStepper';
import {
  CARD_FORM_BLOCK,
  FORM_FIELD_LABEL,
  FORM_SECTION_TITLE,
  INPUT_COMPACT_LINE,
} from '@/components/Producao/production-step-form-classes';

type Props = {
  ordemProducaoId: string;
  produtoNome: string;
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

export default function EntradaEmbalagemStepClient({ ordemProducaoId, produtoNome }: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lista, setLista] = useState<CarrinhoSaidaFornoParaEmbalagemVM[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [listaError, setListaError] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [selected, setSelected] = useState<CarrinhoSaidaFornoParaEmbalagemVM | null>(null);
  const [latas, setLatas] = useState(String(DEFAULT_BANDEJAS_SAIDA));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<'idle' | 'postSave'>('idle');

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    setLoadingLista(true);
    setListaError(null);
    void getSaidaFornoCarrinhosParaEmbalagem(ordemProducaoId).then((r) => {
      if (cancelled) return;
      setLoadingLista(false);
      if (!r.success) {
        setLista([]);
        setListaError(r.error || 'Não foi possível carregar os carrinhos.');
        return;
      }
      setLista(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, ordemProducaoId]);

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((row) => row.numero_carrinho.toLowerCase().includes(q));
  }, [lista, busca]);

  const maxParaSelecionado = selected
    ? Math.min(MAX_BANDEJAS_SAIDA, Math.max(1, selected.latas_disponiveis))
    : MAX_BANDEJAS_SAIDA;

  const selecionarLinha = (row: CarrinhoSaidaFornoParaEmbalagemVM) => {
    setSelected(row);
    const cap = Math.min(MAX_BANDEJAS_SAIDA, row.latas_disponiveis);
    const sugerido = Math.min(DEFAULT_BANDEJAS_SAIDA, cap);
    setLatas(String(Math.max(1, sugerido)));
    setError(null);
  };

  const fecharPicker = () => {
    setPickerOpen(false);
    setBusca('');
    setSelected(null);
    setLatas(String(DEFAULT_BANDEJAS_SAIDA));
    setError(null);
    setListaError(null);
  };

  const handleRegistrarNoPicker = async () => {
    if (!selected) {
      setError('Selecione um carrinho na lista.');
      return;
    }
    const latasNum = Math.round(Number(String(latas).replace(',', '.')));
    if (!Number.isFinite(latasNum) || latasNum < 1) {
      setError('Informe um número inteiro de latas (mínimo 1).');
      return;
    }
    const cap = Math.min(MAX_BANDEJAS_SAIDA, selected.latas_disponiveis);
    if (latasNum > cap) {
      setError(`No máximo ${cap} lata(s) para este carrinho neste lançamento.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await registerEntradaEmbalagemCarrinhoELatas({
        ordem_producao_id: ordemProducaoId,
        saida_forno_log_id: selected.saida_forno_log_id,
        latas: latasNum,
      });
      if (!res.success) {
        throw new Error(res.error || 'Falha ao registrar entrada.');
      }
      fecharPicker();
      setModalStep('postSave');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar entrada.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdicionarMais = () => {
    setModalStep('idle');
    setPickerOpen(true);
    router.refresh();
  };

  const handleRetornar = () => {
    setModalStep('idle');
    router.back();
  };

  return (
    <>
      <div className={`${CARD_FORM_BLOCK} mt-2 border-slate-200`}>
        <p className={FORM_SECTION_TITLE}>Entrada na embalagem</p>
        <p className="text-xs text-slate-500 sm:text-sm">
          {produtoNome}
          <span className="sr-only">
            Novo abre carrinhos da saída do forno; informe latas. Saldo do carrinho atualiza após registrar.
          </span>
        </p>

        <div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPickerOpen(true);
            }}
            disabled={saving || modalStep === 'postSave'}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
          >
            <span className="material-icons text-lg sm:text-xl">add_circle_outline</span>
            Novo
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-entrada-embalagem-picker-titulo"
        >
          <div className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 p-3">
              <div>
                <h2 id="modal-entrada-embalagem-picker-titulo" className="text-base font-bold text-slate-900 sm:text-lg">
                  Carrinhos (forno)
                </h2>
                <p className="sr-only">Apenas carrinhos com latas disponíveis para embalagem.</p>
              </div>
              <button
                type="button"
                onClick={() => !saving && fecharPicker()}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar"
              >
                <span className="material-icons text-xl">close</span>
              </button>
            </div>

            <div className="shrink-0 px-3 pt-2">
              <label className={FORM_FIELD_LABEL} htmlFor="entrada-embalagem-busca">
                Buscar
              </label>
              <input
                id="entrada-embalagem-busca"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Carrinho…"
                className={INPUT_COMPACT_LINE}
              />
            </div>

            <div className="min-h-[140px] flex-1 overflow-y-auto px-3 py-2">
              {loadingLista ? (
                <div className="flex justify-center py-8">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
                </div>
              ) : listaError ? (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 sm:text-sm">
                  {listaError}
                </p>
              ) : filtrada.length === 0 ? (
                <p className="py-1 text-xs text-slate-600 sm:text-sm">
                  Nenhum carrinho.
                  <span className="sr-only"> Registre saída do forno para este lote.</span>
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {filtrada.map((row) => {
                    const ativo = selected?.saida_forno_log_id === row.saida_forno_log_id;
                    return (
                      <li key={row.saida_forno_log_id}>
                        <button
                          type="button"
                          onClick={() => selecionarLinha(row)}
                          className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                            ativo
                              ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 sm:text-sm">
                              Carrinho {row.numero_carrinho}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums sm:text-xs">
                              {fmtDataHora(row.saida_fim)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-600 sm:text-xs">
                            Saída {row.latas_saida} LT · disp. <strong>{row.latas_disponiveis}</strong>
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected && (
              <div className="shrink-0 space-y-1 border-t border-slate-100 bg-slate-50/80 px-3 pb-2 pt-2">
                <p className="text-xs font-semibold text-slate-800 sm:text-sm">Latas (embalagem)</p>
                <p className="text-[11px] text-slate-500 sm:text-xs" aria-hidden="true">
                  Máx. {maxParaSelecionado} (regra {MAX_BANDEJAS_SAIDA} ou saldo)
                </p>
                <BandejasStepper
                  id="entrada-embalagem-latas-picker"
                  value={latas}
                  onChange={setLatas}
                  disabled={saving}
                  maxBandejas={selected.latas_disponiveis}
                />
              </div>
            )}

            <div className="flex shrink-0 flex-col-reverse gap-1.5 border-t border-slate-100 p-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => fecharPicker()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || !selected}
                onClick={() => void handleRegistrarNoPicker()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
              >
                {saving ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    …
                  </>
                ) : (
                  'Registrar'
                )}
              </button>
            </div>

            {error && (
              <div className="px-3 pb-2">
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800 sm:text-sm">
                  {error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {modalStep === 'postSave' && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-entrada-embalagem-pos-titulo"
        >
          <div className="w-full max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 id="modal-entrada-embalagem-pos-titulo" className="text-base font-bold text-slate-900 sm:text-lg">
              Registrado
            </h2>
            <p className="text-xs text-slate-600 sm:text-sm">
              <strong>{produtoNome}</strong> — outro carrinho?
            </p>
            <div className="flex flex-col-reverse gap-1.5 pt-0.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRetornar}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 sm:text-sm"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleAdicionarMais}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 sm:text-sm"
              >
                Outro carrinho
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

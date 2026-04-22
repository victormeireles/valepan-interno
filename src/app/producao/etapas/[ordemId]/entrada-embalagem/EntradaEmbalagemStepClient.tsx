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
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Entrada na embalagem</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Produto <strong>{produtoNome}</strong>. Use <strong>Novo</strong> para escolher um carrinho vindo da{' '}
            <strong>saída do forno</strong> e informar quantas latas entram na embalagem. Ao registrar, o saldo
            daquele carrinho é liberado para novos lançamentos quando ainda houver latas disponíveis.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPickerOpen(true);
            }}
            disabled={saving || modalStep === 'postSave'}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            <span className="material-icons text-xl">add_circle_outline</span>
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
          <div className="w-full max-w-lg max-h-[min(90vh,640px)] rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h2 id="modal-entrada-embalagem-picker-titulo" className="text-lg font-bold text-slate-900">
                  Carrinhos — saída do forno
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Somente carrinhos com latas ainda disponíveis para embalagem.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && fecharPicker()}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                aria-label="Fechar"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="px-4 pt-3 shrink-0">
              <label className="block text-xs font-medium text-slate-600 mb-1">Pesquisar carrinho</label>
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Número do carrinho…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[160px]">
              {loadingLista ? (
                <div className="flex justify-center py-10">
                  <span className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
                </div>
              ) : listaError ? (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  {listaError}
                </p>
              ) : filtrada.length === 0 ? (
                <p className="text-sm text-slate-600 py-2">
                  Nenhum carrinho disponível. Registre primeiro a <strong>saída do forno</strong> para este lote ou
                  aguarde novas saídas.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filtrada.map((row) => {
                    const ativo = selected?.saida_forno_log_id === row.saida_forno_log_id;
                    return (
                      <li key={row.saida_forno_log_id}>
                        <button
                          type="button"
                          onClick={() => selecionarLinha(row)}
                          className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                            ativo
                              ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold text-slate-900">Carrinho {row.numero_carrinho}</span>
                            <span className="text-xs text-slate-500 tabular-nums">{fmtDataHora(row.saida_fim)}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Saída: {row.latas_saida} LT · Disponível:{' '}
                            <strong className="text-slate-800">{row.latas_disponiveis}</strong> LT
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected && (
              <div className="px-4 pb-3 border-t border-slate-100 space-y-2 shrink-0 bg-slate-50/80">
                <p className="text-xs font-semibold text-slate-700 pt-3">Latas que entram na embalagem</p>
                <p className="text-xs text-slate-500">
                  Máximo {maxParaSelecionado} por lançamento (até {MAX_BANDEJAS_SAIDA} por regra ou o saldo do
                  carrinho).
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

            <div className="p-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
              <button
                type="button"
                disabled={saving}
                onClick={() => fecharPicker()}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || !selected}
                onClick={() => void handleRegistrarNoPicker()}
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

            {error && (
              <div className="px-4 pb-3">
                <p className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
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
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
            <h2 id="modal-entrada-embalagem-pos-titulo" className="text-lg font-bold text-slate-900">
              Entrada registrada
            </h2>
            <p className="text-sm text-slate-600">
              Deseja registrar <strong>outro carrinho</strong> para este mesmo pedido (
              <strong>{produtoNome}</strong>
              ) ou retornar?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
              <button
                type="button"
                onClick={handleRetornar}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium hover:bg-slate-50"
              >
                Retornar
              </button>
              <button
                type="button"
                onClick={handleAdicionarMais}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
              >
                Adicionar mais (mesmo pedido)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

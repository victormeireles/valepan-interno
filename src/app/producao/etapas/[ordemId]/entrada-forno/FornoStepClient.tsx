'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  startProductionStep,
  getProductionStepLogs,
  updateInProgressProductionStepLog,
  deleteEntradaFornoProductionStepLog,
} from '@/app/actions/producao-etapas-actions';
import {
  FermentacaoQualityData,
  FornoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import EntradaFornoProgressoBar from '@/components/Producao/EntradaFornoProgressoBar';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { sumQuantidadeFornoConcluida, sumLatasFornoEmAndamento } from '@/lib/utils/forno-volume';
import {
  listCarrinhosDisponiveisForno,
  latasRegistradasNaFermentacao,
  type CarrinhoDisponivelVM,
} from '@/lib/utils/forno-carrinhos-disponiveis';

interface FornoStepClientProps {
  ordemProducao: {
    id: string;
    lote_codigo: string;
    qtd_planejada: number;
    produto: {
      id: string;
      nome: string;
      unidadeNomeResumido: string | null;
      unidades_assadeira?: number | null;
      box_units?: number | null;
      receita_massa?: {
        quantidade_por_produto: number;
      } | null;
    };
  };
  totalLatasEntradaFornoHoje: number;
}

const MAX_LATAS_POR_CARRINHO = 20;

function parseLatasInput(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function parseStepperLatas(raw: string, fallback: number): number {
  const p = Math.round(Number(String(raw).replace(',', '.')));
  if (!Number.isFinite(p) || p < 1) return Math.max(1, Math.round(fallback));
  return Math.min(MAX_LATAS_POR_CARRINHO, p);
}

function latasDoLogAberto(log: ProductionStepLog, uaOk: number | null): number {
  const dq = log.dados_qualidade as FornoQualityData | null;
  const lt = dq?.assadeiras_lt;
  if (lt != null && !Number.isNaN(Number(lt)) && Number(lt) > 0) return Number(lt);
  if (uaOk != null && log.qtd_saida != null && !Number.isNaN(Number(log.qtd_saida))) {
    return Number(log.qtd_saida) / uaOk;
  }
  return 0;
}

function carrinhoLabelDoFermentacaoLog(
  logs: ProductionStepLog[],
  fermentacaoLogId: string | undefined,
): string {
  if (!fermentacaoLogId) return '—';
  const f = logs.find((l) => l.id === fermentacaoLogId && l.etapa === 'fermentacao');
  const dq = f?.dados_qualidade as FermentacaoQualityData | null;
  return dq?.numero_carrinho?.trim() || '—';
}

export default function FornoStepClient({
  ordemProducao,
  totalLatasEntradaFornoHoje,
}: FornoStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ProductionStepLog[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  const [modalEntradaAberta, setModalEntradaAberta] = useState(false);
  const [buscaCarrinho, setBuscaCarrinho] = useState('');
  const [carrinhoSelecionado, setCarrinhoSelecionado] = useState<CarrinhoDisponivelVM | null>(null);
  const [modalLatasField, setModalLatasField] = useState('');

  const [modalEditLog, setModalEditLog] = useState<ProductionStepLog | null>(null);
  const [modalEditLatasField, setModalEditLatasField] = useState('');

  const unidadesAssadeira = ordemProducao.produto.unidades_assadeira ?? null;
  const uaOk = unidadesAssadeira != null && unidadesAssadeira > 0 ? unidadesAssadeira : null;

  const productInfo = useMemo(
    () => ({
      unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
      unidades_assadeira: uaOk,
      box_units: ordemProducao.produto.box_units ?? null,
      receita_massa: ordemProducao.produto.receita_massa ?? null,
    }),
    [ordemProducao.produto, uaOk],
  );

  const carrinhosDisponiveis = useMemo(
    () => listCarrinhosDisponiveisForno(logs, uaOk),
    [logs, uaOk],
  );

  const carrinhosFiltrados = useMemo(() => {
    const q = buscaCarrinho.trim().toLowerCase();
    const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
    const qn = norm(q);
    if (!q) return carrinhosDisponiveis;
    return carrinhosDisponiveis.filter(
      (c) => norm(c.carrinho).includes(qn) || c.carrinho.toLowerCase().includes(q),
    );
  }, [carrinhosDisponiveis, buscaCarrinho]);

  const fornosAbertos = useMemo(
    () =>
      logs
        .filter((l) => l.etapa === 'entrada_forno' && l.fim == null)
        .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [logs],
  );

  const editModalMaxRefFermentacao = useMemo(() => {
    if (!modalEditLog) return 0;
    const fid = (modalEditLog.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id;
    return latasRegistradasNaFermentacao(logs, fid, uaOk);
  }, [modalEditLog, logs, uaOk]);

  const metaForno =
    getQuantityByStation('entrada_forno', ordemProducao.qtd_planejada, productInfo).value || 0;
  const volumeFornoConcluido = sumQuantidadeFornoConcluida(logs, uaOk);
  const latasFornoAberto = sumLatasFornoEmAndamento(logs, uaOk);
  const volumeFornoComAtual = volumeFornoConcluido + latasFornoAberto;

  const sufixoLt =
    unidadesAssadeira && unidadesAssadeira > 0
      ? `LT c/ ${unidadesAssadeira}`
      : 'LT';

  const refreshLogs = useCallback(async () => {
    const logsResult = await getProductionStepLogs(ordemProducao.id);
    if (!logsResult.success || !logsResult.data) {
      setError(logsResult.error || 'Não foi possível carregar os logs.');
      setInitialLoad(false);
      return;
    }
    setLogs(logsResult.data);
    setInitialLoad(false);
  }, [ordemProducao.id]);

  useEffect(() => {
    void refreshLogs();
  }, [refreshLogs]);

  const abrirModalEntrada = () => {
    setModalEntradaAberta(true);
    setBuscaCarrinho('');
    setCarrinhoSelecionado(null);
    setModalLatasField('');
    setError(null);
  };

  const fecharModalEntrada = () => {
    setModalEntradaAberta(false);
    setBuscaCarrinho('');
    setCarrinhoSelecionado(null);
    setModalLatasField('');
  };

  const selecionarCarrinho = (c: CarrinhoDisponivelVM) => {
    if (!c.pode_colocar_no_forno) return;
    setCarrinhoSelecionado(c);
    const capped = c.latas_registradas > 0 ? Math.min(MAX_LATAS_POR_CARRINHO, c.latas_registradas) : 0;
    const def = capped > 0 ? String(capped).replace('.', ',') : '';
    setModalLatasField(def);
    setError(null);
  };

  const abrirModalEditarEntrada = (log: ProductionStepLog) => {
    setModalEntradaAberta(false);
    setModalEditLog(log);
    const l = latasDoLogAberto(log, uaOk);
    setModalEditLatasField(l > 0 ? String(l).replace('.', ',') : '');
    setError(null);
  };

  const fecharModalEditar = () => {
    setModalEditLog(null);
    setModalEditLatasField('');
  };

  const formatInicio = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  const excluirEntradaForno = async (log: ProductionStepLog) => {
    const dq = log.dados_qualidade as FornoQualityData | null;
    const label = carrinhoLabelDoFermentacaoLog(logs, dq?.fermentacao_log_id);
    const ok = window.confirm(
      `Excluir esta entrada no forno?\n\nCarrinho ${label} · ${log.inicio ? formatInicio(log.inicio) : '—'}\n\nEsta ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setError(null);
    setLoading(true);
    try {
      const r = await deleteEntradaFornoProductionStepLog({
        log_id: log.id,
        ordem_producao_id: ordemProducao.id,
      });
      if (!r.success) {
        throw new Error(r.error || 'Erro ao excluir');
      }
      if (modalEditLog?.id === log.id) {
        fecharModalEditar();
      }
      await refreshLogs();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir entrada');
    } finally {
      setLoading(false);
    }
  };

  const salvarEdicaoEntrada = async () => {
    if (!modalEditLog) return;
    const latas = parseLatasInput(modalEditLatasField);
    if (!Number.isFinite(latas) || latas <= 0) {
      setError('Informe um número de latas maior que zero.');
      return;
    }
    if (latas > MAX_LATAS_POR_CARRINHO) {
      setError(`Máximo de ${MAX_LATAS_POR_CARRINHO} latas por carrinho.`);
      return;
    }
    const maxRef = editModalMaxRefFermentacao;
    if (maxRef > 0 && latas > maxRef + 1e-9) {
      setError(
        `No máximo ${maxRef.toLocaleString('pt-BR')} LT (referência na fermentação).`,
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await updateInProgressProductionStepLog({
        log_id: modalEditLog.id,
        dados_qualidade: {
          assadeiras_lt: latas,
        },
      });
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar');
      }
      fecharModalEditar();
      await refreshLogs();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar alteração');
    } finally {
      setLoading(false);
    }
  };

  const confirmarColocarCarrinhoNoForno = async () => {
    if (!carrinhoSelecionado) return;
    const latas = parseLatasInput(modalLatasField);
    if (!Number.isFinite(latas) || latas <= 0) {
      setError('Informe um número de latas maior que zero.');
      return;
    }
    if (latas > MAX_LATAS_POR_CARRINHO) {
      setError(`Máximo de ${MAX_LATAS_POR_CARRINHO} latas por carrinho.`);
      return;
    }
    if (
      carrinhoSelecionado.latas_registradas > 0 &&
      latas > carrinhoSelecionado.latas_registradas + 1e-9
    ) {
      setError(
        `No máximo ${carrinhoSelecionado.latas_registradas.toLocaleString('pt-BR')} LT (registrado na fermentação).`,
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await startProductionStep({
        ordem_producao_id: ordemProducao.id,
        etapa: 'entrada_forno',
        qtd_saida: 0,
        dados_qualidade: {
          fermentacao_log_id: carrinhoSelecionado.log_id,
          assadeiras_lt: latas,
        },
      });
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erro ao registrar entrada no forno');
      }
      fecharModalEntrada();
      await refreshLogs();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar entrada no forno');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <ProductionStepLayout
        etapaNome="Entrada do Forno"
        loteCodigo={ordemProducao.lote_codigo}
        produtoNome={ordemProducao.produto.nome}
      >
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      </ProductionStepLayout>
    );
  }

  return (
    <ProductionStepLayout
      etapaNome="Entrada do Forno"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
    >
      <div className="space-y-5">
        <EntradaFornoProgressoBar
          metaOp={metaForno}
          jaEntraramOp={volumeFornoComAtual}
          totalHoje={totalLatasEntradaFornoHoje}
          unidadesPorAssadeira={uaOk}
          onFireClick={abrirModalEntrada}
          fireDisabled={loading}
        />

        {fornosAbertos.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-slate-900">Entradas em aberto (ajuste)</p>
            <p className="text-xs text-slate-600">
              Corrija a quantidade de latas antes da saída do forno, se necessário. Se houver registro duplicado,
              use <strong className="text-slate-800">Excluir entrada</strong>.
            </p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
              {fornosAbertos.map((log, idx) => {
                const latas = latasDoLogAberto(log, uaOk);
                const dq = log.dados_qualidade as FornoQualityData | null;
                const unidades =
                  uaOk != null && latas > 0 ? latas * uaOk : null;
                const maxRef = latasRegistradasNaFermentacao(logs, dq?.fermentacao_log_id, uaOk);
                return (
                  <li
                    key={log.id}
                    className="bg-white px-3 py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-slate-800">
                        Entrada {idx + 1} · {formatInicio(log.inicio)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Carrinho{' '}
                        <strong>{carrinhoLabelDoFermentacaoLog(logs, dq?.fermentacao_log_id)}</strong>
                      </p>
                      <p className="text-sm text-slate-700">
                        {latas > 0 ? (
                          <>
                            <strong>{latas.toLocaleString('pt-BR')}</strong> {sufixoLt}
                            {unidades != null && (
                              <span className="text-slate-600">
                                {' '}
                                (~{unidades.toLocaleString('pt-BR')} un.)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-amber-800">Latas não registradas nesta entrada</span>
                        )}
                      </p>
                      {maxRef > 0 && (
                        <p className="text-xs text-slate-500">
                          Teto referência (fermentação): {maxRef.toLocaleString('pt-BR')} {sufixoLt}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => abrirModalEditarEntrada(log)}
                        disabled={loading}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Editar latas
                      </button>
                      <button
                        type="button"
                        onClick={() => void excluirEntradaForno(log)}
                        disabled={loading}
                        className="px-3 py-2 rounded-xl border border-rose-200 text-rose-800 text-sm font-semibold hover:bg-rose-50 disabled:opacity-50"
                      >
                        Excluir entrada
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <ProductionErrorAlert error={error} />

      {modalEditLog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-edit-forno-titulo"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 id="modal-edit-forno-titulo" className="text-lg font-bold text-slate-900">
              Editar latas da entrada
            </h2>
            <p className="text-sm text-slate-600">
              Carrinho{' '}
              <strong>
                {carrinhoLabelDoFermentacaoLog(
                  logs,
                  (modalEditLog.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id,
                )}
              </strong>
              . Ajuste a quantidade de latas ({sufixoLt}) desta entrada em aberto.
              {editModalMaxRefFermentacao > 0 && (
                <>
                  {' '}
                  Máximo:{' '}
                  <strong>{editModalMaxRefFermentacao.toLocaleString('pt-BR')}</strong> {sufixoLt}
                  (referência na fermentação).
                </>
              )}
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700" htmlFor="input-edit-latas-forno">
                Latas no forno
              </label>
              <input
                id="input-edit-latas-forno"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={modalEditLatasField}
                onChange={(e) => setModalEditLatasField(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-900 font-medium"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <button
                type="button"
                onClick={fecharModalEditar}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvarEdicaoEntrada()}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEntradaAberta && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-entrada-forno-titulo"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[min(90vh,640px)]">
            <div className="p-5 pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="modal-entrada-forno-titulo" className="text-lg font-bold text-slate-900">
                    Entrada no forno
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Selecione o carrinho cadastrado na fermentação, informe as latas e confirme.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fecharModalEntrada}
                  disabled={loading}
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
                  value={buscaCarrinho}
                  onChange={(e) => {
                    setBuscaCarrinho(e.target.value);
                    setCarrinhoSelecionado(null);
                    setModalLatasField('');
                  }}
                  placeholder="Buscar pelo número do carrinho…"
                  autoComplete="off"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 text-slate-900"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 min-h-[120px]">
              {carrinhosDisponiveis.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Nenhum carrinho disponível. Cadastre carrinhos na fermentação ou todos já tiveram
                  entrada no forno.
                </p>
              ) : carrinhosFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  Nenhum carrinho corresponde à busca.
                </p>
              ) : (
                <ul className="space-y-2">
                  {carrinhosFiltrados.map((c) => {
                    const sel = carrinhoSelecionado?.log_id === c.log_id;
                    return (
                      <li key={c.log_id}>
                        <button
                          type="button"
                          disabled={loading || !c.pode_colocar_no_forno}
                          onClick={() => selecionarCarrinho(c)}
                          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
                            sel
                              ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                              : 'border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white'
                          } disabled:opacity-45 disabled:cursor-not-allowed`}
                        >
                          <p className="font-semibold text-slate-900">Carrinho {c.carrinho}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                            {c.em_fermentacao ? (
                              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 font-medium">
                                Em fermentação
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-200/80 text-slate-800 px-2 py-0.5 font-medium">
                                Fermentação concluída
                              </span>
                            )}
                            {c.latas_registradas > 0 && (
                              <span className="text-slate-600">
                                Ref. fermentação:{' '}
                                <strong>{c.latas_registradas.toLocaleString('pt-BR')}</strong>{' '}
                                {sufixoLt}
                              </span>
                            )}
                          </div>
                          {c.em_fermentacao && c.latas_registradas <= 0 && (
                            <p className="text-xs text-amber-800 mt-1">
                              Finalize a fermentação com as latas para habilitar.
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {carrinhoSelecionado && (
              <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50/90 shrink-0">
                <p className="text-sm text-slate-700">
                  Carrinho <strong>{carrinhoSelecionado.carrinho}</strong> — quantas latas ({sufixoLt})
                  entram no forno?
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="input-latas-forno-modal">
                    Latas
                  </label>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const base = parseStepperLatas(
                          modalLatasField,
                          carrinhoSelecionado.latas_registradas > 0 ? carrinhoSelecionado.latas_registradas : 1,
                        );
                        setModalLatasField(String(Math.max(1, base - 1)));
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Diminuir uma lata"
                    >
                      <span className="material-icons text-2xl">remove</span>
                    </button>
                    <input
                      id="input-latas-forno-modal"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={modalLatasField}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d,.]/g, '');
                        if (!raw) {
                          setModalLatasField('');
                          return;
                        }
                        const parsed = Math.round(Number(raw.replace(',', '.')));
                        if (!Number.isFinite(parsed)) {
                          setModalLatasField(raw);
                          return;
                        }
                        setModalLatasField(String(Math.min(MAX_LATAS_POR_CARRINHO, Math.max(1, parsed))));
                      }}
                      className="w-20 sm:w-24 shrink-0 rounded-xl border-2 border-slate-200 px-2 py-2.5 text-center text-lg font-semibold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white"
                      placeholder="ex.: 15"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const base = parseStepperLatas(
                          modalLatasField,
                          carrinhoSelecionado.latas_registradas > 0 ? carrinhoSelecionado.latas_registradas : 1,
                        );
                        setModalLatasField(String(Math.min(MAX_LATAS_POR_CARRINHO, base + 1)));
                      }}
                      disabled={
                        loading ||
                        parseStepperLatas(
                          modalLatasField,
                          carrinhoSelecionado.latas_registradas > 0 ? carrinhoSelecionado.latas_registradas : 1,
                        ) >= MAX_LATAS_POR_CARRINHO
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Aumentar uma lata"
                    >
                      <span className="material-icons text-2xl">add</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">Máximo por carrinho: 20 latas.</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void confirmarColocarCarrinhoNoForno()}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
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
              </div>
            )}
          </div>
        </div>
      )}

      <div className="pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50"
        >
          Voltar
        </button>
      </div>
    </ProductionStepLayout>
  );
}

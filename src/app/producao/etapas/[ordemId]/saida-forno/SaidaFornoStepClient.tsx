'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getProductionStepLogs, registerSaidaForno } from '@/app/actions/producao-etapas-actions';
import { ProductionStepLog, SaidaFornoQualityData } from '@/domain/types/producao-etapas';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import SaidaFornoProgressHeader from '@/components/Producao/SaidaFornoProgressHeader';
import BandejasStepper, {
  DEFAULT_BANDEJAS_SAIDA,
  MAX_BANDEJAS_SAIDA,
} from '@/components/Producao/BandejasStepper';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { sumLatasFromFornoLogRows } from '@/lib/utils/forno-volume';
import { sumBandejasSaidaFornoConcluida } from '@/lib/utils/saida-forno-volume';

interface SaidaFornoStepClientProps {
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
}

export default function SaidaFornoStepClient({
  ordemProducao,
}: SaidaFornoStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ProductionStepLog[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'nextChoice'>('form');
  const [carrinhoField, setCarrinhoField] = useState('');
  const [bandejasField, setBandejasField] = useState(String(DEFAULT_BANDEJAS_SAIDA));

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

  const fornoRows = useMemo(
    () =>
      logs
        .filter((l) => l.etapa === 'entrada_forno')
        .map((l) => ({ dados_qualidade: l.dados_qualidade, qtd_saida: l.qtd_saida })),
    [logs],
  );

  const entradaLt = sumLatasFromFornoLogRows(fornoRows, uaOk);
  const saidaBandejasLt = sumBandejasSaidaFornoConcluida(logs);
  const metaSaida =
    getQuantityByStation('saida_forno', ordemProducao.qtd_planejada, productInfo).value || 0;

  const registrosSaida = useMemo(
    () =>
      logs
        .filter((l) => l.etapa === 'saida_forno' && l.fim != null)
        .sort((a, b) => new Date(b.fim!).getTime() - new Date(a.fim!).getTime()),
    [logs],
  );

  const sufixoLt =
    unidadesAssadeira && unidadesAssadeira > 0
      ? `LT c/ ${unidadesAssadeira} un. por bandeja`
      : 'LT (bandejas)';

  const abrirModal = () => {
    setModalOpen(true);
    setModalStep('form');
    setCarrinhoField('');
    setBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
    setError(null);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setModalStep('form');
    setCarrinhoField('');
    setBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
  };

  const confirmarRegistro = async () => {
    const carrinho = carrinhoField.trim();
    const bandejas = Math.round(
      Number((bandejasField.trim() || String(DEFAULT_BANDEJAS_SAIDA)).replace(',', '.')),
    );
    if (!carrinho) {
      setError('Informe o número do carrinho.');
      return;
    }
    if (!Number.isFinite(bandejas) || bandejas < 1 || bandejas > MAX_BANDEJAS_SAIDA) {
      setError(`Informe um número inteiro de bandejas/latas entre 1 e ${MAX_BANDEJAS_SAIDA}.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await registerSaidaForno({
        ordem_producao_id: ordemProducao.id,
        numero_carrinho: carrinho,
        bandejas,
      });
      if (!result.success) {
        throw new Error(result.error || 'Erro ao registrar');
      }
      setModalStep('nextChoice');
      setCarrinhoField('');
      setBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
      router.refresh();
      await refreshLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar saída');
    } finally {
      setLoading(false);
    }
  };

  const formatFim = (iso: string) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));

  if (initialLoad) {
    return (
      <ProductionStepLayout
        etapaNome="Saída do Forno"
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
      etapaNome="Saída do Forno"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
    >
      <div className="space-y-4">
        <SaidaFornoProgressHeader
          variant="ordem"
          meta={metaSaida}
          entradaForno={entradaLt}
          saidaForno={saidaBandejasLt}
          unidadesPorAssadeiraHomogenea={uaOk}
          onNovoCarrinho={abrirModal}
          novoCarrinhoDisabled={entradaLt <= 0}
          novoCarrinhoTitle={
            entradaLt <= 0 ? 'Registre primeiro a entrada no forno para esta ordem' : undefined
          }
        />

        {entradaLt <= 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
            Ainda não há latas na entrada do forno para esta ordem. Use a etapa{' '}
            <strong>Entrada do Forno</strong> antes.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Histórico de carrinhos</p>
          {registrosSaida.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma saída registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
              {registrosSaida.map((log) => {
                const dq = log.dados_qualidade as SaidaFornoQualityData | null;
                return (
                  <li key={log.id} className="bg-white px-3 py-3 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        Carrinho <strong>{dq?.numero_carrinho?.trim() || '—'}</strong>
                      </span>
                      <span className="text-xs text-slate-500">{log.fim ? formatFim(log.fim) : ''}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      <strong>{dq?.bandejas != null ? Number(dq.bandejas).toLocaleString('pt-BR') : '—'}</strong>{' '}
                      bandeja(s) ({sufixoLt})
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <ProductionErrorAlert error={error} />

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-saida-forno-titulo"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
            {modalStep === 'nextChoice' ? (
              <>
                <h2 id="modal-saida-forno-titulo" className="text-lg font-bold text-slate-900">
                  Registrar outro carrinho?
                </h2>
                <p className="text-sm text-slate-600">
                  Deseja lançar <strong>outro carrinho</strong> de <strong>{ordemProducao.produto.nome}</strong> nesta
                  ordem ({ordemProducao.lote_codigo})?
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Não, voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep('form');
                      setCarrinhoField('');
                      setBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
                      setError(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    Sim, outro carrinho
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="modal-saida-forno-titulo" className="text-lg font-bold text-slate-900">
                  Registrar saída do forno
                </h2>
                <p className="text-sm text-slate-600">
                  Produto: <strong>{ordemProducao.produto.nome}</strong> · Lote{' '}
                  <span className="font-mono">{ordemProducao.lote_codigo}</span>
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="input-carrinho-saida">
                    Número do carrinho
                  </label>
                  <input
                    id="input-carrinho-saida"
                    type="text"
                    autoComplete="off"
                    value={carrinhoField}
                    onChange={(e) => setCarrinhoField(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-medium"
                    placeholder="ex.: 12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="input-bandejas-saida">
                    Bandejas (latas na saída)
                  </label>
                  <p className="text-xs text-slate-500">
                    Padrão 20 — use − / + para ajustar de 1 em 1 (máximo {MAX_BANDEJAS_SAIDA}).
                  </p>
                  <BandejasStepper
                    id="input-bandejas-saida"
                    value={bandejasField}
                    onChange={setBandejasField}
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmarRegistro()}
                    disabled={loading || entradaLt <= 0}
                    title={entradaLt <= 0 ? 'Sem entrada no forno registrada' : undefined}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registrando…
                      </>
                    ) : (
                      'OK'
                    )}
                  </button>
                </div>
              </>
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

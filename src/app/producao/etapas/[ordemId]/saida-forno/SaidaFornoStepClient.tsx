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
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import {
  FORM_SECTION_TITLE,
  FORM_FIELD_LABEL,
  INPUT_COMPACT_LINE,
  PRODUCTION_STEP_DENSE_SHELL,
} from '@/components/Producao/production-step-form-classes';

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
        backHref={filaUrlForProductionStep('saida_forno')}
        denseHeader
        {...PRODUCTION_STEP_DENSE_SHELL}
      >
        <div className="flex justify-center py-12">
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
      backHref={filaUrlForProductionStep('saida_forno')}
      denseHeader
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <div className="space-y-2">
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
          <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-2.5 text-xs text-amber-950 sm:text-sm">
            Sem entrada no forno nesta ordem.
            <span className="sr-only"> Use a etapa Entrada do Forno antes.</span>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className={FORM_SECTION_TITLE}>Histórico</p>
          {registrosSaida.length === 0 ? (
            <p className="text-xs text-slate-500 sm:text-sm">Nenhuma saída ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden">
              {registrosSaida.map((log) => {
                const dq = log.dados_qualidade as SaidaFornoQualityData | null;
                return (
                  <li key={log.id} className="flex flex-col gap-0.5 bg-white px-2.5 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-800 sm:text-sm">
                        Carrinho <strong>{dq?.numero_carrinho?.trim() || '—'}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500 sm:text-xs">{log.fim ? formatFim(log.fim) : ''}</span>
                    </div>
                    <p className="text-xs text-slate-600 sm:text-sm">
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
          <div className="w-full max-w-md space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            {modalStep === 'nextChoice' ? (
              <>
                <h2 id="modal-saida-forno-titulo" className="text-base font-bold text-slate-900 sm:text-lg">
                  Outro carrinho?
                </h2>
                <p className="text-xs text-slate-600 sm:text-sm">
                  <strong>{ordemProducao.produto.nome}</strong> · {ordemProducao.lote_codigo}
                </p>
                <div className="flex flex-col-reverse gap-1.5 pt-1 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharModal}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalStep('form');
                      setCarrinhoField('');
                      setBandejasField(String(DEFAULT_BANDEJAS_SAIDA));
                      setError(null);
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 sm:text-sm"
                  >
                    Sim
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 id="modal-saida-forno-titulo" className="text-base font-bold text-slate-900 sm:text-lg">
                  Saída do forno
                </h2>
                <div className="space-y-1">
                  <label className={FORM_FIELD_LABEL} htmlFor="input-carrinho-saida">
                    Carrinho
                  </label>
                  <input
                    id="input-carrinho-saida"
                    type="text"
                    autoComplete="off"
                    value={carrinhoField}
                    onChange={(e) => setCarrinhoField(e.target.value)}
                    className={INPUT_COMPACT_LINE}
                    placeholder="ex.: 12"
                  />
                </div>
                <div className="space-y-1">
                  <label className={FORM_FIELD_LABEL} htmlFor="input-bandejas-saida">
                    Bandejas (LT)
                  </label>
                  <BandejasStepper
                    id="input-bandejas-saida"
                    value={bandejasField}
                    onChange={setBandejasField}
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col-reverse gap-1.5 pt-1 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={loading}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmarRegistro()}
                    disabled={loading || entradaLt <= 0}
                    title={entradaLt <= 0 ? 'Sem entrada no forno registrada' : undefined}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
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

    </ProductionStepLayout>
  );
}

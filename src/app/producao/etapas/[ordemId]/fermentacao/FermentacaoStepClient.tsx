'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeProductionStep,
  deleteRegistroEtapaProducao,
  getProductionStepLogs,
  getReceitasProduzidas,
  updateFermentacaoRegistroLog,
} from '@/app/actions/producao-etapas-actions';
import { fermentacaoIniciarEFinalizar } from '@/lib/production/fermentacao-iniciar-e-finalizar';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { sumQuantidadeFermentacaoConcluida } from '@/lib/utils/fermentacao-progresso';
import { formatReceitasBatidasDisplay } from '@/lib/utils/number-utils';
import {
  FermentacaoQualityData,
  FornoQualityData,
  ProductionStepLog,
} from '@/domain/types/producao-etapas';
import FermentacaoProgressoBar from '@/components/Producao/FermentacaoProgressoBar';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import OrdemDestaqueLataObs from '@/components/Producao/OrdemDestaqueLataObs';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { rotuloExibicaoRegistroFila } from '@/lib/production/registro-adiantado-fila';
import ProductionFormActions from '@/components/Producao/ProductionFormActions';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import NumberDecimalInput from '@/components/Producao/NumberDecimalInput';
import {
  FORM_SECTION_SUB,
  FORM_FIELD_LABEL,
  INPUT_COMPACT_LINE,
  PRODUCTION_STEP_DENSE_SHELL,
} from '@/components/Producao/production-step-form-classes';

const ASSADEIRAS_PRODUZIDAS_PADRAO = 20;
const ASSADEIRAS_PRODUZIDAS_MAX = 20;

interface FermentacaoStepClientProps {
  ordemProducao: {
    id: string;
    lote_codigo: string;
    qtd_planejada: number;
    planejadoUnidadesConsumo?: number;
    /** Nome da lata (assadeira) da ordem — destaque no topo da etapa. */
    tipoLataNome?: string | null;
    /** Observação de produção da ordem (ex.: lavar a lata depois) — destaque no topo. */
    observacaoProducao?: string | null;
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

export default function FermentacaoStepClient({ ordemProducao }: FermentacaoStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logEmAndamento, setLogEmAndamento] = useState<ProductionStepLog | null>(null);
  const [assadeirasProduzidas, setAssadeirasProduzidas] = useState<number>(ASSADEIRAS_PRODUZIDAS_PADRAO);
  const [receitasMassa, setReceitasMassa] = useState<number>(0);
  const [receitasOP, setReceitasOP] = useState<number>(0);
  const [numeroCarrinho, setNumeroCarrinho] = useState('');
  const [stepLogs, setStepLogs] = useState<ProductionStepLog[]>([]);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const logsResult = await getProductionStepLogs(ordemProducao.id);
    if (logsResult.success && logsResult.data) {
      const data = logsResult.data;
      setStepLogs(data);
      const fermAberto = data.find((l) => l.fim === null && l.etapa === 'fermentacao');
      if (fermAberto) {
        setLogEmAndamento(fermAberto);
        setAssadeirasProduzidas(ASSADEIRAS_PRODUZIDAS_PADRAO);
        const dq = fermAberto.dados_qualidade;
        if (dq && typeof dq === 'object' && 'numero_carrinho' in dq) {
          const nc = (dq as FermentacaoQualityData).numero_carrinho;
          if (nc != null && String(nc).trim() !== '') {
            setNumeroCarrinho(String(nc).trim());
          } else {
            setNumeroCarrinho('');
          }
        } else {
          setNumeroCarrinho('');
        }
      } else {
        setLogEmAndamento(null);
        setAssadeirasProduzidas(ASSADEIRAS_PRODUZIDAS_PADRAO);
        setNumeroCarrinho('');
      }
    } else {
      setStepLogs([]);
      setLogEmAndamento(null);
      setAssadeirasProduzidas(ASSADEIRAS_PRODUZIDAS_PADRAO);
      setNumeroCarrinho('');
    }

    const receitasResult = await getReceitasProduzidas(ordemProducao.id);
    if (receitasResult.success && receitasResult.data) {
      setReceitasMassa(receitasResult.data.receitasMassa);
    }

    const productInfo = {
      unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
      unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
      box_units: ordemProducao.produto.box_units || null,
      receita_massa: ordemProducao.produto.receita_massa,
    };
    const unConsumo = ordemProducao.planejadoUnidadesConsumo;
    const quantityInfo = getQuantityByStation(
      'massa',
      ordemProducao.qtd_planejada,
      productInfo,
      unConsumo,
    );
    setReceitasOP(quantityInfo.receitas?.value || 0);
  }, [
    ordemProducao.id,
    ordemProducao.qtd_planejada,
    ordemProducao.planejadoUnidadesConsumo,
    ordemProducao.produto,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const calcularQtdSaidaUnidades = () => {
    if (!ordemProducao.produto.unidades_assadeira) return 0;
    return assadeirasProduzidas * ordemProducao.produto.unidades_assadeira;
  };

  const calcularDemandaAssadeiras = () => {
    const quantityInfo = getQuantityByStation(
      'fermentacao',
      ordemProducao.qtd_planejada,
      {
        unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
        unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
        box_units: ordemProducao.produto.box_units || null,
        receita_massa: ordemProducao.produto.receita_massa,
      },
      ordemProducao.planejadoUnidadesConsumo,
    );
    return quantityInfo.value || 0;
  };

  const calcularAssadeirasDeReceitas = () => {
    if (!ordemProducao.produto.receita_massa?.quantidade_por_produto || receitasMassa === 0) return 0;
    if (!ordemProducao.produto.unidades_assadeira) return 0;
    const unidades = receitasMassa * ordemProducao.produto.receita_massa.quantidade_por_produto;
    return unidades / ordemProducao.produto.unidades_assadeira;
  };

  const formatarReceita = (valor: number): string => {
    const parteDecimal = Math.abs(valor % 1);
    if (parteDecimal < 0.001) {
      return Math.round(valor).toLocaleString('pt-BR');
    }
    return formatReceitasBatidasDisplay(valor);
  };

  const fermentacaoLogIdsNoForno = new Set(
    stepLogs
      .filter((l) => l.etapa === 'entrada_forno')
      .map((l) =>
        String((l.dados_qualidade as FornoQualityData | null)?.fermentacao_log_id ?? '').trim(),
      )
      .filter(Boolean),
  );

  const logsFermentacao = stepLogs
    .filter((l) => l.etapa === 'fermentacao')
    .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());

  const fmtRegistroData = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const preencherFormularioDoLog = (log: ProductionStepLog) => {
    const dq = log.dados_qualidade as FermentacaoQualityData | null;
    setNumeroCarrinho(dq?.numero_carrinho != null ? String(dq.numero_carrinho).trim() : '');
    const lt = dq?.assadeiras_lt;
    setAssadeirasProduzidas(
      lt != null && Number.isFinite(Number(lt))
        ? Math.min(ASSADEIRAS_PRODUZIDAS_MAX, Math.max(1, Math.round(Number(lt))))
        : ASSADEIRAS_PRODUZIDAS_PADRAO,
    );
  };

  const iniciarEdicao = (log: ProductionStepLog) => {
    setEditingLogId(log.id);
    preencherFormularioDoLog(log);
    setError(null);
  };

  const cancelarEdicao = () => {
    setEditingLogId(null);
    setError(null);
    if (logEmAndamento) {
      preencherFormularioDoLog(logEmAndamento);
    } else {
      setNumeroCarrinho('');
      setAssadeirasProduzidas(ASSADEIRAS_PRODUZIDAS_PADRAO);
    }
  };

  const handleExcluirRegistro = async (logId: string) => {
    if (!window.confirm('Excluir este carrinho da fermentação? O número ficará disponível novamente.')) {
      return;
    }
    setDeletingLogId(logId);
    setError(null);
    try {
      const r = await deleteRegistroEtapaProducao({
        log_id: logId,
        ordem_producao_id: ordemProducao.id,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      if (editingLogId === logId) {
        setEditingLogId(null);
      }
      await loadData();
      router.refresh();
    } finally {
      setDeletingLogId(null);
    }
  };

  const handleIniciarEFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fermentacaoIniciarEFinalizar({
        ordemProducaoId: ordemProducao.id,
        numeroCarrinho,
        assadeirasProduzidas: assadeirasProduzidas,
        unidadesAssadeira: ordemProducao.produto.unidades_assadeira,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setEditingLogId(null);
      await loadData();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLogId) return;
    setError(null);
    setLoading(true);
    try {
      const r = await updateFermentacaoRegistroLog({
        log_id: editingLogId,
        ordem_producao_id: ordemProducao.id,
        numero_carrinho: numeroCarrinho,
        assadeiras_lt: assadeirasProduzidas,
        unidades_assadeira: ordemProducao.produto.unidades_assadeira,
      });
      if (!r.success) {
        setError(r.error);
        return;
      }
      setEditingLogId(null);
      await loadData();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!logEmAndamento) {
        throw new Error('Log de fermentação não encontrado');
      }

      const carrinhoTrim = numeroCarrinho.trim();
      if (!carrinhoTrim) {
        throw new Error('Informe o número do carrinho.');
      }

      const dadosQualidade: FermentacaoQualityData = {
        observacoes: '',
        carrinho_cadastrado_em:
          logEmAndamento.inicio?.trim() || new Date().toISOString(),
        numero_carrinho: carrinhoTrim,
        assadeiras_lt: assadeirasProduzidas,
      };

      const result = await completeProductionStep({
        log_id: logEmAndamento.id,
        qtd_saida: calcularQtdSaidaUnidades(),
        dados_qualidade: dadosQualidade,
        fotos: [],
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao finalizar fermentação');
      }

      setEditingLogId(null);
      await loadData();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar fermentação');
    } finally {
      setLoading(false);
    }
  };

  const demandaAssadeiras = calcularDemandaAssadeiras();
  const unidadesPorLt =
    ordemProducao.produto.unidades_assadeira != null && ordemProducao.produto.unidades_assadeira > 0
      ? ordemProducao.produto.unidades_assadeira
      : null;
  const unidadeOpLabel = ordemProducao.produto.unidadeNomeResumido?.trim() || 'un';
  const assadeirasDeReceitas = calcularAssadeirasDeReceitas();

  const qtdPorReceita = ordemProducao.produto.receita_massa?.quantidade_por_produto ?? 0;
  const massaQuantidade =
    unidadesPorLt != null && qtdPorReceita > 0
      ? (receitasMassa * qtdPorReceita) / unidadesPorLt
      : qtdPorReceita > 0
        ? receitasMassa * qtdPorReceita
        : 0;
  const fermentacaoQuantidade = sumQuantidadeFermentacaoConcluida(stepLogs, unidadesPorLt);
  const metaQuantidade = demandaAssadeiras;

  const barraProgresso = (
    <FermentacaoProgressoBar
      meta={metaQuantidade}
      massa={massaQuantidade}
      fermentacao={fermentacaoQuantidade}
      unidadeCurta={unidadesPorLt != null ? 'LT' : 'un'}
      unidadesPorAssadeira={unidadesPorLt}
      variant="compact"
    />
  );

  const painelResumo = (
    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/90 p-3 sm:p-4">
      <p className={`${FORM_FIELD_LABEL} text-blue-950`}>Resumo</p>
      {receitasMassa > 0 && receitasOP > 0 && (
        <p className="text-xs tabular-nums text-blue-900 sm:text-sm">
          Massa: <strong>{formatarReceita(receitasMassa)}</strong> / {formatarReceita(receitasOP)} rec.
          {ordemProducao.produto.receita_massa?.quantidade_por_produto && unidadesPorLt != null ? (
            <>
              {' '}
              · ≈{' '}
              <strong>
                {assadeirasDeReceitas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/{unidadesPorLt}
              </strong>
            </>
          ) : null}
        </p>
      )}
      <div>
        <p className={`${FORM_SECTION_SUB} text-blue-800/90`}>Demanda da OP</p>
        {unidadesPorLt != null ? (
          <p className="text-sm font-bold tabular-nums text-blue-900 sm:text-base">
            {demandaAssadeiras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/ {unidadesPorLt}
          </p>
        ) : (
          <p className="text-sm font-bold tabular-nums text-blue-900 sm:text-base">
            {Math.round(demandaAssadeiras).toLocaleString('pt-BR')} {unidadeOpLabel}
          </p>
        )}
      </div>
      <span className="sr-only">
        Demanda usa a quantidade planejada da ordem inteira ({ordemProducao.qtd_planejada.toLocaleString('pt-BR')}{' '}
        {unidadeOpLabel}), não só o último lote de massa.
        {!unidadesPorLt && ' Sem unidades por assadeira no cadastro: valor em unidades.'}
      </span>
    </div>
  );

  const editandoConcluido =
    editingLogId != null && editingLogId !== logEmAndamento?.id;
  const onSubmitForm = editandoConcluido
    ? handleAtualizarRegistro
    : logEmAndamento
      ? handleComplete
      : handleIniciarEFinalizar;

  const formTitulo = editandoConcluido
    ? 'Editar carrinho'
    : logEmAndamento
      ? 'Finalizar lote em andamento'
      : 'Novo carrinho';

  const submitLabel = editandoConcluido
    ? 'Salvar alterações'
    : logEmAndamento
      ? 'Finalizar fermentação'
      : 'Registar fermentação';

  return (
    <ProductionStepLayout
      etapaNome="Fermentação"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
      backHref={filaUrlForProductionStep('fermentacao')}
      denseHeader
      registrosEtapa={{ ordemProducaoId: ordemProducao.id, etapa: 'fermentacao' }}
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <OrdemDestaqueLataObs
        tipoLataNome={ordemProducao.tipoLataNome ?? null}
        observacaoProducao={ordemProducao.observacaoProducao ?? null}
      />

      <div className="space-y-2">
        {barraProgresso}
        {painelResumo}
      </div>

      {logsFermentacao.length > 0 ? (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <h3 className={`${FORM_FIELD_LABEL} text-slate-800`}>Carrinhos registrados</h3>
          <ul className="space-y-2">
            {logsFermentacao.map((log) => {
              const dq = log.dados_qualidade as FermentacaoQualityData | null;
              const carrinho =
                dq?.numero_carrinho != null ? String(dq.numero_carrinho).trim() : '—';
              const lt = dq?.assadeiras_lt;
              const ltN =
                lt != null && Number.isFinite(Number(lt)) ? Math.round(Number(lt)) : undefined;
              const rotulo = rotuloExibicaoRegistroFila('fermentacao', dq, carrinho, { latas: ltN });
              const emAndamento = log.fim == null;
              const noForno = !emAndamento && fermentacaoLogIdsNoForno.has(log.id);
              const editandoEste = editingLogId === log.id;
              return (
                <li
                  key={log.id}
                  className={`rounded-lg border px-2.5 py-2 text-xs ${
                    editandoEste
                      ? 'border-blue-300 bg-blue-50/90'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {rotulo}
                        {!rotulo.includes('LT') && ltN != null ? (
                          <span className="font-medium text-slate-600"> · {ltN} LT</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {fmtRegistroData(log.inicio)}
                        {emAndamento ? ' · Em andamento' : null}
                      </p>
                      {noForno ? (
                        <span className="mt-1 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                          No forno
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {!noForno ? (
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(log)}
                          className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deletingLogId === log.id || noForno}
                        title={
                          noForno
                            ? 'Exclua primeiro a entrada no forno'
                            : undefined
                        }
                        onClick={() => void handleExcluirRegistro(log.id)}
                        className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingLogId === log.id ? '…' : 'Excluir'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <form onSubmit={onSubmitForm} className="space-y-3 pt-1 sm:space-y-3 sm:pt-0">
        <p className={`${FORM_SECTION_SUB} text-slate-600`}>{formTitulo}</p>
        <ProductionErrorAlert error={error} />

        <div className="space-y-1.5">
          <label className={FORM_FIELD_LABEL} htmlFor="numero-carrinho-fermentacao">
            Número do carrinho <span className="text-red-500">*</span>
          </label>
          <input
            id="numero-carrinho-fermentacao"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={numeroCarrinho}
            onChange={(e) => setNumeroCarrinho(e.target.value)}
            placeholder="ex.: 12"
            required
            className={`${INPUT_COMPACT_LINE} max-w-xs`}
          />
        </div>

        <div className="space-y-1.5">
          <NumberDecimalInput
            label="Latas produzidas (LT)"
            value={assadeirasProduzidas}
            onChange={(value) => {
              const v = Math.round(value);
              setAssadeirasProduzidas(Math.min(ASSADEIRAS_PRODUZIDAS_MAX, Math.max(0, v)));
            }}
            min={0}
            max={ASSADEIRAS_PRODUZIDAS_MAX}
            step={1}
            placeholder={String(ASSADEIRAS_PRODUZIDAS_PADRAO)}
            required
            compact
          />
          <span className="sr-only">
            {!logEmAndamento
              ? 'Regista carrinho e assadeiras de uma vez (início e conclusão do lote).'
              : 'Finalize com o número do carrinho e as assadeiras.'}
          </span>
        </div>

        <ProductionFormActions
          onCancel={() => (editingLogId ? cancelarEdicao() : router.back())}
          submitLabel={submitLabel}
          cancelLabel={editingLogId ? 'Cancelar edição' : 'Voltar'}
          loading={loading}
          disabled={assadeirasProduzidas <= 0 || !numeroCarrinho.trim()}
          compact
        />
      </form>
    </ProductionStepLayout>
  );
}

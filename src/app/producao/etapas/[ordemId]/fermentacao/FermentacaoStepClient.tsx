'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { completeProductionStep, getProductionStepLogs, getReceitasProduzidas } from '@/app/actions/producao-etapas-actions';
import { fermentacaoIniciarEFinalizar } from '@/lib/production/fermentacao-iniciar-e-finalizar';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { sumQuantidadeFermentacaoConcluida } from '@/lib/utils/fermentacao-progresso';
import { formatReceitasBatidasDisplay } from '@/lib/utils/number-utils';
import { FermentacaoQualityData, ProductionStepLog } from '@/domain/types/producao-etapas';
import FermentacaoProgressoBar from '@/components/Producao/FermentacaoProgressoBar';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
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

    const quantityInfo = getQuantityByStation('massa', ordemProducao.qtd_planejada, {
      unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
      unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
      box_units: ordemProducao.produto.box_units || null,
      receita_massa: ordemProducao.produto.receita_massa,
    });
    setReceitasOP(quantityInfo.receitas?.value || 0);
  }, [ordemProducao.id, ordemProducao.qtd_planejada, ordemProducao.produto]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const calcularQtdSaidaUnidades = () => {
    if (!ordemProducao.produto.unidades_assadeira) return 0;
    return assadeirasProduzidas * ordemProducao.produto.unidades_assadeira;
  };

  const calcularDemandaAssadeiras = () => {
    const quantityInfo = getQuantityByStation('fermentacao', ordemProducao.qtd_planejada, {
      unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
      unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
      box_units: ordemProducao.produto.box_units || null,
      receita_massa: ordemProducao.produto.receita_massa,
    });
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

  const onSubmitForm = logEmAndamento ? handleComplete : handleIniciarEFinalizar;

  return (
    <ProductionStepLayout
      etapaNome="Fermentação"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
      backHref={filaUrlForProductionStep('fermentacao')}
      denseHeader
      {...PRODUCTION_STEP_DENSE_SHELL}
    >
      <div className="space-y-2">
        {barraProgresso}
        {painelResumo}
      </div>

      <form onSubmit={onSubmitForm} className="space-y-3 pt-1 sm:space-y-3 sm:pt-0">
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
            label="Assadeiras produzidas"
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
          onCancel={() => router.back()}
          submitLabel={logEmAndamento ? 'Finalizar fermentação' : 'Registar fermentação'}
          cancelLabel="Voltar"
          loading={loading}
          disabled={assadeirasProduzidas <= 0 || !numeroCarrinho.trim()}
          compact
        />
      </form>
    </ProductionStepLayout>
  );
}

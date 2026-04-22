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
import ProductionFormActions from '@/components/Producao/ProductionFormActions';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import NumberDecimalInput from '@/components/Producao/NumberDecimalInput';

/** Padrão e teto para assadeiras na finalização da fermentação */
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
      unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
      unidades_assadeira?: number | null;
      box_units?: number | null;
      receita_massa?: {
        quantidade_por_produto: number;
      } | null;
    };
  };
}

export default function FermentacaoStepClient({
  ordemProducao,
}: FermentacaoStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logEmAndamento, setLogEmAndamento] = useState<ProductionStepLog | null>(null);
  const [assadeirasProduzidas, setAssadeirasProduzidas] = useState<number>(
    ASSADEIRAS_PRODUZIDAS_PADRAO,
  );
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

  // Calcular quantidade de saída em unidades (a partir das assadeiras produzidas)
  const calcularQtdSaidaUnidades = () => {
    if (!ordemProducao.produto.unidades_assadeira) return 0;
    return assadeirasProduzidas * ordemProducao.produto.unidades_assadeira;
  };

  // Calcular demanda total de assadeiras da OP
  const calcularDemandaAssadeiras = () => {
    const quantityInfo = getQuantityByStation('fermentacao', ordemProducao.qtd_planejada, {
      unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
      unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
      box_units: ordemProducao.produto.box_units || null,
      receita_massa: ordemProducao.produto.receita_massa,
    });
    return quantityInfo.value || 0;
  };

  // Converter receitas produzidas para assadeiras
  const calcularAssadeirasDeReceitas = () => {
    if (!ordemProducao.produto.receita_massa?.quantidade_por_produto || receitasMassa === 0) return 0;
    if (!ordemProducao.produto.unidades_assadeira) return 0;
    
    // Receitas → Unidades → Assadeiras
    const unidades = receitasMassa * ordemProducao.produto.receita_massa.quantidade_por_produto;
    const assadeiras = unidades / ordemProducao.produto.unidades_assadeira;
    return assadeiras;
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
    ordemProducao.produto.unidades_assadeira != null &&
    ordemProducao.produto.unidades_assadeira > 0
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
    />
  );

  const painelDemandaFermentacao = (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
      {receitasMassa > 0 && receitasOP > 0 && (
        <div className="pb-2 border-b border-blue-200 space-y-1">
          <p className="text-sm font-semibold text-blue-900">A partir da massa (o que já foi batido)</p>
          <p className="text-sm text-blue-800">
            {formatarReceita(receitasMassa)} / {formatarReceita(receitasOP)} receitas
            {ordemProducao.produto.receita_massa?.quantidade_por_produto ? (
              <>
                {' '}
                — aprox.{' '}
                <strong>
                  {unidadesPorLt != null
                    ? `${assadeirasDeReceitas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/ ${unidadesPorLt}`
                    : `${Math.round(receitasMassa * ordemProducao.produto.receita_massa.quantidade_por_produto).toLocaleString('pt-BR')} un`}
                </strong>
              </>
            ) : null}
          </p>
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-blue-900">Demanda total da ordem</p>
        <p className="text-xs text-blue-800/90 leading-relaxed">
          Usa a <strong>quantidade planejada da OP inteira</strong> (
          {ordemProducao.qtd_planejada.toLocaleString('pt-BR')} {unidadeOpLabel}), não o volume do último lote
          de massa. Por isso esse número pode ser muito maior que as receitas que você acabou de bater.
        </p>
        {unidadesPorLt != null ? (
          <p className="text-lg font-bold text-blue-900">
            {demandaAssadeiras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/ {unidadesPorLt}
          </p>
        ) : (
          <>
            <p className="text-lg font-bold text-blue-900">
              {Math.round(demandaAssadeiras).toLocaleString('pt-BR')} un
            </p>
            <p className="text-xs text-blue-800 leading-relaxed">
              Sem &quot;unidades por assadeira&quot; no cadastro do produto, o sistema mostra a demanda em unidades.
              O valor acima são unidades (não são latas).
            </p>
          </>
        )}
      </div>
    </div>
  );

  const onSubmitForm = logEmAndamento ? handleComplete : handleIniciarEFinalizar;

  return (
    <ProductionStepLayout
      etapaNome="Fermentação"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
    >
      <div className="space-y-4">
        {barraProgresso}
        {painelDemandaFermentacao}
      </div>

      <form onSubmit={onSubmitForm} className="space-y-6">
        <ProductionErrorAlert error={error} />

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1" htmlFor="numero-carrinho-fermentacao">
            Número do carrinho *
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
            className="w-full max-w-xs px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
          <p className="text-xs text-gray-500 ml-1">Carrinho onde a massa está fermentando.</p>
        </div>

        <div className="space-y-1.5">
          <NumberDecimalInput
            label="Quantidade de assadeiras produzidas"
            value={assadeirasProduzidas}
            onChange={(value) => {
              const v = Math.round(value);
              setAssadeirasProduzidas(
                Math.min(ASSADEIRAS_PRODUZIDAS_MAX, Math.max(0, v)),
              );
            }}
            min={0}
            max={ASSADEIRAS_PRODUZIDAS_MAX}
            step={1}
            placeholder={String(ASSADEIRAS_PRODUZIDAS_PADRAO)}
            required
          />
          <p className="text-xs text-gray-500 ml-1">
            Padrão {ASSADEIRAS_PRODUZIDAS_PADRAO} assadeiras; máximo {ASSADEIRAS_PRODUZIDAS_MAX}.
            {!logEmAndamento && (
              <span className="block mt-1 text-gray-600">
                Regista de uma vez o carrinho e as assadeiras (início e conclusão do lote).
              </span>
            )}
          </p>
        </div>

        <ProductionFormActions
          onCancel={() => router.back()}
          submitLabel={logEmAndamento ? 'Finalizar fermentação' : 'Registar fermentação'}
          cancelLabel="Voltar"
          loading={loading}
          disabled={assadeirasProduzidas <= 0 || !numeroCarrinho.trim()}
        />
        {!loading && (!numeroCarrinho.trim() || assadeirasProduzidas <= 0) && (
          <p className="text-xs text-gray-500 text-center">
            Preencha o número do carrinho e a quantidade de assadeiras para continuar.
          </p>
        )}
      </form>
    </ProductionStepLayout>
  );
}

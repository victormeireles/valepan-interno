'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  startProductionStep,
  completeProductionStep,
  getProductionStepLogs,
  getInProgressStep,
  getReceitasProduzidas,
} from '@/app/actions/producao-etapas-actions';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { FermentacaoQualityData, ProductionStepLog } from '@/domain/types/producao-etapas';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import ProductionFormActions from '@/components/Producao/ProductionFormActions';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import PhotoUploader from '@/components/PhotoUploader';
import NumberDecimalInput from '@/components/FormControls/NumberDecimalInput';

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
  const [assadeirasProduzidas, setAssadeirasProduzidas] = useState<number>(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [receitasMassa, setReceitasMassa] = useState<number>(0);
  const [receitasOP, setReceitasOP] = useState<number>(0);

  // Carregar logs e verificar se há etapa fermentação em andamento
  useEffect(() => {
    const loadData = async () => {
      const logsResult = await getProductionStepLogs(ordemProducao.id);
      if (logsResult.success && logsResult.data) {
        // Verificar se há log de fermentação em andamento
        const inProgressResult = await getInProgressStep(ordemProducao.id);
        if (inProgressResult.success && inProgressResult.data) {
          const logData: ProductionStepLog = inProgressResult.data;
          setLogEmAndamento(logData);
          // Input sempre inicia vazio (zero)
          setAssadeirasProduzidas(0);
        } else {
          setLogEmAndamento(null);
          setAssadeirasProduzidas(0);
        }
      }

      // Buscar receitas produzidas
      const receitasResult = await getReceitasProduzidas(ordemProducao.id);
      if (receitasResult.success && receitasResult.data) {
        setReceitasMassa(receitasResult.data.receitasMassa);
      }

      // Calcular receitas necessárias da OP
      const quantityInfo = getQuantityByStation('massa', ordemProducao.qtd_planejada, {
        unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
        unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
        box_units: ordemProducao.produto.box_units || null,
        receita_massa: ordemProducao.produto.receita_massa,
      });
      setReceitasOP(quantityInfo.receitas?.value || 0);
    };

    loadData();
  }, [ordemProducao.id, ordemProducao.qtd_planejada, ordemProducao.produto]);

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

  // Formatar número de receitas: se for inteiro, mostrar sem decimais; senão, mostrar com 1 casa decimal
  const formatarReceita = (valor: number): string => {
    // Verificar se a parte decimal é significativa (não é .0)
    const parteDecimal = Math.abs(valor % 1);
    if (parteDecimal < 0.001) {
      // É efetivamente um inteiro, mostrar sem decimais
      return Math.round(valor).toString();
    }
    // Tem parte decimal significativa, mostrar com 1 casa decimal
    return valor.toFixed(1);
  };

  const handleStart = async () => {
    setError(null);
    setLoading(true);

    try {
      // Iniciar etapa de fermentação
      const result = await startProductionStep({
        ordem_producao_id: ordemProducao.id,
        etapa: 'fermentacao',
        qtd_saida: 0, // Será atualizado quando finalizar
        dados_qualidade: {},
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erro ao iniciar fermentação');
      }

      // Recarregar dados após iniciar
      const logsResult = await getProductionStepLogs(ordemProducao.id);
      if (logsResult.success && logsResult.data) {
        const inProgressResult = await getInProgressStep(ordemProducao.id);
        if (inProgressResult.success && inProgressResult.data) {
          setLogEmAndamento(inProgressResult.data);
        } else {
          setLogEmAndamento(result.data);
        }
      } else {
        setLogEmAndamento(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar fermentação');
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

      // Upload de foto (obrigatória)
      if (!photoFile) {
        throw new Error('Foto é obrigatória para finalizar a fermentação');
      }

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('etapa', 'fermentacao');
      formData.append('ordemProducaoId', ordemProducao.id);

      const uploadRes = await fetch('/api/upload/producao-photo', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Erro ao fazer upload da foto');
      }

      const uploadData = await uploadRes.json();
      const photoUrl = uploadData.photoUrl;

      // Preparar dados de qualidade
      const dadosQualidade: FermentacaoQualityData = {
        observacoes: '',
      };

      // Finalizar etapa
      const result = await completeProductionStep({
        log_id: logEmAndamento.id,
        qtd_saida: calcularQtdSaidaUnidades(),
        dados_qualidade: dadosQualidade,
        fotos: [photoUrl],
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao finalizar fermentação');
      }

      router.push('/producao/fila?station=fermentacao');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar fermentação');
    } finally {
      setLoading(false);
    }
  };

  const demandaAssadeiras = calcularDemandaAssadeiras();
  const unidadesAssadeira = ordemProducao.produto.unidades_assadeira || 1;
  const assadeirasDeReceitas = calcularAssadeirasDeReceitas();

  // Se não há log em andamento, mostrar botão para iniciar
  if (!logEmAndamento) {
    return (
      <ProductionStepLayout
        etapaNome="Fermentação"
        loteCodigo={ordemProducao.lote_codigo}
        produtoNome={ordemProducao.produto.nome}
      >
        {/* Informação da demanda total */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
          <div>
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Demanda Total da OP:
            </p>
            <p className="text-lg font-bold text-blue-900">
              {demandaAssadeiras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/ {unidadesAssadeira}
            </p>
          </div>
          {receitasMassa > 0 && receitasOP > 0 && (
            <div className="pt-2 border-t border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Receitas já produzidas:
              </p>
              <p className="text-sm text-blue-800">
                {formatarReceita(receitasMassa)} / {formatarReceita(receitasOP)} - aprox.{' '}
                <strong>{Math.round(assadeirasDeReceitas).toLocaleString('pt-BR')} LT c/ {unidadesAssadeira}</strong>
              </p>
            </div>
          )}
        </div>

        <ProductionErrorAlert error={error} />

        <div className="pt-4">
          <button
            type="button"
            onClick={handleStart}
            className="w-full px-6 py-3.5 text-white bg-gray-900 rounded-xl font-semibold shadow-lg shadow-gray-900/20 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Iniciando...</span>
              </>
            ) : (
              <>
                <span>Iniciar Fermentação</span>
                <span className="material-icons text-sm">play_arrow</span>
              </>
            )}
          </button>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all"
          >
            Voltar
          </button>
        </div>
      </ProductionStepLayout>
    );
  }

  // Se há log em andamento, mostrar formulário para finalizar
  return (
    <ProductionStepLayout
      etapaNome="Fermentação"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
    >
      {/* Informação da demanda total */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">
            Demanda Total da OP:
          </p>
          <p className="text-lg font-bold text-blue-900">
            {demandaAssadeiras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} LT c/ {unidadesAssadeira}
          </p>
        </div>
        {receitasMassa > 0 && receitasOP > 0 && (
          <div className="pt-2 border-t border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Receitas já produzidas:
            </p>
            <p className="text-sm text-blue-800">
              {formatarReceita(receitasMassa)} / {formatarReceita(receitasOP)} - aprox.{' '}
              <strong>{Math.round(assadeirasDeReceitas).toLocaleString('pt-BR')} LT c/ {unidadesAssadeira}</strong>
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleComplete} className="space-y-6">
        <ProductionErrorAlert error={error} />

        {/* Quantidade de Assadeiras Produzidas */}
        <div className="space-y-1.5">
          <NumberDecimalInput
            label="Quantidade de Assadeiras Produzidas"
            value={assadeirasProduzidas}
            onChange={(value) => setAssadeirasProduzidas(Math.round(value))}
            min={0}
            step={1}
            placeholder="0"
            required
          />
        </div>

        {/* Foto Obrigatória */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700 ml-1">
            Foto da Assadeira (Obrigatória) *
          </label>
          <PhotoUploader
            onPhotoSelect={setPhotoFile}
            onPhotoRemove={() => setPhotoFile(null)}
            loading={loading}
          />
          {!photoFile && (
            <p className="text-sm text-amber-600 ml-1 flex items-center gap-1">
              <span className="material-icons text-sm">warning</span>
              Foto é obrigatória para controle de qualidade
            </p>
          )}
        </div>

        <ProductionFormActions
          onCancel={() => router.back()}
          submitLabel="Finalizar Fermentação"
          cancelLabel="Voltar"
          loading={loading}
          disabled={!photoFile || assadeirasProduzidas <= 0}
        />
      </form>
    </ProductionStepLayout>
  );
}

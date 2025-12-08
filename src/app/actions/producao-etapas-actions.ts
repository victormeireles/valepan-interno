'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';
import { ProductionStepRepository } from '@/data/production/ProductionStepRepository';
import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import { ProductionMassaLoteRepository } from '@/data/production/ProductionMassaLoteRepository';
import { ProductionStepLogManager } from '@/domain/production/ProductionStepLogManager';
import { ProductionProgressCalculator } from '@/domain/production/ProductionProgressCalculator';
import {
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
  ProductionStep,
  MassaQualityData,
  FermentacaoQualityData,
  FornoQualityData,
  EmbalagemQualityData,
} from '@/domain/types/producao-etapas';

/**
 * Inicia uma nova etapa de produção
 */
export async function startProductionStep(input: {
  ordem_producao_id: string;
  etapa: ProductionStep;
  usuario_id?: string;
  qtd_saida: number;
  perda_qtd?: number;
  dados_qualidade?: MassaQualityData | FermentacaoQualityData | FornoQualityData | EmbalagemQualityData;
  fotos?: string[];
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const createInput: CreateProductionStepLogInput = {
      ordem_producao_id: input.ordem_producao_id,
      etapa: input.etapa,
      usuario_id: input.usuario_id,
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd || 0,
      dados_qualidade: input.dados_qualidade,
      fotos: input.fotos || [],
    };

    const log = await stepManager.startStep(createInput);

    revalidatePath('/producao/fila');
    revalidatePath(`/producao/etapas/${input.ordem_producao_id}`);

    return { success: true, data: log };
  } catch (error) {
    console.error('Erro ao iniciar etapa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao iniciar etapa de produção',
    };
  }
}

/**
 * Finaliza uma etapa de produção
 */
export async function completeProductionStep(input: {
  log_id: string;
  qtd_saida?: number;
  perda_qtd?: number;
  dados_qualidade?: MassaQualityData | FermentacaoQualityData | FornoQualityData | EmbalagemQualityData;
  fotos?: string[];
}) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const stepManager = new ProductionStepLogManager(stepRepository, orderRepository);

  try {
    const updateInput: UpdateProductionStepLogInput = {
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd,
      dados_qualidade: input.dados_qualidade,
      fotos: input.fotos,
    };

    const log = await stepManager.completeStep(input.log_id, updateInput);

    // Buscar ordem_producao_id para revalidar
    const logData = await stepRepository.findById(input.log_id);
    if (logData) {
      revalidatePath('/producao/fila');
      revalidatePath(`/producao/etapas/${logData.ordem_producao_id}`);
    }

    return { success: true, data: log };
  } catch (error) {
    console.error('Erro ao finalizar etapa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao finalizar etapa de produção',
    };
  }
}

/**
 * Busca logs de uma ordem de produção
 */
export async function getProductionStepLogs(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    return { success: true, data: logs };
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar logs de produção',
    };
  }
}

/**
 * Busca progresso de uma ordem de produção
 */
export async function getProductionProgress(
  ordemProducaoId: string,
  productInfo: {
    unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
    package_units?: number | null;
    box_units?: number | null;
    unidades_assadeira?: number | null;
    receita_massa?: {
      quantidade_por_produto: number;
    } | null;
  },
) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const orderRepository = new ProductionOrderRepository(supabase);
  const massaLoteRepository = new ProductionMassaLoteRepository(supabase);
  const progressCalculator = new ProductionProgressCalculator(
    stepRepository,
    orderRepository,
    massaLoteRepository,
  );

  try {
    const progress = await progressCalculator.calculateProgress(ordemProducaoId, productInfo);
    return { success: true, data: progress };
  } catch (error) {
    console.error('Erro ao calcular progresso:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao calcular progresso',
    };
  }
}

/**
 * Busca etapa em andamento de uma ordem de produção
 */
export async function getInProgressStep(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);
    const inProgress = logs.find((log) => log.fim === null);
    return { success: true, data: inProgress || null };
  } catch (error) {
    console.error('Erro ao buscar etapa em andamento:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar etapa em andamento',
    };
  }
}

/**
 * Busca receitas produzidas de massa e fermentação
 */
export async function getReceitasProduzidas(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const stepRepository = new ProductionStepRepository(supabase);
  const massaLoteRepository = new ProductionMassaLoteRepository(supabase);

  try {
    const logs = await stepRepository.findByOrderId(ordemProducaoId);

    // Buscar receitas de massa (soma dos lotes)
    let receitasMassa = 0;
    const massaLog = logs.find((log) => log.etapa === 'massa');
    if (massaLog) {
      const lotes = await massaLoteRepository.findByEtapasLogId(massaLog.id);
      receitasMassa = lotes.reduce((sum, lote) => sum + lote.receitas_batidas, 0);
    }

    // Buscar receitas de fermentação (converter qtd_saida para receitas)
    let receitasFermentacao = 0;
    const fermentacaoLog = logs.find((log) => log.etapa === 'fermentacao' && log.fim !== null);
    if (fermentacaoLog && fermentacaoLog.qtd_saida) {
      // Buscar ordem para obter quantidade_por_produto
      const orderRepository = new ProductionOrderRepository(supabase);
      const order = await orderRepository.findById(ordemProducaoId);
      if (order) {
        const { data: produtoReceita } = await supabase
          .from('produto_receitas')
          .select('quantidade_por_produto, receitas(tipo)')
          .eq('produto_id', order.produto_id)
          .eq('ativo', true)
          .maybeSingle();

        type ReceitaTipo = { tipo?: string };
        if (produtoReceita && (produtoReceita.receitas as ReceitaTipo | null)?.tipo === 'massa') {
          const quantidadePorProduto = produtoReceita.quantidade_por_produto;
          if (quantidadePorProduto > 0) {
            // Converter unidades para receitas
            receitasFermentacao = fermentacaoLog.qtd_saida / quantidadePorProduto;
          }
        }
      }
    }

    return {
      success: true,
      data: {
        receitasMassa,
        receitasFermentacao,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar receitas produzidas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar receitas produzidas',
      data: {
        receitasMassa: 0,
        receitasFermentacao: 0,
      },
    };
  }
}

/**
 * Busca receitas de massa vinculadas a um produto
 */
export async function getReceitasMassaByProduto(produtoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { data: produtoReceitas, error } = await supabase
      .from('produto_receitas')
      .select(
        `
        receitas (
          id,
          nome,
          codigo,
          tipo
        )
      `,
      )
      .eq('produto_id', produtoId)
      .eq('ativo', true);

    if (error) {
      throw new Error(`Erro ao buscar receitas: ${error.message}`);
    }

    type ProdutoReceitaWithReceita = {
      receitas?: {
        id: string;
        nome: string;
        codigo: string | null;
        tipo: string;
      } | null;
    };
    const receitasMassa = (produtoReceitas || [])
      .filter((pr: ProdutoReceitaWithReceita) => pr.receitas?.tipo === 'massa')
      .map((pr: ProdutoReceitaWithReceita) => pr.receitas)
      .filter(Boolean);

    return { success: true, data: receitasMassa };
  } catch (error) {
    console.error('Erro ao buscar receitas de massa:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar receitas',
    };
  }
}

/**
 * Busca todas as masseiras ativas
 */
export async function getMasseiras() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('masseiras')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      throw new Error(`Erro ao buscar masseiras: ${error.message}`);
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar masseiras:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar masseiras',
    };
  }
}

/**
 * Busca ordem de produção com dados do produto
 */
export async function getProductionOrderWithProduct(ordemProducaoId: string) {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const orderRepository = new ProductionOrderRepository(supabase);

  try {
    const order = await orderRepository.findById(ordemProducaoId);
    if (!order) {
      return { success: false, error: 'Ordem de produção não encontrada' };
    }

    // Buscar dados do produto com join em unidades
    const { data: produto, error: produtoError } = await supabase
      .from('produtos')
      .select('*, unidades (nome_resumido)')
      .eq('id', order.produto_id)
      .single();

    if (produtoError || !produto) {
      return { success: false, error: 'Produto não encontrado' };
    }

    // Extrair nome_resumido do join com unidades
    const unidades = produto.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    // Buscar receita de massa vinculada (usando a mesma lógica da fila de produção)
    const { data: produtoReceitas, error: receitasError } = await supabase
      .from('produto_receitas')
      .select(`
        quantidade_por_produto,
        receitas (
          tipo,
          ativo
        )
      `)
      .eq('produto_id', order.produto_id)
      .eq('ativo', true);

    if (receitasError) {
      console.error('Erro ao buscar receitas vinculadas:', receitasError);
    }

    // Filtrar apenas receitas tipo massa e ativas (mesma lógica da fila)
    let receitaMassa = null;
    if (produtoReceitas && produtoReceitas.length > 0) {
      type ProdutoReceitaItem = {
        receitas?: {
          tipo?: string;
          ativo?: boolean;
        } | null;
      };
      // @ts-expect-error - Supabase typing limitations
      const receitaMassaData = produtoReceitas.find((pr: ProdutoReceitaItem) => {
        const receita = pr.receitas;
        return receita?.tipo === 'massa' && receita?.ativo !== false;
      });
      
      if (receitaMassaData) {
        receitaMassa = {
          quantidade_por_produto: receitaMassaData.quantidade_por_produto,
        };
      }
    }
    
    console.log('[getProductionOrderWithProduct] receitaMassa encontrada:', receitaMassa);

    return {
      success: true,
      data: {
        ...order,
        produto: {
          ...produto,
          unidadeNomeResumido,
          receita_massa: receitaMassa,
        },
      },
    };
  } catch (error) {
    console.error('Erro ao buscar ordem de produção:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar ordem de produção',
    };
  }
}

'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

interface CreateProductionOrderParams {
  produtoId: string;
  qtdPlanejada: number;
  pedidoId?: string;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
  dataProducao?: string;
}

interface UpdateProductionOrderParams {
  ordemId: string;
  produtoId: string;
  qtdPlanejada: number;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
  dataProducao?: string;
}

export async function createProductionOrder(params: CreateProductionOrderParams) {
  // Usando Service Role para garantir acesso total às tabelas no server-side
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    // 1. Gerar código do lote (OP-YYYYMMDD-Sequence)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    
    // Busca última OP do dia para incrementar sequencial
    const { data: lastOp } = await supabase
      .from('ordens_producao')
      .select('lote_codigo')
      .ilike('lote_codigo', `OP-${dateStr}-%`)
      .order('lote_codigo', { ascending: false })
      .limit(1)
      .single();

    let sequence = 1;
    if (lastOp?.lote_codigo) {
      const parts = lastOp.lote_codigo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2]) + 1;
      }
    }

    const loteCodigo = `OP-${dateStr}-${String(sequence).padStart(3, '0')}`;

    // 2. Criar a OP
    const dataProducao = params.dataProducao 
      ? new Date(params.dataProducao).toISOString()
      : new Date().toISOString();

    const { data, error } = await supabase
      .from('ordens_producao')
      .insert({
        produto_id: params.produtoId,
        qtd_planejada: params.qtdPlanejada,
        pedido_id: params.pedidoId,
        prioridade: params.prioridade || 0,
        lote_codigo: loteCodigo,
        status: 'planejado',
        data_producao: dataProducao,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/producao/fila');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao criar OP:', error);
    return { success: false, error: 'Erro ao criar ordem de produção' };
  }
}

export async function updateProductionOrder(params: UpdateProductionOrderParams) {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  try {
    const updateData: Record<string, unknown> = {
      produto_id: params.produtoId,
      qtd_planejada: params.qtdPlanejada,
      prioridade: params.prioridade ?? 0,
    };

    if (params.dataProducao) {
      updateData.data_producao = new Date(params.dataProducao).toISOString();
    }

    const { data, error } = await supabase
      .from('ordens_producao')
      .update(updateData)
      .eq('id', params.ordemId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/producao/fila');
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao atualizar OP:', error);
    return { success: false, error: 'Erro ao atualizar ordem de produção' };
  }
}

export async function getProductionQueue() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('ordens_producao')
    .select(`
      *,
      produtos (
        id,
        nome,
        unidade_padrao_id,
        package_units,
        box_units,
        unidades_assadeira,
        unidades (nome_resumido)
      ),
      pedidos (
        cliente_id,
        clientes (
          nome_fantasia
        )
      )
    `)
    .neq('status', 'concluido')
    .neq('status', 'cancelado');

  if (error) {
    console.error('Erro ao buscar fila:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Buscar receitas de massa para todos os produtos
  type OrdemProducaoItem = {
    id: string;
    produto_id: string;
    lote_codigo: string;
    qtd_planejada: number;
    [key: string]: unknown;
  };
  const produtoIds = [...new Set(data.map((item: OrdemProducaoItem) => item.produto_id))];
  
  const { data: receitasVinculadas, error: receitasError } = await supabase
    .from('produto_receitas')
    .select(`
      produto_id,
      quantidade_por_produto,
      receitas (
        tipo,
        ativo
      )
    `)
    .in('produto_id', produtoIds)
    .eq('ativo', true);

  if (receitasError) {
    console.error('Erro ao buscar receitas vinculadas:', receitasError);
  }

  // Criar mapa de produto_id -> receita_massa (filtrar apenas tipo massa e receita ativa)
  type ProdutoReceitaItem = {
    produto_id: string;
    quantidade_por_produto: number;
    receitas?: {
      tipo?: string;
      ativo?: boolean | null;
    } | null;
  };
  const receitasMap = new Map<string, { quantidade_por_produto: number }>();
  receitasVinculadas?.forEach((pr: ProdutoReceitaItem) => {
    const receita = pr.receitas;
    if (receita?.tipo === 'massa' && receita?.ativo !== false) {
      receitasMap.set(pr.produto_id, {
        quantidade_por_produto: pr.quantidade_por_produto,
      });
    }
  });

  // Buscar lotes de massa para calcular receitas batidas (apenas para estação massa)
  // Agora os dados estão diretamente em producao_etapas_log
  const { data: massaLogs } = await supabase
    .from('producao_etapas_log')
    .select(`
      id,
      ordem_producao_id,
      receitas_batidas
    `)
    .eq('etapa', 'massa')
    .in('ordem_producao_id', data.map((item: OrdemProducaoItem) => item.id));

  // Criar mapa de ordem_producao_id -> total de receitas batidas
  type MassaLogItem = {
    ordem_producao_id: string;
    receitas_batidas: number | null;
  };
  const receitasBatidasMap = new Map<string, number>();
  if (massaLogs && Array.isArray(massaLogs)) {
    (massaLogs as unknown as MassaLogItem[]).forEach((log) => {
      // Agrupa por ordem_producao_id e soma receitas_batidas
      const currentTotal = receitasBatidasMap.get(log.ordem_producao_id) || 0;
      const receitas = log.receitas_batidas || 0;
      receitasBatidasMap.set(log.ordem_producao_id, currentTotal + receitas);
    });
  }

  // Buscar logs de fermentação para calcular receitas de fermentação executadas
  const { data: fermentacaoLogs } = await supabase
    .from('producao_etapas_log')
    .select(`
      id,
      ordem_producao_id,
      qtd_saida
    `)
    .eq('etapa', 'fermentacao')
    .not('fim', 'is', null) // Apenas logs concluídos
    .in('ordem_producao_id', data.map((item: OrdemProducaoItem) => item.id));

  // Criar mapa de ordem_producao_id -> receitas de fermentação executadas
  type FermentacaoLogItem = {
    ordem_producao_id: string;
    qtd_saida: number | null;
  };
  const receitasFermentacaoMap = new Map<string, number>();
  fermentacaoLogs?.forEach((log: FermentacaoLogItem) => {
    if (log.qtd_saida) {
      // Buscar quantidade_por_produto do produto para converter unidades em receitas
      const item = data.find((i: OrdemProducaoItem) => i.id === log.ordem_producao_id);
      if (item) {
        const receitaMassa = receitasMap.get(item.produto_id);
        if (receitaMassa && receitaMassa.quantidade_por_produto > 0) {
          const receitasFermentacao = log.qtd_saida / receitaMassa.quantidade_por_produto;
          receitasFermentacaoMap.set(log.ordem_producao_id, receitasFermentacao);
        }
      }
    }
  });

  // Transformar os dados para incluir receita_massa, receitas_batidas e receitas_fermentacao no formato esperado
  type OrdemProducaoWithProduto = OrdemProducaoItem & {
    produtos?: {
      nome?: string;
      package_units?: number | null;
      box_units?: number | null;
      unidades_assadeira?: number | null;
      unidades?: { nome_resumido?: string } | null;
      [key: string]: unknown;
    } | null;
  };
  const transformedData = (data as OrdemProducaoWithProduto[]).map((item) => {
    const produto = item.produtos;
    const receitaMassa = receitasMap.get(item.produto_id) || null;
    const receitasBatidas = receitasBatidasMap.get(item.id) || 0;
    const receitasFermentacao = receitasFermentacaoMap.get(item.id) || 0;

    // Extrair nome_resumido do join com unidades
    const unidades = produto?.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    return {
      ...item,
      produtos: {
        ...produto,
        nome: produto?.nome || 'Produto sem nome',
        unidadeNomeResumido,
        receita_massa: receitaMassa,
      },
      receitas_batidas: receitasBatidas,
      receitas_fermentacao: receitasFermentacao,
    };
  });

  // Ordenação: data_producao (crescente, nulos por último) > prioridade (descendente) > created_at (crescente)
  type OrdemProducaoCompleta = OrdemProducaoWithProduto & {
    data_producao?: string | null;
    prioridade?: number | null;
    created_at?: string | null;
  };
  const sortedData = (transformedData as OrdemProducaoCompleta[]).sort((a, b) => {
    // 1. Comparar data_producao (nulos vão para o final)
    const dataA = a.data_producao ? new Date(a.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
    const dataB = b.data_producao ? new Date(b.data_producao).getTime() : Number.MAX_SAFE_INTEGER;
    if (dataA !== dataB) {
      return dataA - dataB;
    }

    // 2. Comparar prioridade (urgentes primeiro - descendente)
    const prioridadeA = a.prioridade ?? 0;
    const prioridadeB = b.prioridade ?? 0;
    if (prioridadeA !== prioridadeB) {
      return prioridadeB - prioridadeA;
    }

    // 3. Comparar created_at (mais antigas primeiro - ascendente)
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdA - createdB;
  });

  return sortedData;
}

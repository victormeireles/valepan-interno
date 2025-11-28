'use server';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { revalidatePath } from 'next/cache';

interface CreateProductionOrderParams {
  produtoId: string;
  qtdPlanejada: number;
  pedidoId?: string;
  prioridade?: number; // 0=Normal, 1=Alta, 2=Urgente
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
    const { data, error } = await supabase
      .from('ordens_producao')
      .insert({
        produto_id: params.produtoId,
        qtd_planejada: params.qtdPlanejada,
        pedido_id: params.pedidoId,
        prioridade: params.prioridade || 0,
        lote_codigo: loteCodigo,
        status: 'planejado',
        data_producao: new Date().toISOString(),
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

export async function getProductionQueue() {
  const supabase = supabaseClientFactory.createServiceRoleClient();

  const { data, error } = await supabase
    .from('ordens_producao')
    .select(`
      *,
      produtos (
        nome,
        unidade
      ),
      pedidos (
        cliente_id,
        clientes (
          nome_fantasia
        )
      )
    `)
    .neq('status', 'concluido')
    .neq('status', 'cancelado')
    .order('prioridade', { ascending: false }) // Urgentes primeiro
    .order('created_at', { ascending: true }); // Mais antigos primeiro

  if (error) {
    console.error('Erro ao buscar fila:', error);
    return [];
  }

  return data;
}

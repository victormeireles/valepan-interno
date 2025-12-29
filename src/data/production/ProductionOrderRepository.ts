/**
 * Repositório para acesso a dados de ordens de produção
 * Responsabilidade única: Queries e operações CRUD na tabela ordens_producao
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { ProductionOrderStatus } from '@/domain/types/producao-etapas';

type ProductionOrderRow = Database['public']['Tables']['ordens_producao']['Row'];
type ProductionOrderInsert = Database['public']['Tables']['ordens_producao']['Insert'];
type ProductionOrderUpdate = Database['public']['Tables']['ordens_producao']['Update'];

export interface ProductionOrder {
  id: string;
  lote_codigo: string;
  pedido_id: string | null;
  produto_id: string;
  qtd_planejada: number;
  prioridade: number;
  status: ProductionOrderStatus;
  data_producao: string | null;
  created_at: string | null;
}

export interface CreateProductionOrderInput {
  produto_id: string;
  qtd_planejada: number;
  pedido_id?: string;
  prioridade?: number;
  data_producao?: string;
}

export interface UpdateProductionOrderInput {
  produto_id?: string;
  qtd_planejada?: number;
  prioridade?: number;
  status?: ProductionOrderStatus;
  data_producao?: string;
}

export class ProductionOrderRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Cria uma nova ordem de produção
   */
  async create(input: CreateProductionOrderInput): Promise<ProductionOrder> {
    const loteCodigo = await this.generateLoteCodigo();

    const insertData: ProductionOrderInsert = {
      produto_id: input.produto_id,
      qtd_planejada: input.qtd_planejada,
      pedido_id: input.pedido_id || null,
      prioridade: input.prioridade || 0,
      status: 'planejado',
      data_producao: input.data_producao || new Date().toISOString().split('T')[0],
      lote_codigo: loteCodigo,
    };

    const { data, error } = await this.supabase
      .from('ordens_producao')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar ordem de produção: ${error.message}`);
    }

    return this.mapRowToDomain(data);
  }

  /**
   * Atualiza uma ordem de produção
   */
  async update(
    id: string,
    input: UpdateProductionOrderInput,
  ): Promise<ProductionOrder> {
    const updateData: ProductionOrderUpdate = {
      produto_id: input.produto_id,
      qtd_planejada: input.qtd_planejada,
      prioridade: input.prioridade,
      status: input.status,
      data_producao: input.data_producao,
    };

    // Remove campos undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { data, error } = await this.supabase
      .from('ordens_producao')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar ordem de produção: ${error.message}`);
    }

    return this.mapRowToDomain(data);
  }

  /**
   * Busca uma ordem de produção por ID
   */
  async findById(id: string): Promise<ProductionOrder | null> {
    console.log('[ProductionOrderRepository] Buscando ordem de produção:', { id });
    
    try {
      const { data, error } = await this.supabase
        .from('ordens_producao')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[ProductionOrderRepository] Erro na query:', {
          id,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Erro ao buscar ordem de produção: ${error.message}`);
      }

      console.log('[ProductionOrderRepository] Ordem encontrada:', { id, found: !!data });
      return data ? this.mapRowToDomain(data) : null;
    } catch (err) {
      console.error('[ProductionOrderRepository] Erro ao buscar ordem:', {
        id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Busca ordens de produção por status
   */
  async findByStatus(status: ProductionOrderStatus): Promise<ProductionOrder[]> {
    const { data, error } = await this.supabase
      .from('ordens_producao')
      .select('*')
      .eq('status', status)
      .order('prioridade', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar ordens por status: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row));
  }

  /**
   * Busca ordens ativas (não concluídas e não canceladas)
   */
  async findActive(): Promise<ProductionOrder[]> {
    const { data, error } = await this.supabase
      .from('ordens_producao')
      .select('*')
      .neq('status', 'concluido')
      .neq('status', 'cancelado')
      .order('data_producao', { ascending: true, nullsFirst: false }) // Data produção crescente (nulos por último)
      .order('prioridade', { ascending: false }) // Urgentes primeiro
      .order('created_at', { ascending: true }); // Data criação OP crescente

    if (error) {
      throw new Error(`Erro ao buscar ordens ativas: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row));
  }

  /**
   * Gera código único de lote (OP-YYYYMMDD-XXX)
   */
  private async generateLoteCodigo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    const { data: lastOp } = await this.supabase
      .from('ordens_producao')
      .select('lote_codigo')
      .ilike('lote_codigo', `OP-${dateStr}-%`)
      .order('lote_codigo', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sequence = 1;
    if (lastOp?.lote_codigo) {
      const parts = lastOp.lote_codigo.split('-');
      if (parts.length === 3) {
        sequence = parseInt(parts[2]) + 1;
      }
    }

    return `OP-${dateStr}-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Mapeia uma row do banco para o tipo de domínio
   */
  private mapRowToDomain(row: ProductionOrderRow): ProductionOrder {
    return {
      id: row.id,
      lote_codigo: row.lote_codigo,
      pedido_id: row.pedido_id,
      produto_id: row.produto_id,
      qtd_planejada: Number(row.qtd_planejada),
      prioridade: row.prioridade || 0,
      status: (row.status || 'planejado') as ProductionOrderStatus,
      data_producao: row.data_producao,
      created_at: row.created_at,
    };
  }
}




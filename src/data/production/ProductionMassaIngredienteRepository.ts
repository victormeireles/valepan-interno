/**
 * Repositório para acesso a dados de ingredientes usados em lotes de massa
 * Responsabilidade única: Queries e operações CRUD na tabela producao_massa_ingredientes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { MassaIngrediente } from '@/domain/types/producao-massa';

// Tipos temporários até os tipos do database serem atualizados
type MassaIngredienteRow = {
  id: string;
  producao_etapas_log_id: string;
  insumo_id: string | null;
  quantidade_padrao: number;
  quantidade_usada: number;
  unidade: string;
  created_at: string | null;
};

type MassaIngredienteInsert = {
  producao_etapas_log_id: string;
  insumo_id: string | null;
  quantidade_padrao: number;
  quantidade_usada: number;
  unidade: string;
};

export class ProductionMassaIngredienteRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Cria ingredientes para um lote
   */
  async createMany(ingredientes: MassaIngredienteInsert[]): Promise<MassaIngrediente[]> {
    if (ingredientes.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('producao_massa_ingredientes')
      .insert(ingredientes)
      .select();

    if (error) {
      throw new Error(`Erro ao criar ingredientes: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row));
  }

  /**
   * Busca ingredientes de um lote (agora usa producao_etapas_log_id)
   */
  async findByLoteId(etapasLogId: string): Promise<MassaIngrediente[]> {
    const { data, error } = await this.supabase
      .from('producao_massa_ingredientes')
      .select('*')
      .eq('producao_etapas_log_id', etapasLogId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar ingredientes: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row));
  }

  /**
   * Deleta todos os ingredientes de um lote (agora usa producao_etapas_log_id)
   */
  async deleteByLoteId(etapasLogId: string): Promise<void> {
    const { error } = await this.supabase
      .from('producao_massa_ingredientes')
      .delete()
      .eq('producao_etapas_log_id', etapasLogId);

    if (error) {
      throw new Error(`Erro ao deletar ingredientes: ${error.message}`);
    }
  }

  /**
   * Atualiza ingredientes de um lote (deleta e recria) - agora usa producao_etapas_log_id
   */
  async updateByLoteId(
    etapasLogId: string,
    ingredientes: MassaIngredienteInsert[],
  ): Promise<MassaIngrediente[]> {
    await this.deleteByLoteId(etapasLogId);
    return this.createMany(ingredientes);
  }

  /**
   * Mapeia uma row do banco para o tipo de domínio
   */
  private mapRowToDomain(row: MassaIngredienteRow): MassaIngrediente {
    return {
      id: row.id,
      producao_etapas_log_id: row.producao_etapas_log_id,
      insumo_id: row.insumo_id,
      quantidade_padrao: Number(row.quantidade_padrao),
      quantidade_usada: Number(row.quantidade_usada),
      unidade: row.unidade,
      created_at: row.created_at || new Date().toISOString(),
    };
  }
}


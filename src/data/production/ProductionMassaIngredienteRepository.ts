/**
 * Repositório para acesso a dados de ingredientes de massa
 * Responsabilidade única: Queries e operações CRUD na tabela producao_massa_ingredientes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { MassaIngrediente } from '@/domain/types/producao-massa';

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
   * Cria múltiplos ingredientes
   */
  async createMany(
    ingredientes: MassaIngredienteInsert[],
  ): Promise<MassaIngrediente[]> {
    if (ingredientes.length === 0) {
      return [];
    }

    // Usar producao_etapas_log_id (a tabela foi atualizada para usar esse campo)
    const ingredientesParaInsert = ingredientes.map(ing => ({
      producao_etapas_log_id: ing.producao_etapas_log_id,
      insumo_id: ing.insumo_id,
      quantidade_padrao: ing.quantidade_padrao,
      quantidade_usada: ing.quantidade_usada,
      unidade: ing.unidade,
    }));

    const { data, error } = await this.supabase
      .from('producao_massa_ingredientes')
      .insert(ingredientesParaInsert)
      .select();

    if (error) {
      throw new Error(
        `Erro ao criar ingredientes: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => this.mapRow(row));
  }

  /**
   * Busca ingredientes por ID do log de etapa (producao_etapas_log_id)
   */
  async findByLoteId(loteId: string): Promise<MassaIngrediente[]> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f642a82f-259b-4a62-97f8-0f9918acb467',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductionMassaIngredienteRepository.ts:67',message:'findByLoteId chamado',data:{loteId,columnName:'producao_etapas_log_id'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { data, error } = await this.supabase
      .from('producao_massa_ingredientes')
      .select('*')
      .eq('producao_etapas_log_id', loteId)
      .order('created_at', { ascending: true });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f642a82f-259b-4a62-97f8-0f9918acb467',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductionMassaIngredienteRepository.ts:74',message:'Query executada',data:{error:error?.message,dataLength:data?.length||0,columnUsed:'producao_etapas_log_id'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/f642a82f-259b-4a62-97f8-0f9918acb467',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductionMassaIngredienteRepository.ts:77',message:'Erro na query',data:{errorMessage:error.message,columnUsed:'producao_etapas_log_id'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error(
        `Erro ao buscar ingredientes: ${error.message}`,
      );
    }

    return (data ?? []).map((row) => this.mapRow(row));
  }

  /**
   * Atualiza ingredientes de um lote (deleta os antigos e cria os novos)
   */
  async updateByLoteId(
    loteId: string,
    ingredientes: MassaIngredienteInsert[],
  ): Promise<MassaIngrediente[]> {
    // Deleta ingredientes existentes
    await this.deleteByLoteId(loteId);

    // Cria novos ingredientes
    if (ingredientes.length > 0) {
      return await this.createMany(ingredientes);
    }

    return [];
  }

  /**
   * Deleta ingredientes por ID do log de etapa
   */
  async deleteByLoteId(loteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('producao_massa_ingredientes')
      .delete()
      .eq('producao_etapas_log_id', loteId);

    if (error) {
      throw new Error(
        `Erro ao deletar ingredientes: ${error.message}`,
      );
    }
  }

  /**
   * Mapeia uma linha do banco para o tipo de domínio
   */
  private mapRow(row: MassaIngredienteRow): MassaIngrediente {
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

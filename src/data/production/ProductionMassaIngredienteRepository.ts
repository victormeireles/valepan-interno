/**

 * Repositório para acesso a dados de ingredientes de massa

 * Responsabilidade única: Queries e operações CRUD na tabela producao_massa_ingredientes

 */



import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/database';

import { MassaIngrediente } from '@/domain/types/producao-massa';

import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

import { ensurePublicEtapasLogForIngredientesFk } from '@/lib/production/ensure-public-etapas-log-for-ingredientes-fk';



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



    const ingredientesParaInsert = ingredientes.map((ing) => ({

      producao_etapas_log_id: ing.producao_etapas_log_id,

      insumo_id: ing.insumo_id,

      quantidade_padrao: ing.quantidade_padrao,

      quantidade_usada: ing.quantidade_usada,

      unidade: ing.unidade,

    }));



    const logIds = [

      ...new Set(ingredientesParaInsert.map((i) => i.producao_etapas_log_id).filter(Boolean)),

    ];

    const publicSupabase = supabaseClientFactory.createServiceRolePublicClient();



    for (const logId of logIds) {

      const { data: logInterno } = await this.supabase

        .from('producao_etapas_log')

        .select('id')

        .eq('id', logId)

        .maybeSingle();

      const { data: logPublic } = await publicSupabase

        .from('producao_etapas_log')

        .select('id')

        .eq('id', logId)

        .maybeSingle();

      const existsInterno = Boolean(logInterno?.id);

      const existsPublic = Boolean((logPublic as { id?: string } | null)?.id);

      if (existsInterno && !existsPublic) {

        await ensurePublicEtapasLogForIngredientesFk(

          this.supabase,

          publicSupabase,

          logId,

        );

      }

    }



    const attemptInsert = () =>

      this.supabase.from('producao_massa_ingredientes').insert(ingredientesParaInsert).select();



    let { data, error } = await attemptInsert();



    if (

      error?.code === '23503' &&

      String(error.message).includes('producao_massa_ingredientes_producao_etapas_log_id_fkey')

    ) {

      for (const logId of logIds) {

        await ensurePublicEtapasLogForIngredientesFk(this.supabase, publicSupabase, logId);

      }

      const retry = await attemptInsert();

      data = retry.data;

      error = retry.error;

    }



    if (error) {

      if (

        error.code === '23503' &&

        String(error.message).includes('producao_massa_ingredientes_producao_etapas_log_id_fkey')

      ) {

        throw new Error(

          'O log de etapa existe em interno, mas a foreign key de ingredientes ainda aponta para public.producao_etapas_log. Execute no Supabase SQL Editor o script sql/PATCH_FK_PRODUCAO_MASSA_INGREDIENTES_LOG_INTERNO.sql e tente novamente.',

        );

      }

      throw new Error(`Erro ao criar ingredientes: ${error.message}`);

    }



    return (data ?? []).map((row) => this.mapRow(row));

  }



  /**

   * Busca ingredientes por ID do log de etapa (producao_etapas_log_id)

   */

  async findByLoteId(loteId: string): Promise<MassaIngrediente[]> {

    const { data, error } = await this.supabase

      .from('producao_massa_ingredientes')

      .select('*')

      .eq('producao_etapas_log_id', loteId)

      .order('created_at', { ascending: true });



    if (error) {

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

    await this.deleteByLoteId(loteId);



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



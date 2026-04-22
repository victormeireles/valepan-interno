/**
 * Repositório para acesso a dados de logs de etapas de produção
 * Responsabilidade única: Queries e operações CRUD na tabela producao_etapas_log
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/types/database';
import {
  ProductionStepLog,
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
  ProductionStep,
  QualityData,
} from '@/domain/types/producao-etapas';

// Tipos temporários até os tipos do database serem atualizados
type ProductionStepLogRow = {
  id: string;
  ordem_producao_id: string;
  etapa: string;
  usuario_id: string | null;
  qtd_entrada: number | null;
  qtd_saida: number | null;
  perda_qtd: number | null;
  dados_qualidade: Json | null;
  fotos: string[] | null;
  inicio: string | null;
  fim: string | null;
  // Campos específicos da etapa massa (opcionais)
  receita_id: string | null;
  masseira_id: string | null;
  receitas_batidas: number | null;
  temperatura_final: number | null;
  tempo_lenta: number | null;
  tempo_rapida: number | null;
  textura: string | null;
  ph_massa: number | null;
};

type ProductionStepLogInsert = {
  ordem_producao_id: string;
  etapa: string;
  usuario_id?: string | null;
  qtd_entrada?: number | null;
  qtd_saida: number;
  perda_qtd?: number;
  dados_qualidade?: Json | null;
  fotos?: string[];
  inicio?: string;
  fim?: string | null;
  // Campos específicos da etapa massa (opcionais)
  receita_id?: string | null;
  masseira_id?: string | null;
  receitas_batidas?: number | null;
  temperatura_final?: number | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  textura?: string | null;
  ph_massa?: number | null;
};

type ProductionStepLogUpdate = {
  qtd_entrada?: number | null;
  qtd_saida?: number;
  perda_qtd?: number;
  dados_qualidade?: Json | null;
  fotos?: string[];
  fim?: string | null;
  // Campos específicos da etapa massa (opcionais)
  receita_id?: string | null;
  masseira_id?: string | null;
  receitas_batidas?: number | null;
  temperatura_final?: number | null;
  tempo_lenta?: number | null;
  tempo_rapida?: number | null;
  textura?: string | null;
  ph_massa?: number | null;
};

export class ProductionStepRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Cria um novo log de etapa de produção
   */
  async create(input: CreateProductionStepLogInput): Promise<ProductionStepLog> {
    // Nota: Campos de massa são opcionais na criação do log de etapa.
    // Eles serão preenchidos quando um lote de massa for criado através do ProductionMassaManager.createLote.
    // A validação dos campos de massa acontece na camada de domínio quando o lote é criado/atualizado.

    const insertData: ProductionStepLogInsert = {
      ordem_producao_id: input.ordem_producao_id,
      etapa: input.etapa,
      usuario_id: input.usuario_id || null,
      qtd_entrada: input.qtd_entrada || null,
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd || 0,
      dados_qualidade: (input.dados_qualidade as Json) || null,
      fotos: input.fotos || [],
      // Campos de massa (podem ser NULL na criação inicial)
      receita_id: input.receita_id || null,
      masseira_id: input.masseira_id || null,
      receitas_batidas: input.receitas_batidas !== undefined ? input.receitas_batidas : null,
      temperatura_final: input.temperatura_final !== undefined ? input.temperatura_final : null,
      tempo_lenta: input.tempo_lenta !== undefined ? input.tempo_lenta : null,
      tempo_rapida: input.tempo_rapida !== undefined ? input.tempo_rapida : null,
      textura: input.textura || null,
      ph_massa: input.ph_massa !== undefined ? input.ph_massa : null,
    };

    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[ProductionStepRepository.create] ❌ Erro ao criar:', {
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        error_hint: error.hint,
        insertData: JSON.stringify(insertData, null, 2),
      });
      throw new Error(`Erro ao criar log de etapa: ${error.message}`);
    }

    return this.mapRowToDomain(data as unknown as ProductionStepLogRow);
  }

  /**
   * Atualiza um log de etapa existente
   */
  async update(
    id: string,
    input: UpdateProductionStepLogInput,
  ): Promise<ProductionStepLog> {
    const updateData: ProductionStepLogUpdate = {
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd,
      dados_qualidade: input.dados_qualidade as Json | null | undefined,
      fotos: input.fotos,
      fim: input.fim,
      // Campos de massa
      receita_id: input.receita_id,
      masseira_id: input.masseira_id,
      receitas_batidas: input.receitas_batidas,
      temperatura_final: input.temperatura_final,
      tempo_lenta: input.tempo_lenta,
      tempo_rapida: input.tempo_rapida,
      textura: input.textura,
      ph_massa: input.ph_massa,
    };

    // Remove campos undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ProductionStepRepository.update] ❌ Erro ao atualizar:', error);
      throw new Error(`Erro ao atualizar log de etapa: ${error.message}`);
    }

    return this.mapRowToDomain(data as unknown as ProductionStepLogRow);
  }

  /**
   * Busca um log por ID
   */
  async findById(id: string): Promise<ProductionStepLog | null> {
    try {
      const { data, error } = await this.supabase
        .from('producao_etapas_log')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[ProductionStepRepository] Erro na query:', {
          id,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Erro ao buscar log: ${error.message}`);
      }

      return data ? this.mapRowToDomain(data as unknown as ProductionStepLogRow) : null;
    } catch (err) {
      console.error('[ProductionStepRepository] Erro ao buscar log:', {
        id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  /**
   * Busca logs de uma ordem de produção
   */
  async findByOrderId(ordemProducaoId: string): Promise<ProductionStepLog[]> {
    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .select('*')
      .eq('ordem_producao_id', ordemProducaoId)
      .order('inicio', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row as unknown as ProductionStepLogRow));
  }

  /**
   * Busca o último log de uma etapa específica para uma ordem
   */
  async findLastByOrderAndStep(
    ordemProducaoId: string,
    etapa: ProductionStep,
  ): Promise<ProductionStepLog | null> {
    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .select('*')
      .eq('ordem_producao_id', ordemProducaoId)
      .eq('etapa', etapa)
      .order('inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar último log: ${error.message}`);
    }

    return data ? this.mapRowToDomain(data as unknown as ProductionStepLogRow) : null;
  }

  /**
   * Busca logs em andamento (fim = null) de uma ordem
   */
  async findInProgressByOrderId(
    ordemProducaoId: string,
  ): Promise<ProductionStepLog[]> {
    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .select('*')
      .eq('ordem_producao_id', ordemProducaoId)
      .is('fim', null)
      .order('inicio', { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar logs em andamento: ${error.message}`);
    }

    return (data || []).map((row) => this.mapRowToDomain(row as unknown as ProductionStepLogRow));
  }

  /**
   * Remove um log de etapa (ex.: exclusão de lote de massa após remover ingredientes)
   */
  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from('producao_etapas_log').delete().eq('id', id);
    if (error) {
      throw new Error(`Erro ao excluir log de etapa: ${error.message}`);
    }
  }

  /**
   * Busca a última etapa concluída de uma ordem
   */
  async findLastCompletedByOrderId(
    ordemProducaoId: string,
  ): Promise<ProductionStepLog | null> {
    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .select('*')
      .eq('ordem_producao_id', ordemProducaoId)
      .not('fim', 'is', null)
      .order('inicio', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar última etapa concluída: ${error.message}`);
    }

    return data ? this.mapRowToDomain(data as unknown as ProductionStepLogRow) : null;
  }

  /**
   * Mapeia uma row do banco para o tipo de domínio
   */
  private mapRowToDomain(row: ProductionStepLogRow): ProductionStepLog {
    return {
      id: row.id,
      ordem_producao_id: row.ordem_producao_id,
      etapa: row.etapa as ProductionStep,
      usuario_id: row.usuario_id,
      masseira_id: row.masseira_id,
      qtd_entrada: row.qtd_entrada ? Number(row.qtd_entrada) : null,
      qtd_saida: row.qtd_saida ? Number(row.qtd_saida) : null,
      perda_qtd: Number(row.perda_qtd || 0),
      dados_qualidade: (row.dados_qualidade as QualityData) || null,
      fotos: row.fotos || [],
      inicio: row.inicio || new Date().toISOString(),
      fim: row.fim,
      // Campos específicos da etapa massa
      receita_id: row.receita_id || null,
      receitas_batidas: row.receitas_batidas !== null && row.receitas_batidas !== undefined ? Number(row.receitas_batidas) : null,
      temperatura_final: row.temperatura_final !== null && row.temperatura_final !== undefined ? Number(row.temperatura_final) : null,
      tempo_lenta: row.tempo_lenta !== null && row.tempo_lenta !== undefined ? Number(row.tempo_lenta) : null,
      tempo_rapida: row.tempo_rapida !== null && row.tempo_rapida !== undefined ? Number(row.tempo_rapida) : null,
      textura: (row.textura === 'ok' || row.textura === 'rasga') ? row.textura : null,
      ph_massa:
        row.ph_massa !== null && row.ph_massa !== undefined ? Number(row.ph_massa) : null,
    };
  }
}


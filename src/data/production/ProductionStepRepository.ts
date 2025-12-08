/**
 * Repositório para acesso a dados de logs de etapas de produção
 * Responsabilidade única: Queries e operações CRUD na tabela producao_etapas_log
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import {
  ProductionStepLog,
  CreateProductionStepLogInput,
  UpdateProductionStepLogInput,
  ProductionStep,
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
  dados_qualidade: Database['public']['Tables']['producao_etapas_log']['Row']['dados_qualidade'];
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
};

type ProductionStepLogInsert = {
  ordem_producao_id: string;
  etapa: string;
  usuario_id?: string | null;
  qtd_entrada?: number | null;
  qtd_saida: number;
  perda_qtd?: number;
  dados_qualidade?: Database['public']['Tables']['producao_etapas_log']['Insert']['dados_qualidade'];
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
};

type ProductionStepLogUpdate = {
  qtd_entrada?: number | null;
  qtd_saida?: number;
  perda_qtd?: number;
  dados_qualidade?: Database['public']['Tables']['producao_etapas_log']['Update']['dados_qualidade'];
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
};

export class ProductionStepRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  /**
   * Cria um novo log de etapa de produção
   */
  async create(input: CreateProductionStepLogInput): Promise<ProductionStepLog> {
    console.log('[ProductionStepRepository.create] 🆕 CRIANDO NOVO REGISTRO em producao_etapas_log:', {
      ordem_producao_id: input.ordem_producao_id,
      etapa: input.etapa,
      qtd_saida: input.qtd_saida,
      stack: new Error().stack?.split('\n').slice(1, 5).join('\n'), // Stack trace para identificar origem
    });

    // Validação: se etapa é 'massa', campos de massa são obrigatórios
    // Nota: A validação no banco de dados (constraint CHECK) também garante isso
    if (input.etapa === 'massa') {
      if (!input.receita_id || !input.masseira_id || input.receitas_batidas === undefined || 
          input.temperatura_final === undefined || input.tempo_lenta === undefined || 
          input.tempo_rapida === undefined || !input.textura) {
        throw new Error('Campos de massa são obrigatórios quando etapa é "massa": receita_id, masseira_id, receitas_batidas, temperatura_final, tempo_lenta, tempo_rapida, textura');
      }
    }

    const insertData: ProductionStepLogInsert = {
      ordem_producao_id: input.ordem_producao_id,
      etapa: input.etapa,
      usuario_id: input.usuario_id || null,
      qtd_entrada: input.qtd_entrada || null,
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd || 0,
      dados_qualidade: (input.dados_qualidade as unknown as Database['public']['Tables']['producao_etapas_log']['Insert']['dados_qualidade']) || null,
      fotos: input.fotos || [],
      // Campos de massa
      receita_id: input.receita_id || null,
      masseira_id: input.masseira_id || null,
      receitas_batidas: input.receitas_batidas !== undefined ? input.receitas_batidas : null,
      temperatura_final: input.temperatura_final !== undefined ? input.temperatura_final : null,
      tempo_lenta: input.tempo_lenta !== undefined ? input.tempo_lenta : null,
      tempo_rapida: input.tempo_rapida !== undefined ? input.tempo_rapida : null,
      textura: input.textura || null,
    };

    const { data, error } = await this.supabase
      .from('producao_etapas_log')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[ProductionStepRepository.create] ❌ Erro ao criar:', error);
      throw new Error(`Erro ao criar log de etapa: ${error.message}`);
    }

    console.log('[ProductionStepRepository.create] ✅ Registro criado com sucesso:', {
      id: data.id,
      ordem_producao_id: data.ordem_producao_id,
      etapa: data.etapa,
      qtd_saida: data.qtd_saida,
    });

    return this.mapRowToDomain(data);
  }

  /**
   * Atualiza um log de etapa existente
   */
  async update(
    id: string,
    input: UpdateProductionStepLogInput,
  ): Promise<ProductionStepLog> {
    console.log('[ProductionStepRepository.update] 🔄 ATUALIZANDO registro em producao_etapas_log:', {
      id,
      qtd_saida: input.qtd_saida,
      stack: new Error().stack?.split('\n').slice(1, 5).join('\n'), // Stack trace para identificar origem
    });

    const updateData: ProductionStepLogUpdate = {
      qtd_saida: input.qtd_saida,
      perda_qtd: input.perda_qtd,
      dados_qualidade: (input.dados_qualidade as unknown as Database['public']['Tables']['producao_etapas_log']['Update']['dados_qualidade']) || undefined,
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

    console.log('[ProductionStepRepository.update] ✅ Registro atualizado com sucesso:', {
      id: data.id,
      qtd_saida: data.qtd_saida,
    });

    return this.mapRowToDomain(data);
  }

  /**
   * Busca um log por ID
   */
  async findById(id: string): Promise<ProductionStepLog | null> {
    console.log('[ProductionStepRepository] Buscando log de etapa:', { id });
    
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

      console.log('[ProductionStepRepository] Log encontrado:', { id, found: !!data });
      return data ? this.mapRowToDomain(data) : null;
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

    return (data || []).map((row) => this.mapRowToDomain(row));
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

    return data ? this.mapRowToDomain(data) : null;
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

    return (data || []).map((row) => this.mapRowToDomain(row));
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

    return data ? this.mapRowToDomain(data) : null;
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
      dados_qualidade: row.dados_qualidade as Record<string, unknown> | null,
      fotos: row.fotos || [],
      inicio: row.inicio || '',
      fim: row.fim,
      // Campos específicos da etapa massa
      receita_id: row.receita_id || null,
      receitas_batidas: row.receitas_batidas !== null && row.receitas_batidas !== undefined ? Number(row.receitas_batidas) : null,
      temperatura_final: row.temperatura_final !== null && row.temperatura_final !== undefined ? Number(row.temperatura_final) : null,
      tempo_lenta: row.tempo_lenta !== null && row.tempo_lenta !== undefined ? Number(row.tempo_lenta) : null,
      tempo_rapida: row.tempo_rapida !== null && row.tempo_rapida !== undefined ? Number(row.tempo_rapida) : null,
      textura: (row.textura === 'ok' || row.textura === 'rasga') ? row.textura : null,
    };
  }
}


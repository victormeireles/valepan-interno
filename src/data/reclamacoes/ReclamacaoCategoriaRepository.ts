import { SupabaseClient } from '@supabase/supabase-js';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type CategoriaRow = Database['public']['Tables']['reclamacao_categorias']['Row'];

export type ReclamacaoCategoriaWriteInput = {
  nome: string;
  ordem: number;
  ativa: boolean;
  exigeObservacao: boolean;
};

function mapCategoria(row: CategoriaRow): ReclamacaoCategoriaRecord {
  return {
    id: row.id,
    nome: row.nome,
    ordem: row.ordem,
    ativa: row.ativa,
    exigeObservacao: row.exige_observacao,
  };
}

export class ReclamacaoCategoriaRepository {
  constructor(private readonly supabase?: SupabaseClient<Database>) {}

  private get db(): SupabaseClient {
    const client =
      this.supabase ?? supabaseClientFactory.createServiceRoleClient();
    return client as unknown as SupabaseClient;
  }

  async listAll(): Promise<ReclamacaoCategoriaRecord[]> {
    const { data, error } = await this.db
      .from('reclamacao_categorias')
      .select('*')
      .order('ordem');

    if (error) {
      throw new Error(`Erro ao listar categorias de reclamação: ${error.message}`);
    }

    return ((data as CategoriaRow[]) ?? []).map(mapCategoria);
  }

  async listAtivas(): Promise<ReclamacaoCategoriaRecord[]> {
    const { data, error } = await this.db
      .from('reclamacao_categorias')
      .select('*')
      .eq('ativa', true)
      .order('ordem');

    if (error) {
      throw new Error(`Erro ao listar categorias ativas: ${error.message}`);
    }

    return ((data as CategoriaRow[]) ?? []).map(mapCategoria);
  }

  async findById(id: string): Promise<ReclamacaoCategoriaRecord | null> {
    const { data, error } = await this.db
      .from('reclamacao_categorias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar categoria de reclamação: ${error.message}`);
    }

    return data ? mapCategoria(data as CategoriaRow) : null;
  }

  async countByCategoriaId(id: string): Promise<number> {
    const { count, error } = await this.db
      .from('reclamacoes')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', id);

    if (error) {
      throw new Error(`Erro ao contar reclamações da categoria: ${error.message}`);
    }

    return count ?? 0;
  }

  async insert(input: ReclamacaoCategoriaWriteInput): Promise<ReclamacaoCategoriaRecord> {
    const { data, error } = await this.db
      .from('reclamacao_categorias')
      .insert({
        nome: input.nome.trim(),
        ordem: input.ordem,
        ativa: input.ativa,
        exige_observacao: input.exigeObservacao,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao criar categoria de reclamação: ${error.message}`);
    }

    return mapCategoria(data as CategoriaRow);
  }

  async update(
    id: string,
    input: ReclamacaoCategoriaWriteInput,
  ): Promise<ReclamacaoCategoriaRecord> {
    const { data, error } = await this.db
      .from('reclamacao_categorias')
      .update({
        nome: input.nome.trim(),
        ordem: input.ordem,
        ativa: input.ativa,
        exige_observacao: input.exigeObservacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar categoria de reclamação: ${error.message}`);
    }

    return mapCategoria(data as CategoriaRow);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.db
      .from('reclamacao_categorias')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir categoria de reclamação: ${error.message}`);
    }
  }
}

export const reclamacaoCategoriaRepository = new ReclamacaoCategoriaRepository();

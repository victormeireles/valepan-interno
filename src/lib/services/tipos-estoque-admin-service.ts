import type { SupabaseClient } from '@supabase/supabase-js';
import type { TipoEstoqueFormData } from '@/domain/etiquetas/tipo-estoque-validation';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';

export type TipoEstoqueAdminRecord = {
  id: string;
  nome: string;
  ativo: boolean;
  possui_etiqueta: boolean;
  congelado: boolean;
  mostrar_texto_congelado: boolean;
  receita_caixa_id: string | null;
  receita_caixa_nome: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TipoEstoqueRow = Pick<
  Tables<'tipos_estoque'>,
  | 'id'
  | 'nome'
  | 'ativo'
  | 'possui_etiqueta'
  | 'congelado'
  | 'mostrar_texto_congelado'
  | 'receita_caixa_id'
  | 'created_at'
  | 'updated_at'
> & {
  receitas?: { nome: string } | { nome: string }[] | null;
};

const SELECT_COLUMNS =
  'id, nome, ativo, possui_etiqueta, congelado, mostrar_texto_congelado, receita_caixa_id, created_at, updated_at';

const SELECT_WITH_RECEITA = `${SELECT_COLUMNS}, receitas!tipos_estoque_receita_caixa_id_fkey ( nome )`;

export class TiposEstoqueAdminService {
  private readonly factory: SupabaseClientFactory;

  constructor(factory: SupabaseClientFactory = supabaseClientFactory) {
    this.factory = factory;
  }

  public async list(includeInactive = true): Promise<TipoEstoqueAdminRecord[]> {
    const client = this.resolveClient();
    let query = client.from('tipos_estoque').select(SELECT_WITH_RECEITA).order('nome', { ascending: true });

    if (!includeInactive) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar tipos de estoque: ${error.message}`);
    }

    return (data ?? []).map((row) => this.mapRecord(row as TipoEstoqueRow));
  }

  public async findDuplicateNome(nome: string, excludeId?: string): Promise<boolean> {
    const client = this.resolveClient();
    let query = client.from('tipos_estoque').select('id').ilike('nome', nome.trim()).limit(1);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(`Erro ao verificar nome duplicado: ${error.message}`);
    }

    return data != null;
  }

  public async create(input: TipoEstoqueFormData): Promise<TipoEstoqueAdminRecord> {
    const client = this.resolveClient();
    const { data, error } = await client
      .from('tipos_estoque')
      .insert(this.toPayload(input))
      .select(SELECT_WITH_RECEITA)
      .single();

    if (error) {
      throw new Error(`Erro ao criar tipo de estoque: ${error.message}`);
    }

    return this.mapRecord(data as TipoEstoqueRow);
  }

  public async update(id: string, input: TipoEstoqueFormData): Promise<TipoEstoqueAdminRecord> {
    const client = this.resolveClient();
    const { data, error } = await client
      .from('tipos_estoque')
      .update({
        ...this.toPayload(input),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(SELECT_WITH_RECEITA)
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar tipo de estoque: ${error.message}`);
    }

    return this.mapRecord(data as TipoEstoqueRow);
  }

  public async deactivate(id: string): Promise<TipoEstoqueAdminRecord> {
    const client = this.resolveClient();
    const { data, error } = await client
      .from('tipos_estoque')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(SELECT_WITH_RECEITA)
      .single();

    if (error) {
      throw new Error(`Erro ao desativar tipo de estoque: ${error.message}`);
    }

    return this.mapRecord(data as TipoEstoqueRow);
  }

  private resolveClient(): SupabaseClient<Database> {
    return this.factory.createServiceRoleClient();
  }

  private toPayload(input: TipoEstoqueFormData) {
    return {
      nome: input.nome.trim(),
      ativo: input.ativo,
      possui_etiqueta: input.possui_etiqueta,
      congelado: input.congelado,
      mostrar_texto_congelado: input.mostrar_texto_congelado,
      receita_caixa_id: input.receita_caixa_id,
    };
  }

  private mapRecord(record: TipoEstoqueRow): TipoEstoqueAdminRecord {
    const receita = Array.isArray(record.receitas) ? record.receitas[0] : record.receitas;
    return {
      id: record.id,
      nome: record.nome,
      ativo: record.ativo ?? false,
      possui_etiqueta: record.possui_etiqueta ?? false,
      congelado: record.congelado ?? false,
      mostrar_texto_congelado: record.mostrar_texto_congelado ?? false,
      receita_caixa_id: record.receita_caixa_id ?? null,
      receita_caixa_nome: receita?.nome ?? null,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}

export const tiposEstoqueAdminService = new TiposEstoqueAdminService();

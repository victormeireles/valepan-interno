import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';

export type TipoEstoqueRecord = Tables<'tipos_estoque'>;

export type TipoEstoqueDTO = {
  readonly id: string;
  readonly nome: string;
  readonly ativo: boolean;
  readonly possuiEtiqueta: boolean;
};

export class TiposEstoqueService {
  private readonly factory: SupabaseClientFactory;

  constructor(factory: SupabaseClientFactory = supabaseClientFactory) {
    this.factory = factory;
  }

  public async listTiposEstoque(): Promise<TipoEstoqueDTO[]> {
    const client = this.resolveClient();
    const query = client
      .from('tipos_estoque')
      .select('id, nome, ativo, possui_etiqueta')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao carregar tipos de estoque: ${error.message}`);
    }

    return (data ?? []).map((record) => this.mapRecord(record));
  }

  public async findByName(nome: string): Promise<TipoEstoqueDTO | null> {
    const client = this.resolveClient();

    const { data, error } = await client
      .from('tipos_estoque')
      .select('id, nome, ativo, possui_etiqueta')
      .eq('ativo', true)
      .ilike('nome', nome)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(`Erro ao buscar tipo de estoque: ${error.message}`);
    }

    return this.mapRecord(data);
  }

  public async findById(id: string): Promise<TipoEstoqueDTO | null> {
    const client = this.resolveClient();

    const { data, error } = await client
      .from('tipos_estoque')
      .select('id, nome, ativo, possui_etiqueta')
      .eq('id', id)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar tipo de estoque por ID: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRecord(data);
  }

  private resolveClient(): SupabaseClient<Database> {
    return this.factory.createServiceRoleClient();
  }

  private mapRecord(
    record: Pick<TipoEstoqueRecord, 'id' | 'nome' | 'ativo' | 'possui_etiqueta'>,
  ): TipoEstoqueDTO {
    return {
      id: record.id,
      nome: record.nome,
      ativo: record.ativo,
      possuiEtiqueta: record.possui_etiqueta,
    };
  }
}

export const tiposEstoqueService = new TiposEstoqueService();


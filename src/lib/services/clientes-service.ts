import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';

export type ClienteRecord = Tables<'clientes'>;

export type ClienteDTO = {
  readonly id: string;
  readonly nomeFantasia: string;
  readonly razaoSocial: string;
  readonly tipoEstoqueId: string | null;
  readonly ativo: boolean | null;
};

export class ClientesService {
  private readonly factory: SupabaseClientFactory;

  constructor(factory: SupabaseClientFactory = supabaseClientFactory) {
    this.factory = factory;
  }

  public async findByName(nome: string): Promise<ClienteDTO | null> {
    const client = this.resolveClient();
    const nomeNormalizado = nome.trim();

    // Tentar buscar por nome_fantasia primeiro
    let { data, error } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, tipo_estoque_id, ativo')
      .eq('ativo', true)
      .ilike('nome_fantasia', nomeNormalizado)
      .limit(1)
      .maybeSingle();

    // Se não encontrar por nome_fantasia, tentar por razao_social
    if (!data && error?.code === 'PGRST116') {
      const result = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, tipo_estoque_id, ativo')
        .eq('ativo', true)
        .ilike('razao_social', nomeNormalizado)
        .limit(1)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRecord(data);
  }

  public async findByStockTypeName(
    tipoEstoqueNome: string,
  ): Promise<ClienteDTO[]> {
    const client = this.resolveClient();

    // Primeiro, buscar o tipo de estoque pelo nome para obter o ID
    const { data: tipoEstoque, error: tipoError } = await client
      .from('tipos_estoque')
      .select('id')
      .eq('ativo', true)
      .ilike('nome', tipoEstoqueNome)
      .limit(1)
      .maybeSingle();

    if (tipoError || !tipoEstoque) {
      return [];
    }

    // Buscar clientes que têm esse tipo_estoque_id
    const { data, error } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, tipo_estoque_id, ativo')
      .eq('ativo', true)
      .eq('tipo_estoque_id', tipoEstoque.id)
      .order('nome_fantasia', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return (data ?? []).map((record) => this.mapRecord(record));
  }

  private resolveClient(): SupabaseClient<Database> {
    return this.factory.createServiceRoleClient();
  }

  private mapRecord(
    record: Pick<
      ClienteRecord,
      'id' | 'nome_fantasia' | 'razao_social' | 'tipo_estoque_id' | 'ativo'
    >,
  ): ClienteDTO {
    return {
      id: record.id,
      nomeFantasia: record.nome_fantasia,
      razaoSocial: record.razao_social,
      tipoEstoqueId: record.tipo_estoque_id,
      ativo: record.ativo,
    };
  }
}

export const clientesService = new ClientesService();

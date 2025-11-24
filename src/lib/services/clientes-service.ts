import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';
import { tiposEstoqueService } from './tipos-estoque-service';

export type ClienteRecord = Tables<'clientes'>;

export type ClienteDTO = {
  readonly id: string;
  readonly nomeFantasia: string;
  readonly razaoSocial: string;
  readonly erpCodigo: string;
  readonly tipoEstoqueId?: string | null;
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
      .select('id, nome_fantasia, razao_social, erp_codigo')
      .ilike('nome_fantasia', nomeNormalizado)
      .limit(1)
      .maybeSingle();

    // Se não encontrar por nome_fantasia, tentar por razao_social
    if (!data && !error) {
      const result = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo')
        .ilike('razao_social', nomeNormalizado)
        .limit(1)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    }

    // Se não encontrar, tentar por erp_codigo se parecer ser um código
    if (!data && !error && /^\d+$/.test(nomeNormalizado)) {
      const result = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo')
        .eq('erp_codigo', nomeNormalizado)
        .limit(1)
        .maybeSingle();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(`Erro ao buscar cliente: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapCliente(data);
  }

  public async findByStockTypeId(stockTypeId: string): Promise<ClienteDTO[]> {
    // Como a tabela clientes não tem tipo_estoque_id diretamente,
    // vamos buscar clientes que tenham o nome do tipo de estoque
    // igual ao nome_fantasia ou razao_social
    const tipoEstoque = await tiposEstoqueService.findById(stockTypeId);
    
    if (!tipoEstoque) {
      return [];
    }

    return this.findByStockTypeName(tipoEstoque.nome);
  }

  public async findByStockTypeName(stockTypeName: string): Promise<ClienteDTO[]> {
    // Buscar clientes onde o nome_fantasia ou razao_social corresponde ao nome do tipo de estoque
    const client = this.resolveClient();
    const nomeNormalizado = stockTypeName.trim();

    // Buscar por nome_fantasia
    const { data: dataFantasia, error: errorFantasia } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, erp_codigo')
      .ilike('nome_fantasia', `%${nomeNormalizado}%`)
      .eq('ativo', true);

    // Buscar por razao_social
    const { data: dataSocial, error: errorSocial } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, erp_codigo')
      .ilike('razao_social', `%${nomeNormalizado}%`)
      .eq('ativo', true);

    if (errorFantasia || errorSocial) {
      const errorMsg = errorFantasia?.message || errorSocial?.message || 'Erro desconhecido';
      throw new Error(`Erro ao buscar clientes por tipo de estoque: ${errorMsg}`);
    }

    // Combinar resultados e remover duplicatas
    const allRecords = [...(dataFantasia ?? []), ...(dataSocial ?? [])];
    const uniqueRecords = Array.from(
      new Map(allRecords.map((r) => [r.id, r])).values()
    );

    return uniqueRecords.map((record) => this.mapCliente(record));
  }

  private resolveClient(): SupabaseClient<Database> {
    return this.factory.createServiceRoleClient();
  }

  private mapCliente(record: Pick<ClienteRecord, 'id' | 'nome_fantasia' | 'razao_social' | 'erp_codigo'>): ClienteDTO {
    return {
      id: record.id,
      nomeFantasia: record.nome_fantasia,
      razaoSocial: record.razao_social,
      erpCodigo: record.erp_codigo,
      tipoEstoqueId: null,
    };
  }
}

export const clientesService = new ClientesService();


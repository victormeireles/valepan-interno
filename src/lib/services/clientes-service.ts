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
    const tipoEstoque = await tiposEstoqueService.findById(stockTypeId);
    
    if (!tipoEstoque) {
      return [];
    }

    return this.findByStockTypeName(tipoEstoque.nome);
  }

  public async findByStockTypeName(stockTypeName: string): Promise<ClienteDTO[]> {
    const client = this.resolveClient();
    const nomeNormalizado = stockTypeName.trim();

    // Buscar clientes cujo nome_fantasia corresponde ao nome do tipo de estoque
    const { data: dataFantasia, error: errorFantasia } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, erp_codigo')
      .ilike('nome_fantasia', `%${nomeNormalizado}%`)
      .eq('ativo', true);

    if (errorFantasia) {
      throw new Error(`Erro ao buscar clientes por tipo de estoque: ${errorFantasia.message}`);
    }

    // Buscar clientes cujo razao_social corresponde ao nome do tipo de estoque
    const { data: dataRazao, error: errorRazao } = await client
      .from('clientes')
      .select('id, nome_fantasia, razao_social, erp_codigo')
      .ilike('razao_social', `%${nomeNormalizado}%`)
      .eq('ativo', true);

    if (errorRazao) {
      throw new Error(`Erro ao buscar clientes por tipo de estoque: ${errorRazao.message}`);
    }

    // Combinar resultados e remover duplicatas
    const allRecords = [...(dataFantasia || []), ...(dataRazao || [])];
    const uniqueRecords = Array.from(
      new Map(allRecords.map((record) => [record.id, record])).values()
    );

    if (uniqueRecords.length === 0) {
      return [];
    }

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


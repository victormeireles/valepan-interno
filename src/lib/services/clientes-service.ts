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

    // Primeiro, buscar o tipo de estoque pelo nome
    const tipoEstoque = await tiposEstoqueService.findByName(nomeNormalizado);
    
    if (tipoEstoque) {
      // Se encontrou o tipo de estoque, tentar buscar clientes pelo tipo_estoque_id
      // Como o campo pode não existir no schema TypeScript, vamos usar uma abordagem segura
      try {
        // Usar type assertion para permitir acesso ao campo que pode não estar no schema
        const queryBuilder = client
          .from('clientes')
          .select('id, nome_fantasia, razao_social, erp_codigo')
          .eq('ativo', true) as unknown as {
          eq: (column: string, value: string) => Promise<{
            data: Array<Pick<ClienteRecord, 'id' | 'nome_fantasia' | 'razao_social' | 'erp_codigo'>> | null;
            error: { message: string; code?: string } | null;
          }>;
        };
        
        const result = await queryBuilder.eq('tipo_estoque_id', tipoEstoque.id);
        
        if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
          // Retornar clientes encontrados pelo tipo_estoque_id
          return result.data.map((record) => this.mapCliente(record));
        }
      } catch (error) {
        // Se houver erro (provavelmente campo não existe), continuar com fallback
        // Verificar se é erro de coluna não encontrada
        const errorObj = error as { message?: string; code?: string };
        const errorMessage = errorObj?.message || String(error || '');
        const errorCode = errorObj?.code || '';
        if (
          errorMessage.includes('tipo_estoque_id') || 
          errorCode === '42703' || 
          (errorMessage.includes('column') && errorMessage.includes('does not exist'))
        ) {
          // Campo não existe, usar fallback silenciosamente
        } else {
          // Outro tipo de erro, logar mas continuar
          console.warn(`Erro ao buscar clientes por tipo_estoque_id: ${errorMessage}`);
        }
      }
    }

    // Fallback: Buscar clientes cujo nome_fantasia corresponde ao nome do tipo de estoque
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

  private mapCliente(record: Pick<ClienteRecord, 'id' | 'nome_fantasia' | 'razao_social' | 'erp_codigo'> & { tipo_estoque_id?: string | null }): ClienteDTO {
    return {
      id: record.id,
      nomeFantasia: record.nome_fantasia,
      razaoSocial: record.razao_social,
      erpCodigo: record.erp_codigo,
      tipoEstoqueId: 'tipo_estoque_id' in record ? record.tipo_estoque_id ?? null : null,
    };
  }
}

export const clientesService = new ClientesService();


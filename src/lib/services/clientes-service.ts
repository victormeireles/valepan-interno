import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';
import { tiposEstoqueService } from './tipos-estoque-service';

export type ClienteRecord = Tables<'clientes'>;
export type EnderecoEntregaRecord = Tables<'enderecos_entrega'>;

export type ClienteDTO = {
  readonly id: string;
  readonly nomeFantasia: string;
  readonly razaoSocial: string;
  readonly erpCodigo: string;
  readonly tipoEstoqueId?: string | null;
};

export type EnderecoEntregaDTO = {
  readonly id: string;
  readonly nome: string;
  readonly clienteId: string;
};

export type ClienteComEnderecosDTO = {
  readonly id: string;
  readonly nomeFantasia: string;
  readonly razaoSocial: string;
  readonly erpCodigo: string;
  readonly tipoEstoqueId?: string | null;
  readonly enderecos: readonly EnderecoEntregaDTO[];
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
      .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
      .ilike('nome_fantasia', nomeNormalizado)
      .limit(1)
      .maybeSingle();

    // Se não encontrar por nome_fantasia, tentar por razao_social
    if (!data && !error) {
      const result = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
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
        .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
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
    const clientesComEnderecos = await this.findByStockTypeNameWithAddresses(stockTypeName);
    return clientesComEnderecos.map((cliente) => ({
      id: cliente.id,
      nomeFantasia: cliente.nomeFantasia,
      razaoSocial: cliente.razaoSocial,
      erpCodigo: cliente.erpCodigo,
      tipoEstoqueId: cliente.tipoEstoqueId,
    }));
  }

  public async findByStockTypeNameWithAddresses(stockTypeName: string): Promise<ClienteComEnderecosDTO[]> {
    const client = this.resolveClient();
    const nomeNormalizado = stockTypeName.trim();

    // Primeiro, buscar o tipo de estoque pelo nome
    const tipoEstoque = await tiposEstoqueService.findByName(nomeNormalizado);
    
    let clientesRecords: Array<Pick<ClienteRecord, 'id' | 'nome_fantasia' | 'razao_social' | 'erp_codigo'> & { tipo_estoque_id?: string | null }> = [];

    if (tipoEstoque) {
      // Se encontrou o tipo de estoque, tentar buscar clientes pelo tipo_estoque_id
      const { data: dataTipoEstoque, error: errorTipoEstoque } = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
        .eq('ativo', true)
        .eq('tipo_estoque_id', tipoEstoque.id);
      
      if (!errorTipoEstoque && dataTipoEstoque && dataTipoEstoque.length > 0) {
        clientesRecords = dataTipoEstoque;
      }
    }

    // Fallback: Buscar clientes cujo nome_fantasia corresponde ao nome do tipo de estoque
    if (clientesRecords.length === 0) {
      const { data: dataFantasia, error: errorFantasia } = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
        .ilike('nome_fantasia', `%${nomeNormalizado}%`)
        .eq('ativo', true);

      if (errorFantasia) {
        throw new Error(`Erro ao buscar clientes por tipo de estoque: ${errorFantasia.message}`);
      }

      // Buscar clientes cujo razao_social corresponde ao nome do tipo de estoque
      const { data: dataRazao, error: errorRazao } = await client
        .from('clientes')
        .select('id, nome_fantasia, razao_social, erp_codigo, tipo_estoque_id')
        .ilike('razao_social', `%${nomeNormalizado}%`)
        .eq('ativo', true);

      if (errorRazao) {
        throw new Error(`Erro ao buscar clientes por tipo de estoque: ${errorRazao.message}`);
      }

      // Combinar resultados e remover duplicatas
      const allRecords = [...(dataFantasia || []), ...(dataRazao || [])];
      clientesRecords = Array.from(
        new Map(allRecords.map((record) => [record.id, record])).values()
      );
    }

    if (clientesRecords.length === 0) {
      return [];
    }

    // Buscar endereços de entrega para todos os clientes de uma vez
    const clienteIds = clientesRecords.map((c) => c.id);
    const { data: enderecosData, error: enderecosError } = await client
      .from('enderecos_entrega')
      .select('id, nome, cliente_id')
      .in('cliente_id', clienteIds);

    if (enderecosError) {
      throw new Error(`Erro ao buscar endereços de entrega: ${enderecosError.message}`);
    }

    // Agrupar endereços por cliente_id
    const enderecosPorCliente = new Map<string, EnderecoEntregaDTO[]>();
    (enderecosData || []).forEach((endereco) => {
      const enderecoDTO: EnderecoEntregaDTO = {
        id: endereco.id,
        nome: endereco.nome,
        clienteId: endereco.cliente_id,
      };
      const enderecos = enderecosPorCliente.get(endereco.cliente_id) || [];
      enderecos.push(enderecoDTO);
      enderecosPorCliente.set(endereco.cliente_id, enderecos);
    });

    // Mapear clientes com seus endereços
    return clientesRecords.map((record) => {
      const cliente = this.mapCliente(record);
      const enderecos = enderecosPorCliente.get(record.id) || [];
      return {
        ...cliente,
        enderecos,
      };
    });
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


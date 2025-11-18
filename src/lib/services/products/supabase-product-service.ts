import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';

export type ProductRecord = Tables<'produtos'>;

export type ProductDTO = {
  readonly id: string;
  readonly nome: string;
  readonly unidade: string;
  readonly unidadeDescricao: string | null;
  readonly codigo: string;
  readonly unitBarcode: string | null;
  readonly boxUnits: number | null;
  readonly packageUnits: number | null;
  readonly unitWeight: number | null;
};

type ProductFilters = {
  readonly includeInactive?: boolean;
};

export class SupabaseProductService {
  private readonly factory: SupabaseClientFactory;

  constructor(factory: SupabaseClientFactory = supabaseClientFactory) {
    this.factory = factory;
  }

  public async listProducts(filters?: ProductFilters): Promise<ProductDTO[]> {
    const client = this.resolveClient();
    const query = client
      .from('produtos')
      .select(
        'id, nome, unidade, unidade_descricao, codigo, unit_barcode, box_units, package_units, unit_weight, ativo',
      )
      .order('nome', { ascending: true });

    if (!filters?.includeInactive) {
      query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao carregar produtos: ${error.message}`);
    }

    return (data ?? []).map((record) => this.mapRecord(record));
  }

  public async findByName(nome: string): Promise<ProductDTO | null> {
    const client = this.resolveClient();

    const { data, error } = await client
      .from('produtos')
      .select(
        'id, nome, unidade, unidade_descricao, codigo, unit_barcode, box_units, package_units, unit_weight, ativo',
      )
      .eq('ativo', true)
      .ilike('nome', nome)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(`Erro ao buscar produto: ${error.message}`);
    }

    return this.mapRecord(data);
  }

  private resolveClient(): SupabaseClient<Database> {
    return this.factory.createServiceRoleClient();
  }

  private mapRecord(record: Pick<ProductRecord, 'id' | 'nome' | 'unidade' | 'unidade_descricao' | 'codigo' | 'unit_barcode' | 'box_units' | 'package_units' | 'unit_weight'>): ProductDTO {
    return {
      id: record.id,
      nome: record.nome,
      unidade: record.unidade,
      unidadeDescricao: record.unidade_descricao,
      codigo: record.codigo,
      unitBarcode: record.unit_barcode,
      boxUnits: record.box_units,
      packageUnits: record.package_units,
      unitWeight: record.unit_weight,
    };
  }
}



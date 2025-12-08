import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory, supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database, Tables } from '@/types/database';

export type ProductRecord = Tables<'produtos'>;

export type ProductDTO = {
  readonly id: string;
  readonly nome: string;
  readonly unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
  readonly codigo: string;
  readonly unitBarcode: string | null;
  readonly boxUnits: number | null;
  readonly packageUnits: number | null;
  readonly unitWeight: number | null;
  readonly unidadesAssadeira: number | null;
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
        'id, nome, unidade_padrao_id, codigo, unit_barcode, box_units, package_units, unit_weight, unidades_assadeira, ativo, unidades (nome_resumido)',
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
        'id, nome, unidade_padrao_id, codigo, unit_barcode, box_units, package_units, unit_weight, unidades_assadeira, ativo, unidades (nome_resumido)',
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

  private mapRecord(record: {
    id: string;
    nome: string;
    unidade_padrao_id: string | null;
    package_units: number | null;
    box_units: number | null;
    unidades_assadeira: number | null;
    unidades?: { nome_resumido?: string } | null;
    [key: string]: unknown;
  }): ProductDTO {
    // Extrair nome_resumido do join com unidades
    const unidades = record.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    return {
      id: record.id,
      nome: record.nome,
      unidadeNomeResumido,
      codigo: (record.codigo as string) || '',
      unitBarcode: (record.unit_barcode as string | null) || null,
      boxUnits: (record.box_units as number | null) || null,
      packageUnits: (record.package_units as number | null) || null,
      unitWeight: (record.unit_weight as number | null) || null,
      unidadesAssadeira: (record.unidades_assadeira as number | null) || null,
    };
  }
}



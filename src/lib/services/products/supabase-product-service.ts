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

type ProdutoRowComUnidadeSlot = {
  id: string;
  nome: string;
  unidade_padrao_id: string | null;
  codigo: string;
  unit_barcode: string | null;
  box_units: number | null;
  package_units: number | null;
  unit_weight: number | null;
  unidades_assadeira: number | null;
  ativo: boolean;
  unidades?: { nome_resumido?: string } | null;
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
        'id, nome, unidade_padrao_id, codigo, unit_barcode, box_units, package_units, unit_weight, unidades_assadeira, ativo',
      )
      .order('nome', { ascending: true });

    if (!filters?.includeInactive) {
      query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao carregar produtos: ${error.message}`);
    }

    const rows = (data ?? []) as ProdutoRowComUnidadeSlot[];
    await this.hydrateUnidadesNomeResumido(client, rows);
    return rows.map((record) => this.mapRecord(record));
  }

  public async findByName(nome: string): Promise<ProductDTO | null> {
    const client = this.resolveClient();

    const { data, error } = await client
      .from('produtos')
      .select(
        'id, nome, unidade_padrao_id, codigo, unit_barcode, box_units, package_units, unit_weight, unidades_assadeira, ativo',
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

    const rows = [data as ProdutoRowComUnidadeSlot];
    await this.hydrateUnidadesNomeResumido(client, rows);
    return this.mapRecord(rows[0]);
  }

  private resolveClient(): SupabaseClient<Database, 'public'> {
    return this.factory.createServiceRoleClient();
  }

  /** Preenche `record.unidades` a partir de `unidade_padrao_id` (sem embed PostgREST — compatível com schema `interno`). */
  private async hydrateUnidadesNomeResumido(
    client: SupabaseClient<Database, 'public'>,
    records: ProdutoRowComUnidadeSlot[],
  ): Promise<void> {
    const uids = [
      ...new Set(records.map((r) => r.unidade_padrao_id).filter((id): id is string => Boolean(id?.trim()))),
    ];
    if (uids.length === 0) {
      for (const r of records) {
        r.unidades = null;
      }
      return;
    }
    const { data: unRows } = await client.from('unidades').select('id, nome_resumido').in('id', uids);
    const nomeById = new Map((unRows ?? []).map((u) => [u.id, u.nome_resumido ?? '']));
    for (const r of records) {
      r.unidades = r.unidade_padrao_id
        ? { nome_resumido: nomeById.get(r.unidade_padrao_id) ?? '' }
        : null;
    }
  }

  private mapRecord(record: {
    id: string;
    nome: string;
    codigo: string;
    unit_barcode: string | null;
    unidade_padrao_id: string | null;
    package_units: number | null;
    box_units: number | null;
    unit_weight: number | null;
    unidades_assadeira: number | null;
    unidades?: { nome_resumido?: string } | null;
  }): ProductDTO {
    // Extrair nome_resumido do join com unidades
    const unidades = record.unidades as { nome_resumido?: string } | null;
    const unidadeNomeResumido = unidades?.nome_resumido || null;

    return {
      id: record.id,
      nome: record.nome,
      unidadeNomeResumido,
      codigo: record.codigo,
      unitBarcode: record.unit_barcode,
      boxUnits: record.box_units,
      packageUnits: record.package_units,
      unitWeight: record.unit_weight,
      unidadesAssadeira: record.unidades_assadeira,
    };
  }
}



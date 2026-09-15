import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoNfMovimentoEntrada } from '@/domain/insumos/insumo-nf-detalhe';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const ENTRADA_NF_SELECT =
  'id, empresa_id, insumo_id, numero_nf, omie_n_id_receb, omie_n_id_item, created_at, delta_quantidade, custo_unitario';

type InsumoEntradaNfRow = {
  empresa_id: string | null;
  insumo_id: string | null;
  numero_nf: string | null;
  omie_n_id_receb: number | null;
  omie_n_id_item: number | null;
  created_at: string;
  delta_quantidade: number;
  custo_unitario: number;
  id: string;
};

export type InsumoEntradaNfResumo = {
  empresaId: string;
  insumoId: string;
  numeroNf: string | null;
  omieNIdReceb: number | null;
  omieNIdItem: number | null;
  createdAt: string;
  deltaQuantidade: number;
  custoUnitario: number;
  id: string;
};

export class InsumoMovimentoNfConsultaRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listResumosEntradaNf(): Promise<InsumoEntradaNfResumo[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select(ENTRADA_NF_SELECT)
      .eq('origem', 'entrada_nf');

    if (error) {
      throw new Error(`Erro ao listar entradas NF de insumos: ${error.message}`);
    }

    return ((data ?? []) as InsumoEntradaNfRow[])
      .filter(
        (row): row is InsumoEntradaNfRow & { empresa_id: string; insumo_id: string } =>
          row.empresa_id !== null && row.insumo_id !== null,
      )
      .map((row) => ({
        ...this.mapEntrada(row),
        empresaId: row.empresa_id,
        insumoId: row.insumo_id,
      }));
  }

  async listEntradasPorEmpresaInsumo(
    empresaId: string,
    insumoId: string,
  ): Promise<InsumoNfMovimentoEntrada[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select(ENTRADA_NF_SELECT)
      .eq('empresa_id', empresaId)
      .eq('insumo_id', insumoId)
      .eq('origem', 'entrada_nf');

    if (error) {
      throw new Error(`Erro ao listar entradas NF do insumo: ${error.message}`);
    }

    return ((data ?? []) as InsumoEntradaNfRow[]).map((row) => this.mapEntrada(row));
  }

  private mapEntrada(row: InsumoEntradaNfRow): InsumoNfMovimentoEntrada {
    return {
      id: row.id,
      createdAt: row.created_at,
      numeroNf: row.numero_nf,
      deltaQuantidade: Number(row.delta_quantidade),
      custoUnitario: Number(row.custo_unitario),
      omieNIdReceb: row.omie_n_id_receb,
      omieNIdItem: row.omie_n_id_item,
    };
  }
}

export const insumoMovimentoNfConsultaRepository =
  new InsumoMovimentoNfConsultaRepository();

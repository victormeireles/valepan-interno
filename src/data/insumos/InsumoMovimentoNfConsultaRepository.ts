import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoNfMovimentoEntrada } from '@/domain/insumos/insumo-nf-detalhe';
import { idListChunker } from '@/data/insumos/IdListChunker';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

const ENTRADA_NF_DETALHE_SELECT =
  'id, empresa_id, insumo_id, numero_nf, omie_n_id_receb, omie_n_id_item, created_at, delta_quantidade, custo_unitario';

const ENTRADA_NF_NUMERO_SELECT = 'empresa_id, insumo_id, numero_nf';

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

type InsumoEntradaNfNumeroRow = {
  empresa_id: string | null;
  insumo_id: string | null;
  numero_nf: string | null;
};

/** Resumo leve só para enriquecer busca/contagem de NFs nos vínculos. */
export type InsumoEntradaNfNumeroResumo = {
  empresaId: string;
  insumoId: string;
  numeroNf: string;
};

export class InsumoMovimentoNfConsultaRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listNumerosNfPorInsumos(insumoIds: string[]): Promise<InsumoEntradaNfNumeroResumo[]> {
    const chunks = idListChunker.chunk(insumoIds);
    if (chunks.length === 0) {
      return [];
    }

    const rows: InsumoEntradaNfNumeroResumo[] = [];

    for (const chunk of chunks) {
      const { data, error } = await this.db
        .from('insumo_movimentos')
        .select(ENTRADA_NF_NUMERO_SELECT)
        .eq('origem', 'entrada_nf')
        .in('insumo_id', chunk)
        .not('numero_nf', 'is', null);

      if (error) {
        throw new Error(`Erro ao listar números de NF de insumos: ${error.message}`);
      }

      for (const row of (data ?? []) as InsumoEntradaNfNumeroRow[]) {
        if (!row.empresa_id || !row.insumo_id || !row.numero_nf) continue;
        rows.push({
          empresaId: row.empresa_id,
          insumoId: row.insumo_id,
          numeroNf: row.numero_nf,
        });
      }
    }

    return rows;
  }

  async listEntradasPorEmpresaInsumo(
    empresaId: string,
    insumoId: string,
  ): Promise<InsumoNfMovimentoEntrada[]> {
    const { data, error } = await this.db
      .from('insumo_movimentos')
      .select(ENTRADA_NF_DETALHE_SELECT)
      .eq('empresa_id', empresaId)
      .eq('insumo_id', insumoId)
      .eq('origem', 'entrada_nf');

    if (error) {
      throw new Error(`Erro ao listar entradas NF do insumo: ${error.message}`);
    }

    return ((data ?? []) as InsumoEntradaNfRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      numeroNf: row.numero_nf,
      deltaQuantidade: Number(row.delta_quantidade),
      custoUnitario: Number(row.custo_unitario),
      omieNIdReceb: row.omie_n_id_receb,
      omieNIdItem: row.omie_n_id_item,
    }));
  }
}

export const insumoMovimentoNfConsultaRepository =
  new InsumoMovimentoNfConsultaRepository();

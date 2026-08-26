import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoRegraCompraRow } from '@/domain/types/insumo-compra-db';
import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';
import {
  resolveInsumoConversaoVisual,
  resolveUnidadeResumida,
} from '@/domain/insumos/insumo-conversao-params';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export type InsumoRegraCompraComInsumo = InsumoRegraCompraRow & {
  nome: string;
  unidade: string;
  conversao: InsumoConversaoVisual | null;
};

type RegraWithInsumoJoin = InsumoRegraCompraRow & {
  insumos: {
    nome: string;
    conversao_fator: number | null;
    unidades: { nome_resumido: string } | { nome_resumido: string }[] | null;
    conversao_unidades: { nome_resumido: string } | { nome_resumido: string }[] | null;
  } | null;
};

export class InsumoRegraCompraRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listAtivas(): Promise<InsumoRegraCompraRow[]> {
    const { data, error } = await this.db
      .from('insumo_regra_compra')
      .select('*')
      .eq('ativo', true)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar regras de compra ativas: ${error.message}`);
    }

    return (data as InsumoRegraCompraRow[]) ?? [];
  }

  async listAll(): Promise<InsumoRegraCompraRow[]> {
    const { data, error } = await this.db
      .from('insumo_regra_compra')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar regras de compra: ${error.message}`);
    }

    return (data as InsumoRegraCompraRow[]) ?? [];
  }

  async listAllWithInsumo(): Promise<InsumoRegraCompraComInsumo[]> {
    const { data, error } = await this.db
      .from('insumo_regra_compra')
      .select(
        `*, insumos(
          nome,
          conversao_fator,
          unidades!insumos_unidade_id_fkey(nome_resumido),
          conversao_unidades:unidades!insumos_conversao_unidade_id_fkey(nome_resumido)
        )`,
      )
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar regras de compra com insumo: ${error.message}`);
    }

    return ((data as RegraWithInsumoJoin[]) ?? []).map((row) => this.toRegraComInsumo(row));
  }

  async getByInsumoId(insumoId: string): Promise<InsumoRegraCompraRow | null> {
    const { data, error } = await this.db
      .from('insumo_regra_compra')
      .select('*')
      .eq('insumo_id', insumoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar regra de compra: ${error.message}`);
    }

    return data as InsumoRegraCompraRow | null;
  }

  async upsert(
    row: Omit<InsumoRegraCompraRow, 'created_at' | 'updated_at'> & { updated_at?: string },
  ): Promise<InsumoRegraCompraRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('insumo_regra_compra')
      .upsert(
        {
          insumo_id: row.insumo_id,
          lead_time_dias: row.lead_time_dias,
          janela_tipo: row.janela_tipo,
          dias_semana: row.dias_semana,
          quantidade_minima: row.quantidade_minima,
          quantidade_maxima: row.quantidade_maxima,
          ativo: row.ativo,
          updated_at: row.updated_at ?? now,
        },
        { onConflict: 'insumo_id' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao salvar regra de compra: ${error.message}`);
    }

    return data as InsumoRegraCompraRow;
  }

  private toRegraComInsumo(row: RegraWithInsumoJoin): InsumoRegraCompraComInsumo {
    const unidade = resolveUnidadeResumida(row.insumos?.unidades);
    const conversao = resolveInsumoConversaoVisual({
      conversaoFator: row.insumos?.conversao_fator,
      conversaoUnidade: row.insumos?.conversao_unidades,
    });

    return {
      insumo_id: row.insumo_id,
      lead_time_dias: row.lead_time_dias,
      janela_tipo: row.janela_tipo,
      dias_semana: row.dias_semana,
      quantidade_minima: row.quantidade_minima,
      quantidade_maxima: row.quantidade_maxima,
      ativo: row.ativo,
      created_at: row.created_at,
      updated_at: row.updated_at,
      nome: row.insumos?.nome ?? '',
      unidade,
      conversao,
    };
  }
}

export const insumoRegraCompraRepository = new InsumoRegraCompraRepository();

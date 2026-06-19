import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CriarIntegracaoInsumoInput,
  IntegracaoInsumoComEmpresa,
  IntegracaoInsumoRow,
} from '@/domain/types/insumo-estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type IntegracaoWithEmpresa = IntegracaoInsumoRow & {
  empresas: { nome: string } | null;
};

export class InsumoMapeamentoRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async findByEmpresaProduto(
    empresaId: string,
    omieIdProduto: number,
  ): Promise<IntegracaoInsumoRow | null> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('omie_id_produto', omieIdProduto)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar mapeamento de insumo: ${error.message}`);
    }

    return data as IntegracaoInsumoRow | null;
  }

  async create(input: CriarIntegracaoInsumoInput): Promise<IntegracaoInsumoRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('integracao_insumos')
      .insert({
        empresa_id: input.empresaId,
        omie_id_produto: input.omieIdProduto,
        omie_codigo_produto: input.omieCodigoProduto,
        insumo_id: input.insumoId,
        fator_conversao: input.fatorConversao,
        descricao_omie: input.descricaoOmie ?? null,
        ativo: true,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar mapeamento de insumo: ${error.message}`);
    }

    return data as IntegracaoInsumoRow;
  }

  async listByInsumo(insumoId: string): Promise<IntegracaoInsumoComEmpresa[]> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*, empresas(nome)')
      .eq('insumo_id', insumoId)
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar mapeamentos do insumo: ${error.message}`);
    }

    return (data as IntegracaoWithEmpresa[] ?? []).map((row) => ({
      ...(row as IntegracaoInsumoRow),
      empresaNome: row.empresas?.nome ?? '',
    }));
  }
}

export const insumoMapeamentoRepository = new InsumoMapeamentoRepository();

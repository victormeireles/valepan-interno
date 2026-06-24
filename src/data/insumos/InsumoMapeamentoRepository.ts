import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CriarIntegracaoInsumoInput,
  IntegracaoInsumoComEmpresa,
  IntegracaoInsumoListItem,
  IntegracaoInsumoRow,
} from '@/domain/types/insumo-estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type IntegracaoWithEmpresa = IntegracaoInsumoRow & {
  empresas: { nome: string } | null;
};

type IntegracaoWithDetalhes = IntegracaoInsumoRow & {
  empresas: { nome: string } | null;
  insumos: {
    nome: string;
    unidades: { codigo: string; nome_resumido: string } | null;
  } | null;
};

export type AtualizarIntegracaoInsumoInput = {
  insumoId: string;
  fatorConversao: number;
};

export class InsumoMapeamentoRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async findById(id: string): Promise<IntegracaoInsumoRow | null> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar mapeamento de insumo: ${error.message}`);
    }

    return data as IntegracaoInsumoRow | null;
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

  private async findByEmpresaProdutoIncludingInactive(
    empresaId: string,
    omieIdProduto: number,
  ): Promise<IntegracaoInsumoRow | null> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('omie_id_produto', omieIdProduto)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar mapeamento de insumo: ${error.message}`);
    }

    return data as IntegracaoInsumoRow | null;
  }

  async create(input: CriarIntegracaoInsumoInput): Promise<IntegracaoInsumoRow> {
    const existing = await this.findByEmpresaProdutoIncludingInactive(
      input.empresaId,
      input.omieIdProduto,
    );

    if (existing) {
      return this.update(existing.id, {
        insumoId: input.insumoId,
        fatorConversao: input.fatorConversao,
        omieCodigoProduto: input.omieCodigoProduto,
        descricaoOmie: input.descricaoOmie ?? existing.descricao_omie,
        reativar: true,
      });
    }

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

  async update(
    id: string,
    input: AtualizarIntegracaoInsumoInput & {
      omieCodigoProduto?: string | null;
      descricaoOmie?: string | null;
      reativar?: boolean;
    },
  ): Promise<IntegracaoInsumoRow> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      insumo_id: input.insumoId,
      fator_conversao: input.fatorConversao,
      updated_at: now,
    };

    if (input.omieCodigoProduto !== undefined) {
      payload.omie_codigo_produto = input.omieCodigoProduto;
    }

    if (input.descricaoOmie !== undefined) {
      payload.descricao_omie = input.descricaoOmie;
    }

    if (input.reativar) {
      payload.ativo = true;
    }

    const { data, error } = await this.db
      .from('integracao_insumos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar mapeamento de insumo: ${error.message}`);
    }

    return data as IntegracaoInsumoRow;
  }

  async desativar(id: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.db
      .from('integracao_insumos')
      .update({ ativo: false, updated_at: now })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir mapeamento de insumo: ${error.message}`);
    }
  }

  async listAtivosComDetalhes(): Promise<IntegracaoInsumoListItem[]> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*, empresas(nome), insumos(nome, unidades(codigo, nome_resumido))')
      .eq('ativo', true)
      .order('descricao_omie', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar vínculos de insumo: ${error.message}`);
    }

    return ((data as IntegracaoWithDetalhes[]) ?? []).map((row) => ({
      ...(row as IntegracaoInsumoRow),
      empresaNome: row.empresas?.nome ?? '',
      insumoNome: row.insumos?.nome ?? '',
      insumoUnidadeCodigo: row.insumos?.unidades?.codigo ?? null,
      insumoUnidadeNome: row.insumos?.unidades?.nome_resumido ?? null,
    }));
  }

  async countAtivos(): Promise<number> {
    const { count, error } = await this.db
      .from('integracao_insumos')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true);

    if (error) {
      throw new Error(`Erro ao contar vínculos de insumo: ${error.message}`);
    }

    return count ?? 0;
  }

  async listAtivos(limit = 30): Promise<IntegracaoInsumoRow[]> {
    const { data, error } = await this.db
      .from('integracao_insumos')
      .select('*')
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao listar mapeamentos ativos: ${error.message}`);
    }

    return (data as IntegracaoInsumoRow[]) ?? [];
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

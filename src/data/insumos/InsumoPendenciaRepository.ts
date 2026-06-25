import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CriarPendenciaInput,
  InsumoEntradaPendenciaRow,
  InsumoPendenciaComEmpresa,
  AtualizarEnriquecimentoPendenciaInput,
} from '@/domain/types/insumo-estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type PendenciaWithEmpresa = InsumoEntradaPendenciaRow & {
  empresas: { nome: string } | null;
};

export class InsumoPendenciaRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async findById(id: string): Promise<InsumoEntradaPendenciaRow | null> {
    const { data, error } = await this.db
      .from('insumo_entrada_pendencias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pendência de insumo: ${error.message}`);
    }

    return data as InsumoEntradaPendenciaRow | null;
  }

  async findByRecebimentoItem(
    empresaId: string,
    nIdReceb: number,
    nIdItem: number,
  ): Promise<InsumoEntradaPendenciaRow | null> {
    const { data, error } = await this.db
      .from('insumo_entrada_pendencias')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('omie_n_id_receb', nIdReceb)
      .eq('omie_n_id_item', nIdItem)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pendência de insumo: ${error.message}`);
    }

    return data as InsumoEntradaPendenciaRow | null;
  }

  async createPendente(input: CriarPendenciaInput): Promise<InsumoEntradaPendenciaRow> {
    const { data, error } = await this.db
      .from('insumo_entrada_pendencias')
      .insert({
        empresa_id: input.empresaId,
        omie_webhook_evento_id: input.omieWebhookEventoId ?? null,
        omie_n_id_receb: input.omieNIdReceb,
        omie_n_id_item: input.omieNIdItem,
        omie_id_produto: input.omieIdProduto,
        omie_codigo_produto: input.omieCodigoProduto,
        descricao_produto: input.descricaoProduto,
        quantidade_nf: input.quantidadeNf,
        unidade_nf: input.unidadeNf,
        preco_unit_nf: input.precoUnitNf,
        valor_total_item: input.valorTotalItem,
        numero_nf: input.numeroNf,
        data_emissao_nf: input.dataEmissaoNf,
        fornecedor_razao_social: input.fornecedorRazaoSocial ?? null,
        fornecedor_nome: input.fornecedorNome ?? null,
        fornecedor_cnpj: input.fornecedorCnpj ?? null,
        natureza_operacao: input.naturezaOperacao ?? null,
        valor_total_nf: input.valorTotalNf ?? null,
        cfop_entrada: input.cfopEntrada ?? null,
        ncm_produto: input.ncmProduto ?? null,
        status: 'pendente',
      })
      .select()
      .single();

    if (error?.code === '23505') {
      const existente = await this.findByRecebimentoItem(
        input.empresaId,
        input.omieNIdReceb,
        input.omieNIdItem,
      );
      if (existente) {
        return existente;
      }
    }

    if (error) {
      throw new Error(`Erro ao criar pendência de insumo: ${error.message}`);
    }

    return data as InsumoEntradaPendenciaRow;
  }

  async listPendentes(): Promise<InsumoPendenciaComEmpresa[]> {
    const { data, error } = await this.db
      .from('insumo_entrada_pendencias')
      .select('*, empresas(nome)')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar pendências de insumo: ${error.message}`);
    }

    return (data as PendenciaWithEmpresa[] ?? []).map((row) => ({
      ...(row as InsumoEntradaPendenciaRow),
      empresaNome: row.empresas?.nome ?? '',
    }));
  }

  async listIgnoradas(): Promise<InsumoPendenciaComEmpresa[]> {
    const { data, error } = await this.db
      .from('insumo_entrada_pendencias')
      .select('*, empresas(nome)')
      .eq('status', 'ignorado')
      .order('resolvido_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar pendências ignoradas: ${error.message}`);
    }

    return (data as PendenciaWithEmpresa[] ?? []).map((row) => ({
      ...(row as InsumoEntradaPendenciaRow),
      empresaNome: row.empresas?.nome ?? '',
    }));
  }

  async marcarPendente(id: string): Promise<void> {
    const { error } = await this.db
      .from('insumo_entrada_pendencias')
      .update({
        status: 'pendente',
        resolvido_em: null,
        integracao_insumo_id: null,
      })
      .eq('id', id)
      .eq('status', 'ignorado');

    if (error) {
      throw new Error(`Erro ao restaurar pendência de insumo: ${error.message}`);
    }
  }

  async marcarIgnorado(id: string): Promise<void> {
    const { error } = await this.db
      .from('insumo_entrada_pendencias')
      .update({
        status: 'ignorado',
        resolvido_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao ignorar pendência de insumo: ${error.message}`);
    }
  }

  async marcarResolvido(id: string, integracaoInsumoId: string): Promise<void> {
    const { error } = await this.db
      .from('insumo_entrada_pendencias')
      .update({
        status: 'resolvido',
        integracao_insumo_id: integracaoInsumoId,
        resolvido_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao resolver pendência de insumo: ${error.message}`);
    }
  }

  async countPendentes(): Promise<number> {
    const { count, error } = await this.db
      .from('insumo_entrada_pendencias')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    if (error) {
      throw new Error(`Erro ao contar pendências de insumo: ${error.message}`);
    }

    return count ?? 0;
  }

  async listParaEnriquecimento(input: {
    empresaId?: string;
    forcar?: boolean;
  }): Promise<InsumoEntradaPendenciaRow[]> {
    let query = this.db
      .from('insumo_entrada_pendencias')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true });

    if (input.empresaId) {
      query = query.eq('empresa_id', input.empresaId);
    }

    if (!input.forcar) {
      query = query.or('fornecedor_razao_social.is.null,cfop_entrada.is.null');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar pendências para enriquecimento: ${error.message}`);
    }

    return (data as InsumoEntradaPendenciaRow[]) ?? [];
  }

  async atualizarEnriquecimentoOmie(
    id: string,
    input: AtualizarEnriquecimentoPendenciaInput,
  ): Promise<void> {
    const { error } = await this.db
      .from('insumo_entrada_pendencias')
      .update({
        fornecedor_razao_social: input.fornecedorRazaoSocial ?? null,
        fornecedor_nome: input.fornecedorNome ?? null,
        fornecedor_cnpj: input.fornecedorCnpj ?? null,
        natureza_operacao: input.naturezaOperacao ?? null,
        valor_total_nf: input.valorTotalNf ?? null,
        cfop_entrada: input.cfopEntrada ?? null,
        ncm_produto: input.ncmProduto ?? null,
        numero_nf: input.numeroNf ?? undefined,
        data_emissao_nf: input.dataEmissaoNf ?? undefined,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar enriquecimento da pendência: ${error.message}`);
    }
  }
}

export const insumoPendenciaRepository = new InsumoPendenciaRepository();

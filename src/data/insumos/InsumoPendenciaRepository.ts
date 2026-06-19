import { SupabaseClient } from '@supabase/supabase-js';
import type {
  CriarPendenciaInput,
  InsumoEntradaPendenciaRow,
  InsumoPendenciaComEmpresa,
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
}

export const insumoPendenciaRepository = new InsumoPendenciaRepository();

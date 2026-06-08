import { SupabaseClient } from '@supabase/supabase-js';
import type { Quantidade } from '@/domain/types/inventario';
import type {
  EstoqueMovimentoOrigem,
  EstoqueMovimentoRecord,
  EstoqueSaldoRecord,
  ListMovimentosFilters,
  RegistrarMovimentoInput,
} from '@/domain/types/estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type SaldoRow = Database['public']['Tables']['estoque_saldos']['Row'];
type MovimentoRow = Database['public']['Tables']['estoque_movimentos']['Row'];

type ProdutoWithFamilia = {
  nome: string;
  produto_familia_id: string | null;
  ordem_na_familia: number;
  produto_familias: { nome_exibicao: string; ordem: number; imagem_url: string | null } | null;
};

type SaldoWithRelations = SaldoRow & {
  tipos_estoque: { nome: string } | null;
  produtos: ProdutoWithFamilia | null;
};

const SALDO_SELECT =
  '*, tipos_estoque(nome), produtos(nome, produto_familia_id, ordem_na_familia, produto_familias(nome_exibicao, ordem, imagem_url))';

type MovimentoWithRelations = MovimentoRow & {
  tipos_estoque: { nome: string } | null;
  produtos: { nome: string } | null;
};

function mapQuantidade(row: {
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
}): Quantidade {
  return {
    caixas: row.caixas,
    pacotes: row.pacotes,
    unidades: row.unidades,
    kg: Number(row.kg),
  };
}

export class EstoqueRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  async countSaldos(): Promise<number> {
    const { count, error } = await this.supabase
      .from('estoque_saldos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Erro ao contar saldos: ${error.message}`);
    }

    return count ?? 0;
  }

  async findSaldo(
    tipoEstoqueId: string,
    produtoId: string,
  ): Promise<SaldoRow | null> {
    const { data, error } = await this.supabase
      .from('estoque_saldos')
      .select('*')
      .eq('tipo_estoque_id', tipoEstoqueId)
      .eq('produto_id', produtoId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar saldo: ${error.message}`);
    }

    return data;
  }

  async upsertSaldo(
    tipoEstoqueId: string,
    produtoId: string,
    quantidade: Quantidade,
  ): Promise<SaldoRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('estoque_saldos')
      .upsert(
        {
          tipo_estoque_id: tipoEstoqueId,
          produto_id: produtoId,
          caixas: quantidade.caixas,
          pacotes: quantidade.pacotes,
          unidades: quantidade.unidades,
          kg: quantidade.kg,
          updated_at: now,
        },
        { onConflict: 'tipo_estoque_id,produto_id' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar saldo: ${error.message}`);
    }

    return data;
  }

  async insertMovimento(input: RegistrarMovimentoInput): Promise<MovimentoRow> {
    const { data, error } = await this.supabase
      .from('estoque_movimentos')
      .insert({
        tipo_estoque_id: input.tipoEstoqueId,
        produto_id: input.produtoId,
        delta_caixas: input.delta.caixas,
        delta_pacotes: input.delta.pacotes,
        delta_unidades: input.delta.unidades,
        delta_kg: input.delta.kg,
        saldo_caixas: input.saldo.caixas,
        saldo_pacotes: input.saldo.pacotes,
        saldo_unidades: input.saldo.unidades,
        saldo_kg: input.saldo.kg,
        origem: input.origem,
        embalagem_lote_id: input.embalagemLoteId ?? null,
        cliente: input.clienteDestino ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao registrar movimento: ${error.message}`);
    }

    return data;
  }

  async listAllSaldos(): Promise<EstoqueSaldoRecord[]> {
    const { data, error } = await this.supabase
      .from('estoque_saldos')
      .select(SALDO_SELECT)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar saldos: ${error.message}`);
    }

    return (data ?? []).map((row) => this.mapSaldoRow(row as SaldoWithRelations));
  }

  async listSaldosByTipoEstoque(tipoEstoqueId: string): Promise<EstoqueSaldoRecord[]> {
    const { data, error } = await this.supabase
      .from('estoque_saldos')
      .select(SALDO_SELECT)
      .eq('tipo_estoque_id', tipoEstoqueId);

    if (error) {
      throw new Error(`Erro ao listar saldos por tipo: ${error.message}`);
    }

    return (data ?? []).map((row) => this.mapSaldoRow(row as SaldoWithRelations));
  }

  async listMovimentos(filters: ListMovimentosFilters): Promise<EstoqueMovimentoRecord[]> {
    let query = this.supabase
      .from('estoque_movimentos')
      .select('*, tipos_estoque(nome), produtos(nome)')
      .order('created_at', { ascending: false })
      .limit(filters.limit ?? 100);

    if (filters.tipoEstoqueId) {
      query = query.eq('tipo_estoque_id', filters.tipoEstoqueId);
    }
    if (filters.produtoId) {
      query = query.eq('produto_id', filters.produtoId);
    }
    if (filters.origem) {
      query = query.eq('origem', filters.origem);
    }
    if (filters.de) {
      query = query.gte('created_at', filters.de);
    }
    if (filters.ate) {
      query = query.lte('created_at', filters.ate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar movimentos: ${error.message}`);
    }

    return (data ?? []).map((row) =>
      this.mapMovimentoRow(row as MovimentoWithRelations),
    );
  }

  private mapSaldoRow(row: SaldoWithRelations): EstoqueSaldoRecord {
    const produto = row.produtos;
    return {
      id: row.id,
      tipoEstoqueId: row.tipo_estoque_id,
      tipoEstoqueNome: row.tipos_estoque?.nome ?? '',
      produtoId: row.produto_id,
      produtoNome: produto?.nome ?? '',
      quantidade: mapQuantidade(row),
      updatedAt: row.updated_at,
      produtoFamiliaId: produto?.produto_familia_id ?? null,
      produtoFamiliaNome: produto?.produto_familias?.nome_exibicao ?? null,
      produtoFamiliaImagemUrl: produto?.produto_familias?.imagem_url ?? null,
      ordemFamilia: produto?.produto_familias?.ordem,
      ordemNaFamilia: produto?.ordem_na_familia,
    };
  }

  private mapMovimentoRow(row: MovimentoWithRelations): EstoqueMovimentoRecord {
    return {
      id: row.id,
      createdAt: row.created_at,
      tipoEstoqueId: row.tipo_estoque_id,
      tipoEstoqueNome: row.tipos_estoque?.nome ?? '',
      produtoId: row.produto_id,
      produtoNome: row.produtos?.nome ?? '',
      delta: {
        caixas: row.delta_caixas,
        pacotes: row.delta_pacotes,
        unidades: row.delta_unidades,
        kg: Number(row.delta_kg),
      },
      saldo: {
        caixas: row.saldo_caixas,
        pacotes: row.saldo_pacotes,
        unidades: row.saldo_unidades,
        kg: Number(row.saldo_kg),
      },
      origem: row.origem as EstoqueMovimentoOrigem,
      clienteDestino: row.cliente ?? null,
    };
  }
}

export const estoqueRepository = new EstoqueRepository();

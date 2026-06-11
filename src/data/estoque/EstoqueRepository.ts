import { SupabaseClient } from '@supabase/supabase-js';
import type { Quantidade } from '@/domain/types/inventario';
import type {
  EstoqueMovimentoOrigem,
  EstoqueMovimentoRecord,
  EstoqueSaldoRecord,
  ListMovimentosFilters,
  ListSaldosOptions,
  RegistrarMovimentoInput,
} from '@/domain/types/estoque-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type SaldoRow = Database['public']['Tables']['estoque_saldos']['Row'];
type MovimentoRow = Database['public']['Tables']['estoque_movimentos']['Row'];

type ProdutoWithFamilia = {
  nome: string;
  ativo: boolean;
  produto_familia_id: string | null;
  ordem_na_familia: number;
  produto_familias: { nome_exibicao: string; ordem: number; imagem_url: string | null } | null;
};

type SaldoWithRelations = SaldoRow & {
  tipos_estoque: { nome: string } | null;
  produtos: ProdutoWithFamilia | null;
};

const SALDO_SELECT =
  '*, tipos_estoque(nome), produtos(nome, ativo, produto_familia_id, ordem_na_familia, produto_familias(nome_exibicao, ordem, imagem_url))';

const SALDO_SELECT_APENAS_ATIVOS =
  '*, tipos_estoque(nome), produtos!inner(nome, ativo, produto_familia_id, ordem_na_familia, produto_familias(nome_exibicao, ordem, imagem_url))';

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

  async clearEmbalagemLoteId(embalagemLoteId: string): Promise<void> {
    const { error } = await this.supabase
      .from('estoque_movimentos')
      .update({ embalagem_lote_id: null })
      .eq('embalagem_lote_id', embalagemLoteId);

    if (error) {
      throw new Error(`Erro ao desvincular movimentos do lote: ${error.message}`);
    }
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

  async listAllSaldos(options?: ListSaldosOptions): Promise<EstoqueSaldoRecord[]> {
    const apenasAtivos = options?.apenasProdutosAtivos === true;

    let query = this.supabase
      .from('estoque_saldos')
      .select(apenasAtivos ? SALDO_SELECT_APENAS_ATIVOS : SALDO_SELECT)
      .order('updated_at', { ascending: false });

    if (apenasAtivos) {
      query = query.eq('produtos.ativo', true);
    }

    const { data, error } = await query;

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

  async findMovimentoById(id: string): Promise<EstoqueMovimentoRecord | null> {
    const { data, error } = await this.supabase
      .from('estoque_movimentos')
      .select('*, tipos_estoque(nome), produtos(nome)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar movimento: ${error.message}`);
    }

    return data ? this.mapMovimentoRow(data as MovimentoWithRelations) : null;
  }

  async listSaidasByDate(dateISO: string): Promise<EstoqueMovimentoRecord[]> {
    const inicio = `${dateISO}T00:00:00-03:00`;
    const fim = `${dateISO}T23:59:59.999-03:00`;

    const { data, error } = await this.supabase
      .from('estoque_movimentos')
      .select('*, tipos_estoque(nome), produtos(nome)')
      .eq('origem', 'saida')
      .gte('created_at', inicio)
      .lte('created_at', fim)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar saídas: ${error.message}`);
    }

    return (data ?? [])
      .map((row) => this.mapMovimentoRow(row as MovimentoWithRelations))
      .filter((movimento) =>
        movimento.delta.caixas < 0 ||
        movimento.delta.pacotes < 0 ||
        movimento.delta.unidades < 0 ||
        movimento.delta.kg < 0,
      );
  }

  async findSaidasMatching(input: {
    data: string;
    cliente: string;
    produto: string;
    quantidade: { caixas: number; pacotes: number; unidades: number; kg: number };
  }): Promise<EstoqueMovimentoRecord[]> {
    const saidas = await this.listSaidasByDate(input.data);
    const clienteNorm = input.cliente.trim().toLowerCase();
    const produtoNorm = input.produto.trim().toLowerCase();

    return saidas.filter((movimento) => {
      const clienteMatch =
        (movimento.clienteDestino ?? '').trim().toLowerCase() === clienteNorm;
      const produtoMatch = movimento.produtoNome.trim().toLowerCase() === produtoNorm;
      const quantidade = {
        caixas: Math.abs(movimento.delta.caixas || 0),
        pacotes: Math.abs(movimento.delta.pacotes || 0),
        unidades: Math.abs(movimento.delta.unidades || 0),
        kg: Math.abs(movimento.delta.kg || 0),
      };

      return (
        clienteMatch &&
        produtoMatch &&
        quantidade.caixas === (input.quantidade.caixas || 0) &&
        quantidade.pacotes === (input.quantidade.pacotes || 0) &&
        quantidade.unidades === (input.quantidade.unidades || 0) &&
        quantidade.kg === (input.quantidade.kg || 0)
      );
    });
  }

  async deleteMovimento(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('estoque_movimentos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover movimento: ${error.message}`);
    }
  }

  async updateMovimentoDelta(
    id: string,
    delta: { caixas: number; pacotes: number; unidades: number; kg: number },
    produtoId: string,
  ): Promise<void> {
    const movimento = await this.findMovimentoById(id);
    if (!movimento) {
      throw new Error('Movimento não encontrado');
    }

    const saldoAtual = await this.findSaldo(movimento.tipoEstoqueId, produtoId);

    const { error } = await this.supabase
      .from('estoque_movimentos')
      .update({
        delta_caixas: delta.caixas,
        delta_pacotes: delta.pacotes,
        delta_unidades: delta.unidades,
        delta_kg: delta.kg,
        saldo_caixas: saldoAtual?.caixas ?? 0,
        saldo_pacotes: saldoAtual?.pacotes ?? 0,
        saldo_unidades: saldoAtual?.unidades ?? 0,
        saldo_kg: saldoAtual?.kg ?? 0,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar movimento: ${error.message}`);
    }
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

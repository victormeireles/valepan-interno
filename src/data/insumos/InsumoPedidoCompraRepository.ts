import { SupabaseClient } from '@supabase/supabase-js';
import { dataEfetivaIso } from '@/domain/insumos/insumo-compra-data-offset';
import { resolveUnidadeResumida } from '@/domain/insumos/insumo-conversao-params';
import type {
  InsumoPedidoCompraItemInput,
  InsumoPedidoPipelineItem,
} from '@/domain/insumos/insumo-pedido-compra-types';
import type {
  InsumoPedidoCompraItemRow,
  InsumoPedidoCompraRow,
  InsumoPedidoCompraStatus,
} from '@/domain/types/insumo-pedido-compra-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export type InsumoPedidoCompraFiltro =
  | 'abertos'
  | 'atrasados'
  | 'encerrados'
  | 'cancelados'
  | 'todos';

export type InsumoPedidoCompraListItem = InsumoPedidoCompraRow & {
  itens: Array<InsumoPedidoCompraItemRow & { insumoNome: string; unidade: string }>;
};

type UnidadeJoin = { nome_resumido: string } | { nome_resumido: string }[] | null;

type ItemJoinRow = InsumoPedidoCompraItemRow & {
  insumos: {
    nome: string;
    unidades: UnidadeJoin;
  } | null;
};

type PedidoJoinRow = InsumoPedidoCompraRow & {
  insumo_pedido_compra_item: ItemJoinRow[] | null;
};

type PipelinePedidoRow = {
  id: string;
  numero: number;
  data_chegada_prevista: string;
  insumo_pedido_compra_item: Array<{
    insumo_id: string;
    quantidade: number;
  }> | null;
};

type InsumoOpcaoJoin = {
  id: string;
  nome: string;
  unidades: UnidadeJoin;
};

const PEDIDO_COM_ITENS_SELECT = `
  *,
  insumo_pedido_compra_item(
    id,
    pedido_id,
    insumo_id,
    quantidade,
    insumos(
      nome,
      unidades!insumos_unidade_id_fkey(nome_resumido)
    )
  )
`;

export class InsumoPedidoCompraRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async list(
    filtro: InsumoPedidoCompraFiltro,
    insumoId?: string,
  ): Promise<InsumoPedidoCompraListItem[]> {
    const hoje = this.hojeSaoPauloIso();
    const pedidoIds = insumoId ? await this.listPedidoIdsByInsumoId(insumoId) : null;
    if (pedidoIds !== null && pedidoIds.length === 0) return [];

    let query = this.db.from('insumo_pedido_compra').select(PEDIDO_COM_ITENS_SELECT);

    if (filtro === 'abertos' || filtro === 'atrasados') {
      query = query.eq('status', 'aberto');
    } else if (filtro === 'encerrados') {
      query = query.eq('status', 'encerrado');
    } else if (filtro === 'cancelados') {
      query = query.eq('status', 'cancelado');
    }
    if (filtro === 'atrasados') {
      query = query.lt('data_chegada_prevista', hoje);
    }
    if (pedidoIds) {
      query = query.in('id', pedidoIds);
    }

    const { data, error } = await query.order('data_chegada_prevista', { ascending: true });
    if (error) {
      throw new Error(`Erro ao listar pedidos de compra: ${error.message}`);
    }

    const mapped = ((data as PedidoJoinRow[]) ?? []).map((row) => this.toListItem(row));
    return this.sortListItems(mapped, hoje);
  }

  async getById(id: string): Promise<InsumoPedidoCompraListItem | null> {
    const { data, error } = await this.db
      .from('insumo_pedido_compra')
      .select(PEDIDO_COM_ITENS_SELECT)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pedido de compra: ${error.message}`);
    }
    if (!data) return null;
    return this.toListItem(data as PedidoJoinRow);
  }

  async listPipelineAberto(dataReferencia: string): Promise<InsumoPedidoPipelineItem[]> {
    const { data, error } = await this.db
      .from('insumo_pedido_compra')
      .select(
        `id, numero, data_chegada_prevista,
         insumo_pedido_compra_item(insumo_id, quantidade)`,
      )
      .eq('status', 'aberto');

    if (error) {
      throw new Error(`Erro ao listar pipeline de pedidos abertos: ${error.message}`);
    }

    const result: InsumoPedidoPipelineItem[] = [];
    for (const pedido of (data as PipelinePedidoRow[]) ?? []) {
      for (const item of pedido.insumo_pedido_compra_item ?? []) {
        const dataPrevista = pedido.data_chegada_prevista;
        result.push({
          insumoId: item.insumo_id,
          pedidoId: pedido.id,
          numero: pedido.numero,
          quantidade: Number(item.quantidade),
          dataPrevista,
          dataEfetiva: dataEfetivaIso(dataPrevista, dataReferencia),
          atrasado: dataPrevista < dataReferencia,
        });
      }
    }
    return result;
  }

  async insert(input: {
    fornecedorNome: string;
    dataChegadaPrevista: string;
    observacao: string | null;
    criadoPor: string | null;
    itens: InsumoPedidoCompraItemInput[];
  }): Promise<InsumoPedidoCompraListItem> {
    const { data, error } = await this.db
      .from('insumo_pedido_compra')
      .insert({
        fornecedor_nome: input.fornecedorNome,
        data_chegada_prevista: input.dataChegadaPrevista,
        observacao: input.observacao,
        criado_por: input.criadoPor,
        status: 'aberto' satisfies InsumoPedidoCompraStatus,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Erro ao criar pedido de compra: ${error?.message ?? 'sem retorno'}`);
    }

    await this.insertItens(data.id as string, input.itens);
    const created = await this.getById(data.id as string);
    if (!created) {
      throw new Error('Erro ao criar pedido de compra: pedido não encontrado após insert');
    }
    return created;
  }

  async replaceAberto(
    id: string,
    input: {
      fornecedorNome: string;
      dataChegadaPrevista: string;
      observacao: string | null;
      itens: InsumoPedidoCompraItemInput[];
    },
  ): Promise<InsumoPedidoCompraListItem> {
    const now = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await this.db
      .from('insumo_pedido_compra')
      .update({
        fornecedor_nome: input.fornecedorNome,
        data_chegada_prevista: input.dataChegadaPrevista,
        observacao: input.observacao,
        updated_at: now,
      })
      .eq('id', id)
      .eq('status', 'aberto')
      .select('id');

    if (updateError) {
      throw new Error(`Erro ao atualizar pedido de compra: ${updateError.message}`);
    }
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error('Pedido não encontrado ou não está aberto.');
    }

    const { error: deleteError } = await this.db
      .from('insumo_pedido_compra_item')
      .delete()
      .eq('pedido_id', id);

    if (deleteError) {
      throw new Error(`Erro ao substituir itens do pedido: ${deleteError.message}`);
    }

    await this.insertItens(id, input.itens);
    const updated = await this.getById(id);
    if (!updated) {
      throw new Error('Erro ao atualizar pedido de compra: pedido não encontrado após replace');
    }
    return updated;
  }

  async updateStatus(id: string, status: 'encerrado' | 'cancelado'): Promise<void> {
    const { data, error } = await this.db
      .from('insumo_pedido_compra')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'aberto')
      .select('id');

    if (error) {
      throw new Error(`Erro ao atualizar status do pedido: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error('Pedido não encontrado ou não está aberto.');
    }
  }

  async countItensByInsumoId(insumoId: string): Promise<number> {
    const { count, error } = await this.db
      .from('insumo_pedido_compra_item')
      .select('id', { count: 'exact', head: true })
      .eq('insumo_id', insumoId);

    if (error) {
      throw new Error(`Erro ao contar itens de pedido por insumo: ${error.message}`);
    }
    return count ?? 0;
  }

  async listInsumoOpcoes(): Promise<Array<{ id: string; nome: string; unidade: string }>> {
    const { data, error } = await this.db
      .from('insumos')
      .select('id, nome, unidades!insumos_unidade_id_fkey(nome_resumido)')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar opções de insumos: ${error.message}`);
    }

    return ((data as InsumoOpcaoJoin[]) ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      unidade: resolveUnidadeResumida(row.unidades),
    }));
  }

  private async listPedidoIdsByInsumoId(insumoId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('insumo_pedido_compra_item')
      .select('pedido_id')
      .eq('insumo_id', insumoId);

    if (error) {
      throw new Error(`Erro ao filtrar pedidos por insumo: ${error.message}`);
    }

    return [...new Set(((data as Array<{ pedido_id: string }>) ?? []).map((row) => row.pedido_id))];
  }

  private async insertItens(
    pedidoId: string,
    itens: InsumoPedidoCompraItemInput[],
  ): Promise<void> {
    if (itens.length === 0) return;

    const { error } = await this.db.from('insumo_pedido_compra_item').insert(
      itens.map((item) => ({
        pedido_id: pedidoId,
        insumo_id: item.insumoId,
        quantidade: item.quantidade,
      })),
    );

    if (error) {
      throw new Error(`Erro ao inserir itens do pedido: ${error.message}`);
    }
  }

  private toListItem(row: PedidoJoinRow): InsumoPedidoCompraListItem {
    const itens = (row.insumo_pedido_compra_item ?? []).map((item) =>
      this.toListItemRow(item),
    );

    return {
      id: row.id,
      numero: row.numero,
      fornecedor_nome: row.fornecedor_nome,
      data_chegada_prevista: row.data_chegada_prevista,
      status: row.status,
      observacao: row.observacao,
      criado_por: row.criado_por,
      created_at: row.created_at,
      updated_at: row.updated_at,
      itens,
    };
  }

  private toListItemRow(
    item: ItemJoinRow,
  ): InsumoPedidoCompraItemRow & { insumoNome: string; unidade: string } {
    return {
      id: item.id,
      pedido_id: item.pedido_id,
      insumo_id: item.insumo_id,
      quantidade: Number(item.quantidade),
      insumoNome: item.insumos?.nome ?? '',
      unidade: resolveUnidadeResumida(item.insumos?.unidades),
    };
  }

  private sortListItems(
    items: InsumoPedidoCompraListItem[],
    hoje: string,
  ): InsumoPedidoCompraListItem[] {
    return [...items].sort((a, b) => {
      const aAtrasado = a.status === 'aberto' && a.data_chegada_prevista < hoje ? 0 : 1;
      const bAtrasado = b.status === 'aberto' && b.data_chegada_prevista < hoje ? 0 : 1;
      if (aAtrasado !== bAtrasado) return aAtrasado - bAtrasado;
      if (a.data_chegada_prevista !== b.data_chegada_prevista) {
        return a.data_chegada_prevista < b.data_chegada_prevista ? -1 : 1;
      }
      return a.numero - b.numero;
    });
  }

  private hojeSaoPauloIso(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));
    return `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')}`;
  }
}

export const insumoPedidoCompraRepository = new InsumoPedidoCompraRepository();

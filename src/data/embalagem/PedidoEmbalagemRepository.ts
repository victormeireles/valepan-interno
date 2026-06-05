import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type {
  PedidoEmbalagemKey,
  PedidoEmbalagemRecord,
  PedidoEmbalagemUpsert,
} from '@/domain/types/pedido-embalagem';
import { keysEqual } from '@/domain/embalagem/pedido-key';
import type { Database } from '@/types/database';

type PedidoRow = Database['public']['Tables']['pedidos_embalagem']['Row'];
type PedidoInsertRow = Database['public']['Tables']['pedidos_embalagem']['Insert'];

const CONFLICT_COLUMNS =
  'data_producao,data_fabricacao_etiqueta,tipo_estoque_id,produto_id,observacao';

function toDbInsert(input: PedidoEmbalagemUpsert): PedidoInsertRow {
  return {
    data_producao: input.dataProducao,
    data_fabricacao_etiqueta: input.dataFabricacaoEtiqueta,
    tipo_estoque_id: input.tipoEstoqueId,
    produto_id: input.produtoId,
    observacao: input.observacao,
    caixas: input.quantidade.caixas,
    pacotes: input.quantidade.pacotes,
    unidades: input.quantidade.unidades,
    kg: input.quantidade.kg,
    updated_at: new Date().toISOString(),
  };
}

function fromDbRow(row: PedidoRow): PedidoEmbalagemRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dataProducao: row.data_producao,
    dataFabricacaoEtiqueta: row.data_fabricacao_etiqueta,
    tipoEstoqueId: row.tipo_estoque_id,
    produtoId: row.produto_id,
    observacao: row.observacao,
    quantidade: {
      caixas: row.caixas,
      pacotes: row.pacotes,
      unidades: row.unidades,
      kg: Number(row.kg),
    },
  };
}

function recordToKey(row: PedidoEmbalagemRecord): PedidoEmbalagemKey {
  return {
    dataProducao: row.dataProducao,
    dataFabricacaoEtiqueta: row.dataFabricacaoEtiqueta,
    tipoEstoqueId: row.tipoEstoqueId,
    produtoId: row.produtoId,
    observacao: row.observacao,
  };
}

export class PedidoEmbalagemRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async findByKey(key: PedidoEmbalagemKey): Promise<PedidoEmbalagemRecord | null> {
    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select()
      .eq('data_producao', key.dataProducao)
      .eq('data_fabricacao_etiqueta', key.dataFabricacaoEtiqueta)
      .eq('tipo_estoque_id', key.tipoEstoqueId)
      .eq('produto_id', key.produtoId)
      .eq('observacao', key.observacao)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pedido embalagem: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async upsertMany(inputs: PedidoEmbalagemUpsert[]): Promise<PedidoEmbalagemRecord[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .upsert(inputs.map(toDbInsert), { onConflict: CONFLICT_COLUMNS })
      .select();

    if (error) {
      throw new Error(`Erro ao upsert pedidos embalagem: ${error.message}`);
    }

    return (data ?? []).map(fromDbRow);
  }

  async listByDataProducao(dataProducao: string): Promise<PedidoEmbalagemRecord[]> {
    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select()
      .eq('data_producao', dataProducao);

    if (error) {
      throw new Error(`Erro ao listar pedidos embalagem: ${error.message}`);
    }

    return (data ?? []).map(fromDbRow);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('pedidos_embalagem')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover pedido embalagem: ${error.message}`);
    }
  }

  async deleteForDateExceptKeys(
    dataProducao: string,
    keepKeys: PedidoEmbalagemKey[],
  ): Promise<number> {
    const existing = await this.listByDataProducao(dataProducao);
    let deleted = 0;

    for (const row of existing) {
      const keep = keepKeys.some((k) => keysEqual(k, recordToKey(row)));
      if (!keep) {
        await this.deleteById(row.id);
        deleted += 1;
      }
    }

    return deleted;
  }

}

export const pedidoEmbalagemRepository = new PedidoEmbalagemRepository();

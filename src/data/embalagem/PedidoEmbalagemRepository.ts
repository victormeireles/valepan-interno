import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import { addCalendarDaysISO, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
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

  async findById(id: string): Promise<PedidoEmbalagemRecord | null> {
    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar pedido embalagem: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async updateQuantidades(
    id: string,
    quantidade: PedidoEmbalagemUpsert['quantidade'],
  ): Promise<PedidoEmbalagemRecord> {
    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .update({
        caixas: quantidade.caixas,
        pacotes: quantidade.pacotes,
        unidades: quantidade.unidades,
        kg: quantidade.kg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pedido embalagem: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async updatePedidoFields(
    id: string,
    fields: {
      dataProducao: string;
      dataFabricacaoEtiqueta: string;
      tipoEstoqueId: string;
      produtoId: string;
      observacao: string;
      quantidade: PedidoEmbalagemUpsert['quantidade'];
    },
  ): Promise<PedidoEmbalagemRecord> {
    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .update({
        data_producao: fields.dataProducao,
        data_fabricacao_etiqueta: fields.dataFabricacaoEtiqueta,
        tipo_estoque_id: fields.tipoEstoqueId,
        produto_id: fields.produtoId,
        observacao: fields.observacao,
        caixas: fields.quantidade.caixas,
        pacotes: fields.quantidade.pacotes,
        unidades: fields.quantidade.unidades,
        kg: fields.quantidade.kg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar pedido embalagem: ${error.message}`);
    }

    return fromDbRow(data);
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

  async findUltimaDataComPedidos(
    lookbackDays: number,
    anchorDate?: string,
  ): Promise<string | null> {
    const anchor = anchorDate ?? getTodayISOInBrazilTimezone();
    const fromDate = addCalendarDaysISO(anchor, -(lookbackDays - 1));

    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select('data_producao')
      .gte('data_producao', fromDate)
      .lte('data_producao', anchor)
      .order('data_producao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar última data com pedidos: ${error.message}`);
    }

    return data?.data_producao ?? null;
  }

  async findDataAnteriorComPedidos(
    beforeDate: string,
    maxLookbackDays: number,
  ): Promise<string | null> {
    const fromDate = addCalendarDaysISO(beforeDate, -maxLookbackDays);

    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select('data_producao')
      .gte('data_producao', fromDate)
      .lt('data_producao', beforeDate)
      .order('data_producao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar data anterior com pedidos: ${error.message}`);
    }

    return data?.data_producao ?? null;
  }

  async listByDatasProducao(dates: string[]): Promise<Map<string, PedidoEmbalagemRecord[]>> {
    const map = new Map<string, PedidoEmbalagemRecord[]>();
    const unique = [...new Set(dates.filter(Boolean))];
    if (unique.length === 0) return map;

    const { data, error } = await this.supabase
      .from('pedidos_embalagem')
      .select()
      .in('data_producao', unique);

    if (error) {
      throw new Error(`Erro ao listar pedidos por datas: ${error.message}`);
    }

    for (const row of data ?? []) {
      const record = fromDbRow(row);
      const list = map.get(record.dataProducao) ?? [];
      list.push(record);
      map.set(record.dataProducao, list);
    }

    return map;
  }

}

export const pedidoEmbalagemRepository = new PedidoEmbalagemRepository();

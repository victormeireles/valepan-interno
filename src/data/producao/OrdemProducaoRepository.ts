import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import {
  addCalendarDaysISO,
  extractCalendarDate,
  getTodayISOInBrazilTimezone,
} from '@/lib/utils/date-utils';
import type {
  OrdemProducaoKey,
  OrdemProducaoRecord,
  OrdemProducaoUpsert,
} from '@/domain/types/ordem-producao';
import { keysEqual } from '@/domain/embalagem/pedido-key';

type OrdemProducaoRow = {
  id: string;
  created_at: string;
  updated_at: string;
  data_producao: string;
  data_fabricacao_etiqueta: string;
  tipo_estoque_id: string;
  produto_id: string;
  observacao: string;
  assadeira_id: string | null;
  assadeiras: number;
  ordem_planejamento: number;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

type OrdemProducaoInsertRow = Omit<OrdemProducaoRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

const CONFLICT_COLUMNS =
  'data_producao,data_fabricacao_etiqueta,tipo_estoque_id,produto_id,observacao,assadeira_id';

// Database types locais ainda não incluem ordens_producao até rodar gen:types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ORDENS_PRODUCAO_TABLE = 'ordens_producao' as any;

function toDbInsert(input: OrdemProducaoUpsert): OrdemProducaoInsertRow {
  return {
    data_producao: input.dataProducao,
    data_fabricacao_etiqueta: input.dataFabricacaoEtiqueta,
    tipo_estoque_id: input.tipoEstoqueId,
    produto_id: input.produtoId,
    observacao: input.observacao,
    assadeira_id: input.assadeiraId || null,
    assadeiras: input.assadeiras,
    ordem_planejamento: input.ordemPlanejamento,
    caixas: input.quantidade.caixas,
    pacotes: input.quantidade.pacotes,
    unidades: input.quantidade.unidades,
    kg: input.quantidade.kg,
    updated_at: new Date().toISOString(),
  };
}

function fromDbRow(row: OrdemProducaoRow): OrdemProducaoRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dataProducao: extractCalendarDate(row.data_producao) || row.data_producao,
    dataFabricacaoEtiqueta:
      extractCalendarDate(row.data_fabricacao_etiqueta) || row.data_fabricacao_etiqueta,
    tipoEstoqueId: row.tipo_estoque_id,
    produtoId: row.produto_id,
    observacao: row.observacao,
    assadeiraId: row.assadeira_id ?? '',
    assadeiras: row.assadeiras,
    ordemPlanejamento: row.ordem_planejamento,
    quantidade: {
      caixas: row.caixas,
      pacotes: row.pacotes,
      unidades: row.unidades,
      kg: Number(row.kg),
    },
  };
}

function recordToKey(row: OrdemProducaoRecord): OrdemProducaoKey {
  return {
    dataProducao: row.dataProducao,
    dataFabricacaoEtiqueta: row.dataFabricacaoEtiqueta,
    tipoEstoqueId: row.tipoEstoqueId,
    produtoId: row.produtoId,
    observacao: row.observacao,
    assadeiraId: row.assadeiraId,
  };
}

export class OrdemProducaoRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async findById(id: string): Promise<OrdemProducaoRecord | null> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar ordem produção: ${error.message}`);
    }

    return data ? fromDbRow(data as unknown as OrdemProducaoRow) : null;
  }

  async findByIds(ids: string[]): Promise<OrdemProducaoRecord[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];

    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select()
      .in('id', unique);

    if (error) {
      throw new Error(`Erro ao buscar ordens produção: ${error.message}`);
    }

    return (data ?? []).map((row) => fromDbRow(row as unknown as OrdemProducaoRow));
  }

  async updateQuantidades(
    id: string,
    fields: {
      assadeiraId?: string;
      assadeiras?: number;
      quantidade: OrdemProducaoUpsert['quantidade'];
    },
  ): Promise<OrdemProducaoRecord> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .update({
        assadeira_id: fields.assadeiraId,
        assadeiras: fields.assadeiras,
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
      throw new Error(`Erro ao atualizar ordem produção: ${error.message}`);
    }

    return fromDbRow(data as unknown as OrdemProducaoRow);
  }

  async updatePedidoFields(
    id: string,
    fields: {
      dataProducao: string;
      dataFabricacaoEtiqueta: string;
      tipoEstoqueId: string;
      produtoId: string;
      observacao: string;
      assadeiraId: string;
      assadeiras: number;
      ordemPlanejamento: number;
      quantidade: OrdemProducaoUpsert['quantidade'];
    },
  ): Promise<OrdemProducaoRecord> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .update({
        data_producao: fields.dataProducao,
        data_fabricacao_etiqueta: fields.dataFabricacaoEtiqueta,
        tipo_estoque_id: fields.tipoEstoqueId,
        produto_id: fields.produtoId,
        observacao: fields.observacao,
        assadeira_id: fields.assadeiraId || null,
        assadeiras: fields.assadeiras,
        ordem_planejamento: fields.ordemPlanejamento,
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
      throw new Error(`Erro ao atualizar ordem produção: ${error.message}`);
    }

    return fromDbRow(data as unknown as OrdemProducaoRow);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from(ORDENS_PRODUCAO_TABLE).delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover ordem produção: ${error.message}`);
    }
  }

  async findByKey(key: OrdemProducaoKey): Promise<OrdemProducaoRecord | null> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select()
      .eq('data_producao', key.dataProducao)
      .eq('data_fabricacao_etiqueta', key.dataFabricacaoEtiqueta)
      .eq('tipo_estoque_id', key.tipoEstoqueId)
      .eq('produto_id', key.produtoId)
      .eq('observacao', key.observacao)
      .eq('assadeira_id', key.assadeiraId || null)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar ordem produção: ${error.message}`);
    }

    return data ? fromDbRow(data as unknown as OrdemProducaoRow) : null;
  }

  async upsertMany(inputs: OrdemProducaoUpsert[]): Promise<OrdemProducaoRecord[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .upsert(inputs.map(toDbInsert), { onConflict: CONFLICT_COLUMNS })
      .select();

    if (error) {
      throw new Error(`Erro ao upsert ordens produção: ${error.message}`);
    }

    return (data ?? []).map((row) => fromDbRow(row as unknown as OrdemProducaoRow));
  }

  async listByDataProducao(dataProducao: string): Promise<OrdemProducaoRecord[]> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select()
      .eq('data_producao', dataProducao)
      .order('ordem_planejamento', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar ordens produção: ${error.message}`);
    }

    return (data ?? []).map((row) => fromDbRow(row as unknown as OrdemProducaoRow));
  }

  async reorderForDate(dataProducao: string, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;

    for (let index = 0; index < orderedIds.length; index += 1) {
      const id = orderedIds[index];
      const { error } = await this.supabase
        .from(ORDENS_PRODUCAO_TABLE)
        .update({
          ordem_planejamento: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('data_producao', dataProducao);

      if (error) {
        throw new Error(`Erro ao reordenar ordens produção: ${error.message}`);
      }
    }
  }

  async nextOrdemPlanejamento(dataProducao: string): Promise<number> {
    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select('ordem_planejamento')
      .eq('data_producao', dataProducao)
      .order('ordem_planejamento', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao calcular próxima ordem de planejamento: ${error.message}`);
    }

    return ((data as { ordem_planejamento: number } | null)?.ordem_planejamento ?? 0) + 1;
  }

  async deleteForDateExceptKeys(
    dataProducao: string,
    keepKeys: OrdemProducaoKey[],
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
      .from(ORDENS_PRODUCAO_TABLE)
      .select('data_producao')
      .gte('data_producao', fromDate)
      .lte('data_producao', anchor)
      .order('data_producao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar última data com pedidos: ${error.message}`);
    }

    return (data as { data_producao: string } | null)?.data_producao ?? null;
  }

  async findDataAnteriorComPedidos(
    beforeDate: string,
    maxLookbackDays: number,
  ): Promise<string | null> {
    const fromDate = addCalendarDaysISO(beforeDate, -maxLookbackDays);

    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select('data_producao')
      .gte('data_producao', fromDate)
      .lt('data_producao', beforeDate)
      .order('data_producao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar data anterior com pedidos: ${error.message}`);
    }

    return (data as { data_producao: string } | null)?.data_producao ?? null;
  }

  async listByDatasProducao(dates: string[]): Promise<Map<string, OrdemProducaoRecord[]>> {
    const map = new Map<string, OrdemProducaoRecord[]>();
    const unique = [...new Set(dates.filter(Boolean))];
    if (unique.length === 0) return map;

    const { data, error } = await this.supabase
      .from(ORDENS_PRODUCAO_TABLE)
      .select()
      .in('data_producao', unique)
      .order('ordem_planejamento', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar ordens por datas: ${error.message}`);
    }

    for (const row of data ?? []) {
      const record = fromDbRow(row as unknown as OrdemProducaoRow);
      const list = map.get(record.dataProducao) ?? [];
      list.push(record);
      map.set(record.dataProducao, list);
    }

    return map;
  }
}

export const ordemProducaoRepository = new OrdemProducaoRepository();

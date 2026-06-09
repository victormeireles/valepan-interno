import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type {
  EmbalagemLoteInsert,
  EmbalagemLoteRecord,
} from '@/domain/types/embalagem-lote';
import type { Database, Json } from '@/types/database';

type LoteRow = Database['public']['Tables']['embalagem_lotes']['Row'];
type LoteInsertRow = Database['public']['Tables']['embalagem_lotes']['Insert'];
type LoteRowCompat = LoteRow & {
  ordem_producao_id?: string | null;
  pedido_embalagem_id?: string | null;
};
type LoteInsertCompat = LoteInsertRow & {
  ordem_producao_id?: string | null;
};
const ORDEM_PRODUCAO_COLUMN = 'ordem_producao_id';

function quantidadeToJson(q: EmbalagemLoteInsert['producaoAnterior']): Json | null {
  if (!q) return null;
  return {
    caixas: q.caixas,
    pacotes: q.pacotes,
    unidades: q.unidades,
    kg: q.kg,
  };
}

function toDbInsert(input: EmbalagemLoteInsert): LoteInsertRow {
  const fotos = input.fotos;
  return {
    modo: input.modo,
    planilha_row_id: input.planilhaRowId,
    planilha_row_id_origem: input.planilhaRowIdOrigem ?? null,
    ordem_producao_id: input.pedidoEmbalagemId ?? null,
    data_pedido: input.dataPedido,
    data_fabricacao: input.dataFabricacao,
    tipo_estoque_id: input.tipoEstoqueId,
    produto_id: input.produtoId,
    congelado: input.congelado,
    lote: input.lote ?? null,
    caixas: input.quantidade.caixas,
    pacotes: input.quantidade.pacotes,
    unidades: input.quantidade.unidades,
    kg: input.quantidade.kg,
    produzido_em: input.produzidoEm,
    obs_embalagem: input.obsEmbalagem ?? null,
    pacote_foto_url: fotos?.pacoteFotoUrl ?? null,
    pacote_foto_id: fotos?.pacoteFotoId ?? null,
    pacote_foto_uploaded_at: fotos?.pacoteFotoUploadedAt ?? null,
    etiqueta_foto_url: fotos?.etiquetaFotoUrl ?? null,
    etiqueta_foto_id: fotos?.etiquetaFotoId ?? null,
    etiqueta_foto_uploaded_at: fotos?.etiquetaFotoUploadedAt ?? null,
    pallet_foto_url: fotos?.palletFotoUrl ?? null,
    pallet_foto_id: fotos?.palletFotoId ?? null,
    pallet_foto_uploaded_at: fotos?.palletFotoUploadedAt ?? null,
    producao_anterior: quantidadeToJson(input.producaoAnterior),
  } as LoteInsertCompat;
}

function fromDbRow(row: LoteRow): EmbalagemLoteRecord {
  const compatRow = row as LoteRowCompat;
  return {
    id: row.id,
    createdAt: row.created_at,
    modo: row.modo,
    planilhaRowId: row.planilha_row_id ?? 0,
    planilhaRowIdOrigem: row.planilha_row_id_origem,
    pedidoEmbalagemId:
      compatRow.ordem_producao_id ?? compatRow.pedido_embalagem_id ?? null,
    dataPedido: row.data_pedido,
    dataFabricacao: row.data_fabricacao,
    tipoEstoqueId: row.tipo_estoque_id,
    produtoId: row.produto_id,
    congelado: row.congelado === 'Sim' ? 'Sim' : 'Não',
    lote: row.lote,
    quantidade: {
      caixas: row.caixas,
      pacotes: row.pacotes,
      unidades: row.unidades,
      kg: Number(row.kg),
    },
    produzidoEm: row.produzido_em,
    obsEmbalagem: row.obs_embalagem,
    fotos: {
      pacoteFotoUrl: row.pacote_foto_url ?? undefined,
      pacoteFotoId: row.pacote_foto_id ?? undefined,
      pacoteFotoUploadedAt: row.pacote_foto_uploaded_at ?? undefined,
      etiquetaFotoUrl: row.etiqueta_foto_url ?? undefined,
      etiquetaFotoId: row.etiqueta_foto_id ?? undefined,
      etiquetaFotoUploadedAt: row.etiqueta_foto_uploaded_at ?? undefined,
      palletFotoUrl: row.pallet_foto_url ?? undefined,
      palletFotoId: row.pallet_foto_id ?? undefined,
      palletFotoUploadedAt: row.pallet_foto_uploaded_at ?? undefined,
    },
    producaoAnterior: row.producao_anterior as EmbalagemLoteInsert['producaoAnterior'],
  };
}

export class EmbalagemLoteRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async insert(input: EmbalagemLoteInsert): Promise<EmbalagemLoteRecord> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .insert(toDbInsert(input))
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao inserir lote de embalagem: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async findById(id: string): Promise<EmbalagemLoteRecord | null> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lote: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async findByPlanilhaRowId(planilhaRowId: number): Promise<EmbalagemLoteRecord | null> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .select()
      .eq('planilha_row_id', planilhaRowId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lote: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async updateByPlanilhaRowId(
    planilhaRowId: number,
    input: EmbalagemLoteInsert,
  ): Promise<EmbalagemLoteRecord> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .update(toDbInsert(input))
      .eq('planilha_row_id', planilhaRowId)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lote: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from('embalagem_lotes').delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover lote: ${error.message}`);
    }
  }

  async listByPedidoEmbalagemIds(
    pedidoIds: string[],
  ): Promise<Map<string, EmbalagemLoteRecord[]>> {
    const map = new Map<string, EmbalagemLoteRecord[]>();
    if (pedidoIds.length === 0) return map;

    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .select()
      .in(ORDEM_PRODUCAO_COLUMN as keyof LoteRow, pedidoIds)
      .order('produzido_em', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar lotes por pedido: ${error.message}`);
    }

    for (const row of data ?? []) {
      const record = fromDbRow(row);
      const pid =
        (row as LoteRowCompat).ordem_producao_id ??
        (row as LoteRowCompat).pedido_embalagem_id;
      if (!pid) continue;
      const list = map.get(pid) ?? [];
      list.push(record);
      map.set(pid, list);
    }

    return map;
  }

  async sumQuantidadeByPedidoId(pedidoId: string): Promise<{
    caixas: number;
    pacotes: number;
    unidades: number;
    kg: number;
  }> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .select('caixas, pacotes, unidades, kg')
      .eq(ORDEM_PRODUCAO_COLUMN as keyof LoteRow, pedidoId);

    if (error) {
      throw new Error(`Erro ao somar lotes: ${error.message}`);
    }

    return (data ?? []).reduce(
      (acc, row) => ({
        caixas: acc.caixas + (row.caixas || 0),
        pacotes: acc.pacotes + (row.pacotes || 0),
        unidades: acc.unidades + (row.unidades || 0),
        kg: Number((acc.kg + Number(row.kg || 0)).toFixed(3)),
      }),
      { caixas: 0, pacotes: 0, unidades: 0, kg: 0 },
    );
  }

  async updateFotosByPlanilhaRowId(
    planilhaRowId: number,
    fotos: EmbalagemLoteInsert['fotos'],
  ): Promise<void> {
    const { error } = await this.supabase
      .from('embalagem_lotes')
      .update({
        pacote_foto_url: fotos?.pacoteFotoUrl ?? null,
        pacote_foto_id: fotos?.pacoteFotoId ?? null,
        pacote_foto_uploaded_at: fotos?.pacoteFotoUploadedAt ?? null,
        etiqueta_foto_url: fotos?.etiquetaFotoUrl ?? null,
        etiqueta_foto_id: fotos?.etiquetaFotoId ?? null,
        etiqueta_foto_uploaded_at: fotos?.etiquetaFotoUploadedAt ?? null,
        pallet_foto_url: fotos?.palletFotoUrl ?? null,
        pallet_foto_id: fotos?.palletFotoId ?? null,
        pallet_foto_uploaded_at: fotos?.palletFotoUploadedAt ?? null,
      })
      .eq('planilha_row_id', planilhaRowId);

    if (error) {
      throw new Error(`Erro ao atualizar fotos do lote: ${error.message}`);
    }
  }

  async listUnlinkedInWindow(
    from: string,
    to: string,
  ): Promise<EmbalagemLoteRecord[]> {
    const { data, error } = await this.supabase
      .from('embalagem_lotes')
      .select()
      .is(ORDEM_PRODUCAO_COLUMN as keyof LoteRow, null)
      .gte('data_pedido', from)
      .lte('data_pedido', to);

    if (error) {
      throw new Error(`Erro ao listar lotes sem pedido: ${error.message}`);
    }

    return (data ?? []).map(fromDbRow);
  }

  async updateOrdemProducaoId(id: string, ordemProducaoId: string): Promise<void> {
    const payload = {
      ordem_producao_id: ordemProducaoId,
    } as LoteInsertCompat;

    const { error } = await this.supabase
      .from('embalagem_lotes')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao vincular lote à ordem de produção: ${error.message}`);
    }
  }

  async updatePedidoEmbalagemId(
    id: string,
    pedidoEmbalagemId: string,
  ): Promise<void> {
    await this.updateOrdemProducaoId(id, pedidoEmbalagemId);
  }
}

export const embalagemLoteRepository = new EmbalagemLoteRepository();

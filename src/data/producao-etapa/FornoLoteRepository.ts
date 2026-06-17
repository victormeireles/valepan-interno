import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { FornoLoteInsert, FornoLoteRecord } from '@/domain/types/forno-lote';
import type { Database, Json } from '@/types/database';

type LoteRow = Database['public']['Tables']['forno_lotes']['Row'];
type LoteInsertRow = Database['public']['Tables']['forno_lotes']['Insert'];
const ORDEM_PRODUCAO_COLUMN = 'ordem_producao_id';

export type FornoLoteUpdate = {
  assadeiras?: number;
  unidades?: number;
  fotos?: FornoLoteInsert['fotos'];
  produzidoEm?: string;
  modo?: FornoLoteInsert['modo'];
  producaoAnterior?: FornoLoteInsert['producaoAnterior'];
};

function quantidadeToJson(q: EtapaQuantidade | null | undefined): Json | null {
  if (!q) return null;
  return {
    assadeiras: q.assadeiras,
    unidades: q.unidades,
  };
}

function toDbInsert(input: FornoLoteInsert): LoteInsertRow {
  const fotos = input.fotos;
  return {
    modo: input.modo,
    ordem_producao_id: input.ordemProducaoId,
    assadeiras: input.assadeiras,
    unidades: input.unidades,
    produzido_em: input.produzidoEm,
    foto_url: fotos?.fotoUrl ?? null,
    foto_id: fotos?.fotoId ?? null,
    foto_uploaded_at: fotos?.fotoUploadedAt ?? null,
    producao_anterior: quantidadeToJson(input.producaoAnterior),
  };
}

function fromDbRow(row: LoteRow): FornoLoteRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    modo: row.modo,
    ordemProducaoId: row.ordem_producao_id,
    assadeiras: row.assadeiras,
    unidades: row.unidades,
    produzidoEm: row.produzido_em,
    fotos: {
      fotoUrl: row.foto_url ?? undefined,
      fotoId: row.foto_id ?? undefined,
      fotoUploadedAt: row.foto_uploaded_at ?? undefined,
    },
    producaoAnterior: row.producao_anterior as FornoLoteInsert['producaoAnterior'],
  };
}

export class FornoLoteRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async insert(input: FornoLoteInsert): Promise<FornoLoteRecord> {
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .insert(toDbInsert(input))
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao inserir lote de forno: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async findById(id: string): Promise<FornoLoteRecord | null> {
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lote de forno: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async updateById(id: string, patch: FornoLoteUpdate): Promise<FornoLoteRecord> {
    const fotos = patch.fotos;
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .update({
        ...(patch.assadeiras !== undefined ? { assadeiras: patch.assadeiras } : {}),
        ...(patch.unidades !== undefined ? { unidades: patch.unidades } : {}),
        ...(patch.produzidoEm ? { produzido_em: patch.produzidoEm } : {}),
        ...(patch.modo ? { modo: patch.modo } : {}),
        ...(patch.producaoAnterior !== undefined
          ? { producao_anterior: quantidadeToJson(patch.producaoAnterior) }
          : {}),
        ...(fotos
          ? {
              foto_url: fotos.fotoUrl ?? null,
              foto_id: fotos.fotoId ?? null,
              foto_uploaded_at: fotos.fotoUploadedAt ?? null,
            }
          : {}),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar lote de forno: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from('forno_lotes').delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover lote de forno: ${error.message}`);
    }
  }

  async listByOrdemProducaoIds(
    ordemProducaoIds: string[],
  ): Promise<Map<string, FornoLoteRecord[]>> {
    const map = new Map<string, FornoLoteRecord[]>();
    if (ordemProducaoIds.length === 0) return map;

    const { data, error } = await this.supabase
      .from('forno_lotes')
      .select()
      .in(ORDEM_PRODUCAO_COLUMN as keyof LoteRow, ordemProducaoIds)
      .order('produzido_em', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar lotes de forno por ordem: ${error.message}`);
    }

    for (const row of data ?? []) {
      const record = fromDbRow(row);
      const ordemId = row.ordem_producao_id;
      const list = map.get(ordemId) ?? [];
      list.push(record);
      map.set(ordemId, list);
    }

    return map;
  }
}

export const fornoLoteRepository = new FornoLoteRepository();

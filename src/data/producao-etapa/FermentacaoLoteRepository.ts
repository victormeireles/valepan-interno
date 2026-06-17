import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type {
  FermentacaoLoteInsert,
  FermentacaoLoteRecord,
} from '@/domain/types/fermentacao-lote';
import type { Database, Json } from '@/types/database';

type LoteRow = Database['public']['Tables']['fermentacao_lotes']['Row'];
type LoteInsertRow = Database['public']['Tables']['fermentacao_lotes']['Insert'];
const ORDEM_PRODUCAO_COLUMN = 'ordem_producao_id';

export type FermentacaoLoteUpdate = {
  assadeiras?: number;
  unidades?: number;
  fotos?: FermentacaoLoteInsert['fotos'];
  produzidoEm?: string;
};

function quantidadeToJson(q: EtapaQuantidade | null | undefined): Json | null {
  if (!q) return null;
  return {
    assadeiras: q.assadeiras,
    unidades: q.unidades,
  };
}

function toDbInsert(input: FermentacaoLoteInsert): LoteInsertRow {
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

function fromDbRow(row: LoteRow): FermentacaoLoteRecord {
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
    producaoAnterior: row.producao_anterior as FermentacaoLoteInsert['producaoAnterior'],
  };
}

export class FermentacaoLoteRepository {
  private get supabase() {
    return supabaseClientFactory.createServiceRoleClient();
  }

  async insert(input: FermentacaoLoteInsert): Promise<FermentacaoLoteRecord> {
    const { data, error } = await this.supabase
      .from('fermentacao_lotes')
      .insert(toDbInsert(input))
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao inserir lote de fermentação: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async findById(id: string): Promise<FermentacaoLoteRecord | null> {
    const { data, error } = await this.supabase
      .from('fermentacao_lotes')
      .select()
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lote de fermentação: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async updateById(id: string, patch: FermentacaoLoteUpdate): Promise<FermentacaoLoteRecord> {
    const fotos = patch.fotos;
    const { data, error } = await this.supabase
      .from('fermentacao_lotes')
      .update({
        ...(patch.assadeiras !== undefined ? { assadeiras: patch.assadeiras } : {}),
        ...(patch.unidades !== undefined ? { unidades: patch.unidades } : {}),
        ...(patch.produzidoEm ? { produzido_em: patch.produzidoEm } : {}),
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
      throw new Error(`Erro ao atualizar lote de fermentação: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase.from('fermentacao_lotes').delete().eq('id', id);

    if (error) {
      throw new Error(`Erro ao remover lote de fermentação: ${error.message}`);
    }
  }

  async listByOrdemProducaoIds(
    ordemProducaoIds: string[],
  ): Promise<Map<string, FermentacaoLoteRecord[]>> {
    const map = new Map<string, FermentacaoLoteRecord[]>();
    if (ordemProducaoIds.length === 0) return map;

    const { data, error } = await this.supabase
      .from('fermentacao_lotes')
      .select()
      .in(ORDEM_PRODUCAO_COLUMN as keyof LoteRow, ordemProducaoIds)
      .order('produzido_em', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar lotes de fermentação por ordem: ${error.message}`);
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

export const fermentacaoLoteRepository = new FermentacaoLoteRepository();

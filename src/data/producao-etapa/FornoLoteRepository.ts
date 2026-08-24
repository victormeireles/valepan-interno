import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { EtapaQuantidade } from '@/domain/producao-etapa/etapa-quantidade';
import type { FornoLoteInsert, FornoLoteRecord } from '@/domain/types/forno-lote';
import type { Database, Json } from '@/types/database';
import {
  mapOperacaoAutor,
  SELECT_COM_AUTOR,
  type AutorJoin,
} from '@/domain/auditoria/operacao-autor';

type LoteRow = Database['public']['Tables']['forno_lotes']['Row'];
type LoteInsertRow = Database['public']['Tables']['forno_lotes']['Insert'];
type LoteRowComAutor = LoteRow & { autor?: AutorJoin };
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
    turno: input.turno,
    criado_por: input.criadoPor ?? null,
  };
}

function fromDbRow(row: unknown): FornoLoteRecord {
  return mapFromDbRow(row as LoteRowComAutor);
}

function mapFromDbRow(row: LoteRowComAutor): FornoLoteRecord {
  const autor = mapOperacaoAutor(row.criado_por, row.autor);
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
    turno: row.turno === 1 || row.turno === 2 || row.turno === 3 ? row.turno : null,
    criadoPor: autor.criadoPor,
    criadoPorNome: autor.criadoPorNome,
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
      .select(SELECT_COM_AUTOR)
      .single();

    if (error) {
      throw new Error(`Erro ao inserir lote de forno: ${error.message}`);
    }

    return fromDbRow(data);
  }

  async findById(id: string): Promise<FornoLoteRecord | null> {
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .select(SELECT_COM_AUTOR)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar lote de forno: ${error.message}`);
    }

    return data ? fromDbRow(data) : null;
  }

  async findByIds(ids: string[]): Promise<FornoLoteRecord[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .select(SELECT_COM_AUTOR)
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao buscar lotes de forno: ${error.message}`);
    }

    return (data ?? []).map((row) => fromDbRow(row));
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
      .select(SELECT_COM_AUTOR)
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
      .select(SELECT_COM_AUTOR)
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

  async listByProduzidoEmRange(
    startIso: string,
    endIsoExclusive: string,
  ): Promise<FornoLoteRecord[]> {
    const { data, error } = await this.supabase
      .from('forno_lotes')
      .select(SELECT_COM_AUTOR)
      .gte('produzido_em', startIso)
      .lt('produzido_em', endIsoExclusive)
      .order('produzido_em', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar lotes de forno por período: ${error.message}`);
    }

    return (data ?? []).map(fromDbRow);
  }
}

export const fornoLoteRepository = new FornoLoteRepository();

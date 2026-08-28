import { SupabaseClient } from '@supabase/supabase-js';
import type { ReclamacaoFotoRecord } from '@/domain/reclamacoes/reclamacao-types';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

type FotoRow = Database['public']['Tables']['reclamacao_fotos']['Row'];

export type ReclamacaoFotoInsertInput = {
  reclamacaoId: string;
  storagePath: string;
  ordem: number;
};

function mapFoto(row: FotoRow): ReclamacaoFotoRecord {
  return {
    id: row.id,
    storagePath: row.storage_path,
    ordem: row.ordem,
    signedUrl: null,
  };
}

export class ReclamacaoFotoRepository {
  constructor(private readonly supabase?: SupabaseClient<Database>) {}

  private get db(): SupabaseClient {
    const client =
      this.supabase ?? supabaseClientFactory.createServiceRoleClient();
    return client as unknown as SupabaseClient;
  }

  async listByReclamacaoId(reclamacaoId: string): Promise<ReclamacaoFotoRecord[]> {
    const { data, error } = await this.db
      .from('reclamacao_fotos')
      .select('*')
      .eq('reclamacao_id', reclamacaoId)
      .order('ordem');

    if (error) {
      throw new Error(`Erro ao listar fotos da reclamação: ${error.message}`);
    }

    return ((data as FotoRow[]) ?? []).map(mapFoto);
  }

  async insertMany(inputs: ReclamacaoFotoInsertInput[]): Promise<ReclamacaoFotoRecord[]> {
    if (inputs.length === 0) return [];

    const { data, error } = await this.db
      .from('reclamacao_fotos')
      .insert(
        inputs.map((input) => ({
          reclamacao_id: input.reclamacaoId,
          storage_path: input.storagePath,
          ordem: input.ordem,
        })),
      )
      .select('*')
      .order('ordem');

    if (error) {
      throw new Error(`Erro ao inserir fotos da reclamação: ${error.message}`);
    }

    return ((data as FotoRow[]) ?? []).map(mapFoto);
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const { error } = await this.db
      .from('reclamacao_fotos')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao excluir fotos da reclamação: ${error.message}`);
    }
  }

  async deleteByReclamacaoId(reclamacaoId: string): Promise<void> {
    const { error } = await this.db
      .from('reclamacao_fotos')
      .delete()
      .eq('reclamacao_id', reclamacaoId);

    if (error) {
      throw new Error(`Erro ao excluir fotos da reclamação: ${error.message}`);
    }
  }
}

export const reclamacaoFotoRepository = new ReclamacaoFotoRepository();

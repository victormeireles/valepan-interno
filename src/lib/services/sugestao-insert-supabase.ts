import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoInsert, SugestaoLinhaInsert } from '@/lib/services/sugestao-registro';

export class SugestaoInsertSupabase implements SugestaoInsert {
  constructor(private readonly db: SupabaseClient) {}

  async inserir(linha: SugestaoLinhaInsert): Promise<void> {
    const { error } = await this.db.from('sugestoes_melhoria' as never).insert(linha as never);
    if (error) throw new Error(error.message);
  }
}

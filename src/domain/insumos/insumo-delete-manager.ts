import {
  formatarMotivoBloqueioExclusaoInsumo,
  resolverBloqueiosExclusaoInsumo,
} from '@/domain/insumos/insumo-delete-eligibility';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

type DeleteResult =
  | { success: true }
  | { success: false; error: string };

export class InsumoDeleteManager {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  private async countRows(table: string, insumoId: string): Promise<number> {
    const { count, error } = await this.db
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('insumo_id', insumoId);

    if (error) {
      throw new Error(`Erro ao verificar vínculos do insumo: ${error.message}`);
    }

    return count ?? 0;
  }

  async delete(insumoId: string): Promise<DeleteResult> {
    try {
      const [receitasCount, vinculosOmieCount, movimentosCount] = await Promise.all([
        this.countRows('receita_ingredientes', insumoId),
        this.countRows('integracao_insumos', insumoId),
        this.countRows('insumo_movimentos', insumoId),
      ]);

      const blockers = resolverBloqueiosExclusaoInsumo({
        receitasCount,
        vinculosOmieCount,
        movimentosCount,
      });

      if (blockers.length > 0) {
        return {
          success: false,
          error: formatarMotivoBloqueioExclusaoInsumo(blockers),
        };
      }

      const { error } = await this.db.from('insumos').delete().eq('id', insumoId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir insumo:', error);
      return { success: false, error: 'Erro ao excluir insumo' };
    }
  }
}

export const insumoDeleteManager = new InsumoDeleteManager();

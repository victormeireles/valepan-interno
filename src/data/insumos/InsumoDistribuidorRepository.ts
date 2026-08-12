import { SupabaseClient } from '@supabase/supabase-js';
import type { InsumoDistribuidorRow } from '@/domain/types/insumo-compra-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';
import type { Database } from '@/types/database';

export type InsumoDistribuidorInput = {
  nome: string;
  preferencial: boolean;
  ordem: number;
};

export class InsumoDistribuidorRepository {
  constructor(
    private readonly supabase: SupabaseClient<Database> = supabaseClientFactory.createServiceRoleClient(),
  ) {}

  private get db(): SupabaseClient {
    return this.supabase as unknown as SupabaseClient;
  }

  async listByInsumoIds(insumoIds: string[]): Promise<InsumoDistribuidorRow[]> {
    if (insumoIds.length === 0) {
      return [];
    }

    const { data, error } = await this.db
      .from('insumo_distribuidor')
      .select('*')
      .in('insumo_id', insumoIds)
      .order('ordem', { ascending: true });

    if (error) {
      throw new Error(`Erro ao listar distribuidores de insumo: ${error.message}`);
    }

    return (data as InsumoDistribuidorRow[]) ?? [];
  }

  async replaceForInsumo(insumoId: string, items: InsumoDistribuidorInput[]): Promise<void> {
    const { error: deleteError } = await this.db
      .from('insumo_distribuidor')
      .delete()
      .eq('insumo_id', insumoId);

    if (deleteError) {
      throw new Error(`Erro ao remover distribuidores do insumo: ${deleteError.message}`);
    }

    if (items.length === 0) {
      return;
    }

    const { error: insertError } = await this.db.from('insumo_distribuidor').insert(
      items.map((item) => ({
        insumo_id: insumoId,
        nome: item.nome,
        preferencial: item.preferencial,
        ordem: item.ordem,
      })),
    );

    if (insertError) {
      throw new Error(`Erro ao inserir distribuidores do insumo: ${insertError.message}`);
    }
  }
}

export const insumoDistribuidorRepository = new InsumoDistribuidorRepository();

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoAcessoStore, SugestaoAcessoTipo } from '@/domain/sugestoes/sugestao-publica-rate-limit';

export class SugestaoAcessoStoreSupabase implements SugestaoAcessoStore {
  constructor(private readonly db: SupabaseClient) {}

  async apagarAnterioresA(instante: Date): Promise<void> {
    const { error } = await this.db.from('sugestoes_publica_acessos' as never)
      .delete().lt('criado_em', instante.toISOString());
    if (error) throw new Error(error.message);
  }

  async contar(ipHash: string, tipo: SugestaoAcessoTipo, desde: Date): Promise<number> {
    const { count, error } = await this.db.from('sugestoes_publica_acessos' as never)
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).eq('tipo', tipo).gte('criado_em', desde.toISOString());
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async registrar(ipHash: string, tipo: SugestaoAcessoTipo): Promise<void> {
    const { error } = await this.db.from('sugestoes_publica_acessos' as never)
      .insert({ ip_hash: ipHash, tipo } as never);
    if (error) throw new Error(error.message);
  }
}

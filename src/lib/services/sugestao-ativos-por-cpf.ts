import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoAtivo, SugestaoAtivosPorCpf } from '@/domain/sugestoes/sugestao-cpf-consulta';

export class SugestaoAtivosPorCpfSupabase implements SugestaoAtivosPorCpf {
  constructor(private readonly db: SupabaseClient) {}

  async listar(digitos: string): Promise<SugestaoAtivo[]> {
    const { data, error } = await this.db.rpc(
      'sugestoes_ativos_por_cpf' as never,
      { digitos } as never,
    );
    if (error) throw new Error(error.message);
    return (data ?? []) as SugestaoAtivo[];
  }
}

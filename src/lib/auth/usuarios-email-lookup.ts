import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';

export type UsuarioEmailLookupRow = {
  id: string;
  email: string | null;
  nome: string;
  ativo: boolean;
};

/**
 * Busca usuário ativo/inativo pelo e-mail já normalizado.
 */
export class UsuariosEmailLookup {
  constructor(private readonly supabase: SupabaseClient<DatabaseComAuthz>) {}

  async getByEmail(email: string): Promise<UsuarioEmailLookupRow | null> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('id, email, nome, ativo')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}

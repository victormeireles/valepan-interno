import type { JWT } from 'next-auth/jwt';
import type { UsuarioAuthzSnapshot } from './interno-access-manager';
import { UsuarioAuthzLoader } from './usuario-authz-loader';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';
import type { InternoModuloId, NivelModulo } from './interno-modulos-catalog';

export type JwtAuthzFields = {
  sub: string;
  name?: string | null;
  isSystemOwner: boolean;
  modulosEfetivos: Partial<Record<InternoModuloId, NivelModulo>>;
};

/**
 * Carrega authz na primeira emissão do JWT e grava campos no token.
 */
export class JwtAuthzEnricher {
  constructor(
    private readonly createLoader: (
      supabase: SupabaseClient<DatabaseComAuthz>,
    ) => UsuarioAuthzLoader = (supabase) => new UsuarioAuthzLoader(supabase),
  ) {}

  async enrich(
    token: JWT,
    user: { id?: string | null; name?: string | null },
    supabase: SupabaseClient<DatabaseComAuthz>,
  ): Promise<JWT> {
    if (!user.id) return token;

    token.sub = user.id;
    if (user.name !== undefined) token.name = user.name;

    const snap = await this.createLoader(supabase).load(user.id);
    this.applySnapshot(token, snap);
    return token;
  }

  applySnapshot(token: JWT, snap: UsuarioAuthzSnapshot | null): void {
    token.isSystemOwner = snap?.isSystemOwner ?? false;
    token.modulosEfetivos = snap?.modulosEfetivos ?? {};
  }
}

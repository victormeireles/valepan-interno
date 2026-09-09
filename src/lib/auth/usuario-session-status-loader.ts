import type { InternoAuthLifecycleStatus } from './interno-auth-lifecycle-types';

export type UsuarioSessionStatusLoaderDeps = {
  supabaseUrl?: string;
  serviceRole?: string;
  fetchImpl?: typeof fetch;
};

const TIMEOUT_MS = 5_000;

/**
 * Lê ativo/e-mail/password_must_change no banco a cada request autenticado.
 */
export class UsuarioSessionStatusLoader {
  constructor(private readonly deps: UsuarioSessionStatusLoaderDeps = {}) {}

  async load(usuarioId: string): Promise<InternoAuthLifecycleStatus> {
    const supabaseUrl = this.deps.supabaseUrl ?? process.env.SUPABASE_URL;
    const serviceRole = this.deps.serviceRole ?? process.env.SERVICE_ROLE;
    if (!supabaseUrl || !serviceRole) {
      return { kind: 'unavailable' };
    }

    const encodedUserId = encodeURIComponent(usuarioId);
    const url = `${supabaseUrl}/rest/v1/usuarios?select=ativo,password_must_change,email&id=eq.${encodedUserId}&limit=1`;
    const fetchImpl = this.deps.fetchImpl ?? fetch;

    try {
      const response = await fetchImpl(url, {
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        return { kind: 'unavailable' };
      }
      const rows = (await response.json()) as Array<{
        ativo: boolean | null;
        password_must_change: boolean | null;
        email: string | null;
      }>;
      const row = rows[0];
      if (!row) {
        return { kind: 'unavailable' };
      }
      return {
        kind: 'ok',
        ativo: row.ativo !== false,
        email: row.email,
        passwordMustChange: row.password_must_change === true,
      };
    } catch {
      return { kind: 'unavailable' };
    }
  }
}

import type { Adapter, AdapterUser } from '@auth/core/adapters';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseComAuthz } from '@/types/database-authz';

type VerificationTokenRow = {
  identifier: string;
  token: string;
  expires: string;
};

type UsuarioRow = {
  id: string;
  email: string | null;
  nome: string;
  ativo: boolean;
};

type LooseSupabase = {
  from: (table: string) => {
    select: (columns?: string) => LooseQuery;
    insert: (row: object) => LooseQuery;
    update: (row: object) => LooseQuery;
    delete: () => LooseQuery;
  };
};

type LooseQuery = {
  select: (columns?: string) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
  maybeSingle: () => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
  then: Promise<{ data: unknown; error: { message: string } | null }>['then'];
};

export type UsuariosAuthAdapterDeps = {
  createClient: () => SupabaseClient<DatabaseComAuthz>;
};

function mapUsuarioToAdapterUser(data: UsuarioRow): AdapterUser {
  return {
    id: data.id,
    email: data.email ?? '',
    name: data.nome ?? undefined,
    emailVerified: null,
    image: undefined,
  };
}

function defaultCreateClient(): SupabaseClient<DatabaseComAuthz> {
  // Lazy: evita instanciar factory no import (testes sem env Supabase).
  const { createServiceRoleClient } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@/lib/clients/supabase-client-factory') as typeof import('@/lib/clients/supabase-client-factory');
  return createServiceRoleClient() as unknown as SupabaseClient<DatabaseComAuthz>;
}

function asLoose(client: SupabaseClient<DatabaseComAuthz>): LooseSupabase {
  return client as unknown as LooseSupabase;
}

/**
 * Adapter mínimo NextAuth → tabela `usuarios` + `verification_tokens`.
 * Não provisiona usuários (createUser lança).
 */
export function createUsuariosAuthAdapter(
  deps: Partial<UsuariosAuthAdapterDeps> = {},
): Adapter {
  const createClient = deps.createClient ?? defaultCreateClient;

  return {
    async getUserByEmail(email: string) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, ativo')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('[ADAPTER] getUserByEmail:', error);
        return null;
      }
      if (!data) return null;
      return mapUsuarioToAdapterUser(data as UsuarioRow);
    },

    async getUser(id: string) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, ativo')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('[ADAPTER] getUser:', error);
        return null;
      }
      if (!data) return null;
      return mapUsuarioToAdapterUser(data as UsuarioRow);
    },

    async createUser() {
      throw new Error('Usuários são criados apenas no Pedidos');
    },

    async updateUser(user) {
      const supabase = asLoose(createClient());
      const updateData: Record<string, unknown> = {};
      if (user.email !== undefined) updateData.email = user.email;
      if (user.name !== undefined) updateData.nome = user.name;

      if (Object.keys(updateData).length === 0) {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, email, nome, ativo')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          throw error ?? new Error('User not found');
        }
        return mapUsuarioToAdapterUser(data as UsuarioRow);
      }

      const { data, error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id)
        .select('id, email, nome, ativo')
        .single();

      if (error || !data) {
        throw error ?? new Error('User not found');
      }
      return mapUsuarioToAdapterUser(data as UsuarioRow);
    },

    async linkAccount() {
      return null;
    },

    async createVerificationToken(token) {
      const supabase = asLoose(createClient());
      const expiresDate =
        token.expires instanceof Date
          ? token.expires
          : new Date(token.expires);

      const { data, error } = await supabase
        .from('verification_tokens')
        .insert({
          identifier: token.identifier,
          token: token.token,
          expires: expiresDate.toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        console.error('[ADAPTER] createVerificationToken:', error);
        throw error ?? new Error('Failed to create verification token');
      }

      const row = data as VerificationTokenRow;
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      };
    },

    async useVerificationToken(params) {
      const supabase = asLoose(createClient());

      const { data, error } = await supabase
        .from('verification_tokens')
        .select('*')
        .eq('identifier', params.identifier)
        .eq('token', params.token)
        .maybeSingle();

      if (error) {
        console.error('[ADAPTER] useVerificationToken fetch:', error);
        throw error;
      }
      if (!data) return null;

      const row = data as VerificationTokenRow;
      if (new Date(row.expires) < new Date()) return null;

      const { error: deleteError } = await supabase
        .from('verification_tokens')
        .delete()
        .eq('identifier', params.identifier)
        .eq('token', params.token);

      if (deleteError) {
        console.error('[ADAPTER] useVerificationToken delete:', deleteError);
      }

      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      };
    },
  };
}

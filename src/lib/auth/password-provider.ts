import type { CredentialsConfig } from 'next-auth/providers/credentials';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { PasswordCredentialsManager } from '@/lib/auth/password/password-credentials-manager';
import type { DatabaseComAuthz } from '@/types/database-authz';

/**
 * Provider NextAuth para login com e-mail/telefone + senha.
 */
export function createPasswordProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'password',
    name: 'Senha',
    credentials: {
      identifier: { label: 'E-mail ou telefone', type: 'text' },
      password: { label: 'Senha', type: 'password' },
    },
    async authorize(credentials) {
      const identifier =
        typeof credentials?.identifier === 'string'
          ? credentials.identifier
          : '';
      const password =
        typeof credentials?.password === 'string' ? credentials.password : '';

      if (!identifier.trim() || !password) {
        return null;
      }

      const supabase = createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
      const manager = new PasswordCredentialsManager(supabase);
      const result = await manager.authenticate(identifier, password);
      if (!result.ok) {
        return null;
      }

      return {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      };
    },
  });
}

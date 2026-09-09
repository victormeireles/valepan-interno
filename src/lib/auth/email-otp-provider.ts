import type { CredentialsConfig } from 'next-auth/providers/credentials';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginEmailOtpManager } from '@/lib/auth/email-otp/login-email-otp-manager';
import { UsuariosEmailLookup } from '@/lib/auth/usuarios-email-lookup';
import type { DatabaseComAuthz } from '@/types/database-authz';

/**
 * Provider NextAuth para login com código OTP enviado por e-mail.
 */
export function createEmailOtpProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'email-otp',
    name: 'E-mail código',
    credentials: {
      email: { label: 'E-mail', type: 'email' },
      codigo: { label: 'Código', type: 'text' },
    },
    async authorize(credentials) {
      const email =
        typeof credentials?.email === 'string' ? credentials.email.trim() : '';
      const codigo =
        typeof credentials?.codigo === 'string'
          ? credentials.codigo.trim()
          : '';

      if (!email || !codigo) {
        return null;
      }

      const supabase = createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
      const user = await new UsuariosEmailLookup(supabase).getByEmail(
        email.toLowerCase(),
      );
      if (!user || user.ativo === false) {
        return null;
      }

      const manager = new LoginEmailOtpManager(supabase);
      const result = await manager.validateAndConsume(user.id, codigo, 'login');
      if (!result.ok) {
        return null;
      }

      return {
        id: user.id,
        email: user.email ?? '',
        name: user.nome,
      };
    },
  });
}

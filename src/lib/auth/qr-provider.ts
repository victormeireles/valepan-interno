import type { CredentialsConfig } from 'next-auth/providers/credentials';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginQrRequestManager } from '@/lib/auth/qr/login-qr-request-manager';

/**
 * Provider Credentials: troca do exchange token do login por QR.
 */
export function createQrProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'qr',
    name: 'QR Code',
    credentials: {
      exchangeToken: {
        label: 'Token',
        type: 'text',
      },
    },
    async authorize(credentials) {
      const exchangeToken = credentials?.exchangeToken;
      if (typeof exchangeToken !== 'string' || exchangeToken.length === 0) {
        return null;
      }

      const supabase = createServiceRoleClient();
      const manager = new LoginQrRequestManager(supabase);
      const redeemed = await manager.redeemExchangeToken(exchangeToken);
      if (!redeemed) {
        return null;
      }

      const { data: user, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, ativo')
        .eq('id', redeemed.usuarioId)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] qr authorize:', error);
        return null;
      }
      if (!user || user.ativo === false) {
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

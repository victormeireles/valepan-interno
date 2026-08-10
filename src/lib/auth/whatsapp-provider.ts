import type { CredentialsConfig } from 'next-auth/providers/credentials';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { UsuariosWhatsAppAuthManager } from '@/lib/auth/usuarios-whatsapp-auth-manager';
import { formatPhoneNumber } from '@/lib/validators/whatsapp';

/**
 * Provider Credentials: telefone + código OTP WhatsApp.
 */
export function createWhatsAppProvider(): CredentialsConfig {
  return CredentialsProvider({
    id: 'whatsapp',
    name: 'WhatsApp',
    credentials: {
      telefone: { label: 'Telefone', type: 'text' },
      codigo: { label: 'Código', type: 'text' },
    },
    async authorize(credentials) {
      if (!credentials?.telefone || !credentials?.codigo) return null;

      const formattedPhone = formatPhoneNumber(String(credentials.telefone));
      const manager = new UsuariosWhatsAppAuthManager(createServiceRoleClient());
      const user = await manager.getByTelefone(formattedPhone);

      if (!user || user.ativo === false) return null;

      const validation = await manager.validateWhatsAppCode(
        user.id,
        String(credentials.codigo),
      );
      if (!validation.valid) return null;

      await manager.clearWhatsAppCode(user.id);
      await manager.markTelefoneVerificado(user.id);

      return {
        id: user.id,
        email: user.email ?? '',
        name: user.nome,
      };
    },
  });
}

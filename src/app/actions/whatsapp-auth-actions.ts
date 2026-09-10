'use server';

import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { UsuariosWhatsAppAuthManager } from '@/lib/auth/usuarios-whatsapp-auth-manager';
import { whatsappCloudClient } from '@/lib/whatsapp-cloud/whatsapp-cloud-client';
import {
  formatPhoneNumber,
  generateVerificationCode,
  getMinutesUntilExpiration,
  whatsappPhoneSchema,
} from '@/lib/validators/whatsapp';

export type WhatsAppCodeResponse = {
  success: boolean;
  message: string;
  expiresIn?: number;
  bloqueadoAte?: Date;
};

export async function solicitarCodigoWhatsApp(
  telefone: string,
): Promise<WhatsAppCodeResponse> {
  try {
    const parsed = whatsappPhoneSchema.safeParse(telefone);
    if (!parsed.success) {
      return {
        success: false,
        message: 'Telefone inválido. Use o formato: (11) 99999-9999',
      };
    }

    const formattedPhone = formatPhoneNumber(telefone);
    const manager = new UsuariosWhatsAppAuthManager(createServiceRoleClient());
    const user = await manager.getByTelefone(formattedPhone);

    if (!user) {
      return {
        success: false,
        message:
          'Usuário não encontrado. Cadastre o telefone no perfil (Pedidos) primeiro.',
      };
    }

    if (user.ativo === false) {
      return {
        success: false,
        message:
          'Conta desativada. Entre em contato com o administrador.',
      };
    }

    if (user.codigo_whatsapp_bloqueado_ate) {
      const blockedUntil = new Date(user.codigo_whatsapp_bloqueado_ate);
      if (new Date() < blockedUntil) {
        const minutesLeft = getMinutesUntilExpiration(blockedUntil);
        return {
          success: false,
          message: `Temporariamente bloqueado. Tente novamente em ${minutesLeft} minuto(s).`,
          bloqueadoAte: blockedUntil,
        };
      }
    }

    const isConnected = await whatsappCloudClient.isConnected();
    if (
      !isConnected ||
      !whatsappCloudClient.isAuthenticationTemplateConfigured()
    ) {
      return {
        success: false,
        message:
          'WhatsApp temporariamente indisponível. Use o login por e-mail.',
      };
    }

    const code = generateVerificationCode();
    await manager.createWhatsAppCode(user.id, code);

    try {
      await whatsappCloudClient.sendAuthenticationCode(formattedPhone, code);
    } catch {
      return {
        success: false,
        message:
          'Erro ao enviar código. Verifique se o número tem WhatsApp.',
      };
    }

    return {
      success: true,
      message: 'Código enviado. Verifique seu WhatsApp.',
      expiresIn: 10,
    };
  } catch (error) {
    console.error('[AUTH] solicitarCodigoWhatsApp:', error);
    return {
      success: false,
      message: 'Erro interno ao solicitar código. Tente novamente.',
    };
  }
}

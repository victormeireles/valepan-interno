'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginEmailOtpHasher } from '@/lib/auth/email-otp/login-email-otp-hasher';
import { AuthEmailSender } from '@/lib/email/auth-email-sender';
import type { DatabaseComAuthz } from '@/types/database-authz';

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const codeSchema = z.string().trim().regex(/^\d{6}$/);

const messages: Record<string, string> = {
  inactive: 'Sua conta não está disponível. Fale com a equipe Valepan.',
  already_registered:
    'Sua conta já possui e-mail. Atualize a página para continuar.',
  invalid: 'Confira o endereço de e-mail informado.',
  blocked:
    'Limite de tentativas atingido. Aguarde 10 minutos e solicite outro código.',
  rate_limited: 'Aguarde um minuto entre os envios de código.',
  email_in_use:
    'Este e-mail já está vinculado a outra conta. Use outro endereço ou fale com a equipe Valepan.',
  expired: 'O código expirou. Solicite um novo código.',
  invalid_code:
    'Código incorreto. Confira o último código recebido para este e-mail.',
};

export type CadastroEmailResult = { success: boolean; message: string };

function adminClient() {
  return createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
}

export async function solicitarCadastroEmail(
  emailRaw: string,
): Promise<CadastroEmailResult> {
  const email = emailSchema.safeParse(emailRaw);
  if (!email.success) {
    return { success: false, message: messages.invalid };
  }
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message:
          'Sua sessão expirou. Fale com a equipe Valepan para recuperar o acesso.',
      };
    }
    const sender = new AuthEmailSender();
    if (!sender.isConfigured()) {
      return {
        success: false,
        message:
          'O envio de e-mail está indisponível. Tente novamente em instantes ou fale com a equipe Valepan.',
      };
    }
    const hasher = new LoginEmailOtpHasher();
    const code = hasher.createCode();
    const { data, error } = await adminClient().rpc('solicitar_cadastro_email', {
      p_usuario_id: session.user.id,
      p_email: email.data,
      p_code_hash: hasher.hash(code),
    });
    if (error) throw error;
    if (data !== 'ok') {
      return {
        success: false,
        message: messages[data] ?? 'Não foi possível solicitar o código.',
      };
    }
    const sent = await sender.sendEmailEnrollment({
      email: email.data,
      code,
    });
    if (!sent.ok) {
      return {
        success: false,
        message:
          'Não foi possível enviar o e-mail. Aguarde um minuto e tente novamente. Sua sessão continua ativa.',
      };
    }
    return {
      success: true,
      message: 'Código enviado. Verifique sua caixa de entrada e o spam.',
    };
  } catch {
    return {
      success: false,
      message:
        'Não foi possível enviar o código. Tente novamente em instantes. Você não foi desconectado.',
    };
  }
}

export async function confirmarCadastroEmail(
  emailRaw: string,
  codigoRaw: string,
): Promise<CadastroEmailResult> {
  const email = emailSchema.safeParse(emailRaw);
  const code = codeSchema.safeParse(codigoRaw);
  if (!email.success) {
    return { success: false, message: messages.invalid };
  }
  if (!code.success) {
    return { success: false, message: 'Digite o código de 6 dígitos.' };
  }
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message:
          'Sua sessão expirou. Fale com a equipe Valepan para recuperar o acesso.',
      };
    }
    const { data, error } = await adminClient().rpc('confirmar_cadastro_email', {
      p_usuario_id: session.user.id,
      p_email: email.data,
      p_code_hash: new LoginEmailOtpHasher().hash(code.data),
    });
    if (error) throw error;
    return data === 'ok'
      ? { success: true, message: 'E-mail confirmado e salvo!' }
      : {
          success: false,
          message: messages[data] ?? 'Não foi possível confirmar o e-mail.',
        };
  } catch {
    return {
      success: false,
      message:
        'Não foi possível salvar o e-mail. Tente novamente. Você não foi desconectado.',
    };
  }
}

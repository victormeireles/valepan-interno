'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginEmailOtpManager } from '@/lib/auth/email-otp/login-email-otp-manager';
import { InternoAppUrlResolver } from '@/lib/auth/interno-app-url-resolver';
import {
  PasswordCredentialsManager,
} from '@/lib/auth/password/password-credentials-manager';
import {
  PasswordResetManager,
  passwordSchema,
  type PasswordAuthResponse,
} from '@/lib/auth/password/password-reset-manager';
import { UsuariosEmailLookup } from '@/lib/auth/usuarios-email-lookup';
import { AuthEmailSender } from '@/lib/email/auth-email-sender';
import type { DatabaseComAuthz } from '@/types/database-authz';

const resetSendLimiter = PasswordResetManager.createDefaultLimiter();

async function resolveClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return headerStore.get('x-real-ip') ?? 'unknown';
}

function adminClient() {
  return createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
}

function createResetManager(): PasswordResetManager {
  const supabase = adminClient();
  return new PasswordResetManager({
    lookup: new UsuariosEmailLookup(supabase),
    otp: new LoginEmailOtpManager(supabase),
    passwords: new PasswordCredentialsManager(supabase),
    sender: new AuthEmailSender(),
    limiter: resetSendLimiter,
    appUrl: new InternoAppUrlResolver(),
  });
}

export async function solicitarResetSenha(
  emailRaw: string,
): Promise<PasswordAuthResponse> {
  try {
    const ip = await resolveClientIp();
    return await createResetManager().solicitar(emailRaw, ip);
  } catch (error) {
    console.error('[password-auth] solicitarResetSenha', error);
    return {
      success: false,
      message: 'Erro ao enviar código. Tente novamente.',
    };
  }
}

export async function redefinirSenhaComCodigo(params: {
  email: string;
  codigo: string;
  novaSenha: string;
}): Promise<PasswordAuthResponse> {
  try {
    return await createResetManager().redefinir(params);
  } catch (error) {
    console.error('[password-auth] redefinirSenhaComCodigo', error);
    return {
      success: false,
      message: 'Erro ao redefinir senha. Tente novamente.',
    };
  }
}

export async function definirNovaSenha(
  novaSenha: string,
): Promise<PasswordAuthResponse> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return {
        success: false,
        message: 'Sessão expirada. Faça login novamente.',
      };
    }

    const senhaParsed = passwordSchema.safeParse(novaSenha);
    if (!senhaParsed.success) {
      return {
        success: false,
        message: senhaParsed.error.issues[0]?.message ?? 'Senha inválida',
      };
    }

    await new PasswordCredentialsManager(adminClient()).setPassword(
      userId,
      senhaParsed.data,
      { mustChange: false },
    );

    return { success: true, message: 'Senha atualizada com sucesso.' };
  } catch (error) {
    console.error('[password-auth] definirNovaSenha', error);
    return {
      success: false,
      message: 'Erro ao atualizar senha. Tente novamente.',
    };
  }
}

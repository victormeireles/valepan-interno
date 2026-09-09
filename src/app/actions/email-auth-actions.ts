'use server';

import { headers } from 'next/headers';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import {
  EmailLoginOtpRequestManager,
  type EmailAuthResponse,
} from '@/lib/auth/email-otp/email-login-otp-request-manager';
import { LoginEmailOtpManager } from '@/lib/auth/email-otp/login-email-otp-manager';
import { InternoAppUrlResolver } from '@/lib/auth/interno-app-url-resolver';
import { UsuariosEmailLookup } from '@/lib/auth/usuarios-email-lookup';
import { AuthEmailSender } from '@/lib/email/auth-email-sender';
import type { DatabaseComAuthz } from '@/types/database-authz';

const otpSendLimiter = EmailLoginOtpRequestManager.createDefaultLimiter();

async function resolveClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return headerStore.get('x-real-ip') ?? 'unknown';
}

function createRequestManager(): EmailLoginOtpRequestManager {
  const supabase = createServiceRoleClient() as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
  return new EmailLoginOtpRequestManager({
    lookup: new UsuariosEmailLookup(supabase),
    otp: new LoginEmailOtpManager(supabase),
    sender: new AuthEmailSender(),
    limiter: otpSendLimiter,
    appUrl: new InternoAppUrlResolver(),
  });
}

/**
 * Solicita código de 6 dígitos por e-mail para login.
 */
export async function solicitarCodigoEmail(
  emailRaw: string,
): Promise<EmailAuthResponse> {
  try {
    const ip = await resolveClientIp();
    return await createRequestManager().solicitar(emailRaw, ip);
  } catch (error) {
    console.error('[email-auth] solicitarCodigoEmail', error);
    return {
      success: false,
      message: 'Erro ao enviar código. Tente novamente.',
    };
  }
}

import { z } from 'zod';
import { LOGIN_EMAIL_OTP_RATE_LIMIT } from '@/lib/auth/email-otp/login-email-otp-constants';
import { LoginEmailOtpManager } from '@/lib/auth/email-otp/login-email-otp-manager';
import { InternoAppUrlResolver } from '@/lib/auth/interno-app-url-resolver';
import { UsuariosEmailLookup } from '@/lib/auth/usuarios-email-lookup';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';
import { AuthEmailSender } from '@/lib/email/auth-email-sender';

export const USER_NOT_FOUND_ACCESS_MESSAGE =
  'Usuário não encontrado. Entre em contato para solicitar acesso.';

const emailSchema = z.string().email('E-mail inválido').max(255);

export type EmailAuthResponse = {
  success: boolean;
  message: string;
  expiresIn?: number;
};

export type EmailLoginOtpRequestManagerDeps = {
  lookup: UsuariosEmailLookup;
  otp: LoginEmailOtpManager;
  sender: AuthEmailSender;
  limiter: LoginQrRateLimiter;
  appUrl: InternoAppUrlResolver;
};

/**
 * Solicita OTP de login: valida, limita, cria desafio e envia e-mail.
 */
export class EmailLoginOtpRequestManager {
  constructor(private readonly deps: EmailLoginOtpRequestManagerDeps) {}

  static createDefaultLimiter(): LoginQrRateLimiter {
    return new LoginQrRateLimiter(
      LOGIN_EMAIL_OTP_RATE_LIMIT.windowMs,
      LOGIN_EMAIL_OTP_RATE_LIMIT.max,
    );
  }

  async solicitar(emailRaw: string, ip: string): Promise<EmailAuthResponse> {
    const parsed = emailSchema.safeParse(emailRaw.trim().toLowerCase());
    if (!parsed.success) {
      return { success: false, message: 'E-mail inválido' };
    }
    const email = parsed.data;

    if (!this.deps.limiter.allow(`${ip}:${email}`)) {
      return {
        success: false,
        message: 'Muitas solicitações. Aguarde um minuto e tente novamente.',
      };
    }

    const user = await this.deps.lookup.getByEmail(email);
    if (!user || user.ativo === false) {
      return { success: false, message: USER_NOT_FOUND_ACCESS_MESSAGE };
    }

    const created = await this.deps.otp.create(user.id, 'login');
    const baseUrl = this.deps.appUrl.resolve();
    const verifyUrl = `${baseUrl}/login/verify?email=${encodeURIComponent(email)}`;
    const sent = await this.deps.sender.sendLoginOtp({
      email,
      code: created.code,
      verifyUrl,
    });

    if (!sent.ok) {
      return { success: false, message: sent.message };
    }

    return {
      success: true,
      message: 'Código enviado! Verifique seu e-mail.',
      expiresIn: 10,
    };
  }
}

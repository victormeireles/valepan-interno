import { z } from 'zod';
import {
  LOGIN_EMAIL_OTP_RATE_LIMIT,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/lib/auth/email-otp/login-email-otp-constants';
import { USER_NOT_FOUND_ACCESS_MESSAGE } from '@/lib/auth/email-otp/email-login-otp-request-manager';
import { LoginEmailOtpManager } from '@/lib/auth/email-otp/login-email-otp-manager';
import { InternoAppUrlResolver } from '@/lib/auth/interno-app-url-resolver';
import { PasswordCredentialsManager } from '@/lib/auth/password/password-credentials-manager';
import { UsuariosEmailLookup } from '@/lib/auth/usuarios-email-lookup';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';
import { AuthEmailSender } from '@/lib/email/auth-email-sender';
import { whatsappCodeSchema } from '@/lib/validators/whatsapp';

const emailSchema = z.string().email('E-mail inválido').max(255);
const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .max(PASSWORD_MAX_LENGTH);

export type PasswordAuthResponse = {
  success: boolean;
  message: string;
  expiresIn?: number;
};

export type PasswordResetManagerDeps = {
  lookup: UsuariosEmailLookup;
  otp: LoginEmailOtpManager;
  passwords: PasswordCredentialsManager;
  sender: AuthEmailSender;
  limiter: LoginQrRateLimiter;
  appUrl: InternoAppUrlResolver;
};

/**
 * Fluxo esqueci a senha: OTP purpose=reset + gravação bcrypt.
 */
export class PasswordResetManager {
  constructor(private readonly deps: PasswordResetManagerDeps) {}

  static createDefaultLimiter(): LoginQrRateLimiter {
    return new LoginQrRateLimiter(
      LOGIN_EMAIL_OTP_RATE_LIMIT.windowMs,
      LOGIN_EMAIL_OTP_RATE_LIMIT.max,
    );
  }

  async solicitar(emailRaw: string, ip: string): Promise<PasswordAuthResponse> {
    const parsed = emailSchema.safeParse(emailRaw.trim().toLowerCase());
    if (!parsed.success) {
      return { success: false, message: 'E-mail inválido' };
    }
    const email = parsed.data;

    if (!this.deps.limiter.allow(`reset:${ip}:${email}`)) {
      return {
        success: false,
        message: 'Muitas solicitações. Aguarde um minuto e tente novamente.',
      };
    }

    const user = await this.deps.lookup.getByEmail(email);
    if (!user || user.ativo === false) {
      return { success: false, message: USER_NOT_FOUND_ACCESS_MESSAGE };
    }

    const created = await this.deps.otp.create(user.id, 'reset');
    const resetUrl = `${this.deps.appUrl.resolve()}/login/esqueci-senha?email=${encodeURIComponent(email)}`;
    const sent = await this.deps.sender.sendPasswordReset({
      email,
      code: created.code,
      resetUrl,
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

  async redefinir(params: {
    email: string;
    codigo: string;
    novaSenha: string;
  }): Promise<PasswordAuthResponse> {
    const emailParsed = emailSchema.safeParse(params.email.trim().toLowerCase());
    const codigoParsed = whatsappCodeSchema.safeParse(params.codigo.trim());
    const senhaParsed = passwordSchema.safeParse(params.novaSenha);

    if (!emailParsed.success) {
      return { success: false, message: 'E-mail inválido' };
    }
    if (!codigoParsed.success) {
      return { success: false, message: 'Código deve ter 6 dígitos' };
    }
    if (!senhaParsed.success) {
      return {
        success: false,
        message: senhaParsed.error.issues[0]?.message ?? 'Senha inválida',
      };
    }

    const user = await this.deps.lookup.getByEmail(emailParsed.data);
    if (!user || user.ativo === false) {
      return { success: false, message: 'Usuário não encontrado' };
    }

    const otpResult = await this.deps.otp.validateAndConsume(
      user.id,
      codigoParsed.data,
      'reset',
    );
    if (!otpResult.ok) {
      return { success: false, message: otpResult.message };
    }

    await this.deps.passwords.setPassword(user.id, senhaParsed.data, {
      mustChange: false,
    });

    return {
      success: true,
      message: 'Senha redefinida com sucesso. Você já pode entrar.',
    };
  }
}

export { passwordSchema };

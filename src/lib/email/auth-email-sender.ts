import { Resend } from 'resend';
import {
  buildLoginOtpEmailHtml,
  buildLoginOtpEmailText,
} from '@/lib/email/templates/login-otp-email';
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
} from '@/lib/email/templates/password-reset-email';

export type AuthEmailSendResult =
  | { ok: true }
  | { ok: false; message: string };

const EMAIL_NOT_CONFIGURED = 'Serviço de e-mail não configurado';

/**
 * Envio de e-mails de autenticação (OTP, reset e cadastro) via Resend.
 */
export class AuthEmailSender {
  private readonly resend: Resend | null;
  private readonly from: string | null;

  constructor(config?: { apiKey?: string; from?: string }) {
    const apiKey = config?.apiKey ?? process.env.RESEND_API_KEY;
    this.from = config?.from ?? process.env.RESEND_FROM_EMAIL ?? null;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured(): boolean {
    return Boolean(this.resend && this.from);
  }

  async sendLoginOtp(params: {
    email: string;
    code: string;
    verifyUrl: string;
  }): Promise<AuthEmailSendResult> {
    if (!this.resend || !this.from) {
      return { ok: false, message: EMAIL_NOT_CONFIGURED };
    }

    const host = params.email.split('@')[1] ?? 'sistema';
    const result = await this.resend.emails.send({
      from: this.from,
      to: params.email,
      subject: 'Código de acesso — Valepan Interno',
      html: buildLoginOtpEmailHtml({
        code: params.code,
        verifyUrl: params.verifyUrl,
        host,
      }),
      text: buildLoginOtpEmailText({
        code: params.code,
        verifyUrl: params.verifyUrl,
        host,
      }),
    });

    if (!result.data?.id) {
      return {
        ok: false,
        message: result.error?.message ?? 'Falha ao enviar e-mail',
      };
    }
    return { ok: true };
  }

  async sendEmailEnrollment(params: {
    email: string;
    code: string;
  }): Promise<AuthEmailSendResult> {
    if (!this.resend || !this.from) {
      return { ok: false, message: EMAIL_NOT_CONFIGURED };
    }
    const result = await this.resend.emails.send({
      from: this.from,
      to: params.email,
      subject: 'Confirme seu e-mail — Valepan Interno',
      html: this.buildEnrollmentHtml(params.code),
      text: this.buildEnrollmentText(params.code),
    });
    return result.data?.id
      ? { ok: true }
      : { ok: false, message: 'Falha ao enviar e-mail' };
  }

  async sendPasswordReset(params: {
    email: string;
    code: string;
    resetUrl: string;
  }): Promise<AuthEmailSendResult> {
    if (!this.resend || !this.from) {
      return { ok: false, message: EMAIL_NOT_CONFIGURED };
    }

    const host = params.email.split('@')[1] ?? 'sistema';
    const result = await this.resend.emails.send({
      from: this.from,
      to: params.email,
      subject: 'Redefinir senha — Valepan Interno',
      html: buildPasswordResetEmailHtml({
        code: params.code,
        resetUrl: params.resetUrl,
        host,
      }),
      text: buildPasswordResetEmailText({
        code: params.code,
        resetUrl: params.resetUrl,
        host,
      }),
    });

    if (!result.data?.id) {
      return {
        ok: false,
        message: result.error?.message ?? 'Falha ao enviar e-mail',
      };
    }
    return { ok: true };
  }

  private buildEnrollmentHtml(code: string): string {
    return `<div style="font-family:Arial,sans-serif;color:#3F0313;max-width:480px;margin:auto;padding:32px"><h1>Proteja seu acesso</h1><p>Digite este código na tela de cadastro do Sistema de Produção Valepan:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>O código vale por 10 minutos. Depois de confirmar, você poderá usar este e-mail para entrar no sistema.</p><p>Não compartilhe este código. Se não foi você quem solicitou, ignore esta mensagem.</p></div>`;
  }

  private buildEnrollmentText(code: string): string {
    return `Confirme seu e-mail no Sistema de Produção Valepan. Digite o código ${code} na tela de cadastro. Válido por 10 minutos. Não compartilhe este código. Se não solicitou, ignore esta mensagem.`;
  }
}

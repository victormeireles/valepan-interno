import type { EmailConfig } from 'next-auth/providers/email';
import { Resend } from 'resend';

export const MAGIC_LINK_SUBJECT = 'Acesso ao Sistema de Produção Valepan';
export const MAGIC_LINK_MAX_AGE_SECONDS = 60 * 60;

export type MagicLinkProviderConfig = {
  apiKey: string;
  from: string;
};

/**
 * Provider e-mail (magic link) via Resend — template simples pt-BR.
 */
export class MagicLinkEmailSender {
  private readonly resend: Resend;

  constructor(private readonly config: MagicLinkProviderConfig) {
    this.resend = new Resend(config.apiKey);
  }

  buildHtml(url: string): string {
    return `
      <div style="font-family: sans-serif; line-height: 1.5; color: #1c1917;">
        <p>Olá,</p>
        <p>Use o link abaixo para acessar o <strong>Sistema de Produção Valepan</strong>:</p>
        <p><a href="${url}" style="color: #d97706;">Entrar no sistema</a></p>
        <p style="color: #78716c; font-size: 13px;">O link expira em 1 hora.</p>
        <p style="color: #78716c; font-size: 13px;">Se você não solicitou este acesso, ignore este e-mail.</p>
      </div>
    `.trim();
  }

  buildText(url: string): string {
    return [
      'Olá,',
      '',
      'Use o link abaixo para acessar o Sistema de Produção Valepan:',
      url,
      '',
      'O link expira em 1 hora.',
      'Se você não solicitou este acesso, ignore este e-mail.',
    ].join('\n');
  }

  async send(email: string, url: string): Promise<void> {
    const result = await this.resend.emails.send({
      from: this.config.from,
      to: email,
      subject: MAGIC_LINK_SUBJECT,
      html: this.buildHtml(url),
      text: this.buildText(url),
    });

    if (!result.data?.id) {
      throw new Error(result.error?.message ?? 'Failed to send email');
    }
  }
}

export function createMagicLinkProvider(
  config?: Partial<MagicLinkProviderConfig>,
): EmailConfig {
  const apiKey = config?.apiKey ?? process.env.RESEND_API_KEY ?? '';
  const from = config?.from ?? process.env.RESEND_FROM_EMAIL ?? '';

  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    from: from || 'noreply@valepan.com',
    maxAge: MAGIC_LINK_MAX_AGE_SECONDS,
    async sendVerificationRequest({ identifier: email, url }) {
      if (!apiKey || !from) {
        throw new Error(
          'Missing Resend configuration (RESEND_API_KEY/RESEND_FROM_EMAIL)',
        );
      }
      const sender = new MagicLinkEmailSender({ apiKey, from });
      await sender.send(email, url);
    },
  };
}

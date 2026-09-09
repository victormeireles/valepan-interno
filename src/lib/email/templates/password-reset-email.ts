export type PasswordResetEmailProps = {
  code: string;
  resetUrl: string;
  host: string;
};

export function buildPasswordResetEmailHtml({
  code,
  resetUrl,
  host,
}: PasswordResetEmailProps): string {
  const escapedHost = host.replace(/\./g, '&#8203;.');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir senha — Valepan Interno</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f5f5f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #3F0313; padding: 32px; text-align: center;">
              <div style="color: #C6A848; font-size: 28px; font-weight: 800; letter-spacing: 2px;">VALEPAN</div>
              <div style="color: #FFFFFF; font-size: 13px; letter-spacing: 2px; margin-top: 8px;">SISTEMA DE PRODUÇÃO</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px; color: #1c1917; font-size: 22px; text-align: center;">
                Redefinir senha
              </h1>
              <p style="margin: 0 0 24px; color: #57534e; font-size: 15px; line-height: 1.5; text-align: center;">
                Use o código abaixo para criar uma nova senha:
              </p>
              <div style="text-align: center; margin: 0 0 28px;">
                <span style="display: inline-block; padding: 16px 28px; background-color: #fafaf9; border: 2px solid #3F0313; border-radius: 10px; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace; color: #3F0313;">
                  ${code}
                </span>
              </div>
              <p style="margin: 0 0 20px; color: #78716c; font-size: 13px; text-align: center;">
                O código expira em <strong>10 minutos</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #d97706; color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px;">
                      Abrir redefinição de senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #a8a29e; font-size: 12px; line-height: 1.5; text-align: center;">
                Se você não pediu para redefinir a senha, ignore este e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #fafaf9; text-align: center;">
              <p style="margin: 0; color: #78716c; font-size: 12px;">
                Enviado para ${escapedHost}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildPasswordResetEmailText({
  code,
  resetUrl,
  host,
}: PasswordResetEmailProps): string {
  return [
    'Redefinir senha — Valepan Interno',
    '',
    `Código: ${code}`,
    'Expira em 10 minutos.',
    '',
    `Abrir redefinição: ${resetUrl}`,
    '',
    'Se você não pediu isso, ignore este e-mail.',
    `(Enviado para ${host})`,
  ].join('\n');
}

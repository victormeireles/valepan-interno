import { describe, expect, it } from 'vitest';
import {
  buildLoginOtpEmailHtml,
  buildLoginOtpEmailText,
} from './login-otp-email';

describe('login-otp-email', () => {
  it('inclui codigo, aviso de mesmo aparelho e link de verificacao', () => {
    const html = buildLoginOtpEmailHtml({
      code: '123456',
      verifyUrl: 'https://interno.valepan.com/login/verify?email=a%40b.com',
      host: 'valepan.com',
    });
    expect(html).toContain('123456');
    expect(html).toContain('mesmo aparelho');
    expect(html).toContain('Abrir tela de verificação');
    expect(html).toContain('Valepan Interno');
    expect(html).not.toContain('Pedidos');

    const text = buildLoginOtpEmailText({
      code: '123456',
      verifyUrl: 'https://interno.valepan.com/login/verify?email=a%40b.com',
      host: 'valepan.com',
    });
    expect(text).toContain('123456');
    expect(text).toContain('mesmo aparelho');
  });
});

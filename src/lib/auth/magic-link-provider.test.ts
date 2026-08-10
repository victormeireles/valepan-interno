import { describe, expect, it } from 'vitest';
import {
  MAGIC_LINK_MAX_AGE_SECONDS,
  MAGIC_LINK_SUBJECT,
  MagicLinkEmailSender,
  createMagicLinkProvider,
} from './magic-link-provider';

describe('magic-link-provider', () => {
  it('usa subject sem emoji e maxAge de 1h', () => {
    expect(MAGIC_LINK_SUBJECT).toBe('Acesso ao Sistema de Produção Valepan');
    expect(MAGIC_LINK_MAX_AGE_SECONDS).toBe(3600);

    const provider = createMagicLinkProvider({
      apiKey: 'test-key',
      from: 'Sistema Produção <noreply@valepan.com>',
    });

    expect(provider.maxAge).toBe(3600);
    expect(provider.id).toBe('email');
  });

  it('gera HTML e texto com o link', () => {
    const sender = new MagicLinkEmailSender({
      apiKey: 'test-key',
      from: 'Sistema Produção <noreply@valepan.com>',
    });
    const url = 'https://interno.valepan.com/api/auth/callback/email?token=abc';

    expect(sender.buildHtml(url)).toContain(url);
    expect(sender.buildText(url)).toContain(url);
    expect(sender.buildHtml(url)).toContain('Sistema de Produção Valepan');
  });
});

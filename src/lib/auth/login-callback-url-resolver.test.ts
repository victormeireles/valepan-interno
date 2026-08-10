import { describe, expect, it } from 'vitest';
import { LoginCallbackUrlResolver } from '@/lib/auth/login-callback-url-resolver';

describe('LoginCallbackUrlResolver', () => {
  const resolver = new LoginCallbackUrlResolver();

  it('aceita caminhos relativos seguros', () => {
    expect(resolver.resolve('/login/qr/aprovar?id=abc')).toBe(
      '/login/qr/aprovar?id=abc',
    );
  });

  it('rejeita urls externas e protocol-relative', () => {
    expect(resolver.resolve('https://evil.test/x')).toBe('/');
    expect(resolver.resolve('//evil.test')).toBe('/');
    expect(resolver.resolve(null, '/ordens-producao')).toBe('/ordens-producao');
  });
});

import { describe, expect, it } from 'vitest';
import { LoginQrTokenHasher } from '@/lib/auth/qr/login-qr-token-hasher';

describe('LoginQrTokenHasher', () => {
  const hasher = new LoginQrTokenHasher();

  it('gera token nao vazio e hash deterministico', () => {
    const token = hasher.createToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    const hash = hasher.hash(token);
    expect(hasher.matches(token, hash)).toBe(true);
    expect(hasher.matches('outro', hash)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';

describe('LoginQrRateLimiter', () => {
  it('bloqueia apos atingir o max na janela', () => {
    const limiter = new LoginQrRateLimiter(60_000, 2);
    const now = 1_000_000;

    expect(limiter.allow('ip-1', now)).toBe(true);
    expect(limiter.allow('ip-1', now + 1)).toBe(true);
    expect(limiter.allow('ip-1', now + 2)).toBe(false);
  });

  it('libera novamente apos a janela passar', () => {
    const limiter = new LoginQrRateLimiter(1_000, 1);
    const now = 5_000;

    expect(limiter.allow('ip-2', now)).toBe(true);
    expect(limiter.allow('ip-2', now + 500)).toBe(false);
    expect(limiter.allow('ip-2', now + 1_001)).toBe(true);
  });
});

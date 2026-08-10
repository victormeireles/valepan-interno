import { afterEach, describe, expect, it } from 'vitest';
import { getAuthSecret } from './auth-secret';

describe('getAuthSecret', () => {
  const originalAuth = process.env.AUTH_SECRET;
  const originalNextAuth = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    if (originalAuth === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalAuth;

    if (originalNextAuth === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalNextAuth;
  });

  it('lança erro quando AUTH_SECRET e NEXTAUTH_SECRET estão ausentes', () => {
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    expect(() => getAuthSecret()).toThrow('Missing AUTH_SECRET');
  });

  it('prioriza AUTH_SECRET sobre NEXTAUTH_SECRET', () => {
    process.env.AUTH_SECRET = 'auth-primary';
    process.env.NEXTAUTH_SECRET = 'nextauth-fallback';

    expect(getAuthSecret()).toBe('auth-primary');
  });

  it('usa NEXTAUTH_SECRET quando AUTH_SECRET está ausente', () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = 'nextauth-only';

    expect(getAuthSecret()).toBe('nextauth-only');
  });
});

import { describe, expect, it } from 'vitest';
import { LoginEmailOtpHasher } from './login-email-otp-hasher';

describe('LoginEmailOtpHasher', () => {
  const hasher = new LoginEmailOtpHasher();

  it('gera codigo de 6 digitos numericos', () => {
    const code = hasher.createCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('hash e matches sao deterministicos', () => {
    const code = '123456';
    const hash = hasher.hash(code);
    expect(hasher.matches(code, hash)).toBe(true);
    expect(hasher.matches('000000', hash)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { PasswordHasher } from './password-hasher';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('gera hash verificavel e rejeita senha errada', () => {
    const hash = hasher.hash('senha-segura-12');
    expect(hash).not.toBe('senha-segura-12');
    expect(hasher.verify('senha-segura-12', hash)).toBe(true);
    expect(hasher.verify('outra', hash)).toBe(false);
  });
});

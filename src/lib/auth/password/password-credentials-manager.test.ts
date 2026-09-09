import { describe, expect, it, vi } from 'vitest';
import { PasswordCredentialsManager } from './password-credentials-manager';
import { PasswordHasher } from './password-hasher';

function createUserQueryMock(user: Record<string, unknown> | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: user, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  };
}

describe('PasswordCredentialsManager', () => {
  const hasher = new PasswordHasher();
  const passwordHash = hasher.hash('senha-correta-12');

  it('autentica por e-mail com senha correta', async () => {
    const supabase = createUserQueryMock({
      id: 'u1',
      email: 'a@b.com',
      nome: 'Ana',
      ativo: true,
      password_hash: passwordHash,
      password_must_change: false,
    });
    const manager = new PasswordCredentialsManager(supabase as never, hasher);
    const result = await manager.authenticate('a@b.com', 'senha-correta-12');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe('u1');
    }
  });

  it('autentica por telefone formatado', async () => {
    const supabase = createUserQueryMock({
      id: 'u2',
      email: null,
      nome: 'Bob',
      ativo: true,
      password_hash: passwordHash,
      password_must_change: false,
    });
    const manager = new PasswordCredentialsManager(supabase as never, hasher);
    const result = await manager.authenticate(
      '(11) 98888-7777',
      'senha-correta-12',
    );
    expect(result.ok).toBe(true);
  });

  it('recusa usuario inativo', async () => {
    const supabase = createUserQueryMock({
      id: 'u3',
      email: 'x@y.com',
      nome: 'X',
      ativo: false,
      password_hash: passwordHash,
      password_must_change: false,
    });
    const manager = new PasswordCredentialsManager(supabase as never, hasher);
    const result = await manager.authenticate('x@y.com', 'senha-correta-12');
    expect(result).toEqual({ ok: false, reason: 'inactive' });
  });

  it('recusa senha errada', async () => {
    const supabase = createUserQueryMock({
      id: 'u4',
      email: 'x@y.com',
      nome: 'X',
      ativo: true,
      password_hash: passwordHash,
      password_must_change: false,
    });
    const manager = new PasswordCredentialsManager(supabase as never, hasher);
    const result = await manager.authenticate('x@y.com', 'errada');
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('recusa conta sem password_hash', async () => {
    const supabase = createUserQueryMock({
      id: 'u5',
      email: 'x@y.com',
      nome: 'X',
      ativo: true,
      password_hash: null,
      password_must_change: false,
    });
    const manager = new PasswordCredentialsManager(supabase as never, hasher);
    const result = await manager.authenticate('x@y.com', 'qualquer');
    expect(result).toEqual({ ok: false, reason: 'no_password' });
  });
});

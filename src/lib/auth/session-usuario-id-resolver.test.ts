import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

describe('SessionUsuarioIdResolver', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it('devolve o id da sessão', async () => {
    authMock.mockResolvedValue({ user: { id: 'usuario-1' } });
    const { SessionUsuarioIdResolver } = await import('./session-usuario-id-resolver');
    await expect(new SessionUsuarioIdResolver().resolve()).resolves.toBe('usuario-1');
  });

  it('devolve nulo sem sessão', async () => {
    authMock.mockResolvedValue(null);
    const { SessionUsuarioIdResolver } = await import('./session-usuario-id-resolver');
    await expect(new SessionUsuarioIdResolver().resolve()).resolves.toBeNull();
  });
});

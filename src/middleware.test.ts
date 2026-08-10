import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getTokenMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

vi.mock('@/lib/auth/auth-secret', () => ({
  getAuthSecret: () => 'test-secret',
  getAuthTokenCookieName: (protocol: string) =>
    protocol === 'https:'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
}));

import { middleware } from './middleware';

describe('middleware auth cookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTokenMock.mockResolvedValue({
      sub: 'user-1',
      isSystemOwner: true,
      modulosEfetivos: {},
    });
  });

  it('passa salt/cookieName Secure em HTTPS para decodificar a sessão', async () => {
    const req = new NextRequest('https://interno.valepan.com/');
    await middleware(req);

    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'test-secret',
        cookieName: '__Secure-authjs.session-token',
        salt: '__Secure-authjs.session-token',
        secureCookie: true,
      }),
    );
  });

  it('passa cookie sem Secure em HTTP local', async () => {
    const req = new NextRequest('http://localhost:3000/');
    await middleware(req);

    expect(getTokenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cookieName: 'authjs.session-token',
        salt: 'authjs.session-token',
        secureCookie: false,
      }),
    );
  });
});

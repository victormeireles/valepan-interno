import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getTokenMock, isEnabledMock, logOnceMock } = vi.hoisted(() => ({
  getTokenMock: vi.fn(),
  isEnabledMock: vi.fn(() => false),
  logOnceMock: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

vi.mock('@/lib/auth/dev-bypass', () => ({
  AuthDevBypass: {
    isEnabled: isEnabledMock,
    logOnce: logOnceMock,
  },
}));

vi.mock('@/lib/auth/auth-secret', () => ({
  getAuthSecret: () => 'test-secret',
  getAuthTokenCookieName: (protocol: string) =>
    protocol === 'https:'
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token',
}));

import { middleware } from './middleware';

function enrolledUserResponse(email: string | null = 'ana@valepan.com') {
  return Response.json([
    { ativo: true, email, password_must_change: false },
  ]);
}

describe('middleware auth cookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEnabledMock.mockReturnValue(false);
    getTokenMock.mockResolvedValue({
      sub: 'user-1',
      isSystemOwner: true,
      modulosEfetivos: {},
    });
    process.env.SUPABASE_URL = 'https://supabase.test';
    process.env.SERVICE_ROLE = 'service-role';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => enrolledUserResponse()),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('libera rotas sem JWT quando AUTH_DEV_BYPASS está ativo', async () => {
    isEnabledMock.mockReturnValue(true);
    const req = new NextRequest('http://localhost:3001/');
    const res = await middleware(req);

    expect(getTokenMock).not.toHaveBeenCalled();
    expect(logOnceMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it.each([null, '', '   '])(
    'exige cadastro para e-mail %j e preserva destino e sessão',
    async (email) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => enrolledUserResponse(email)),
      );
      const response = await middleware(
        new NextRequest('http://localhost/ordens-producao?pagina=2'),
      );
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/completar-email');
      expect(location.searchParams.get('returnTo')).toBe(
        '/ordens-producao?pagina=2',
      );
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );

  it('nao repete POSTs de outras paginas na tela de cadastro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => enrolledUserResponse(null)),
    );
    const response = await middleware(
      new NextRequest('http://localhost/ordens-producao', { method: 'POST' }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: 'EmailRequired',
      redirectTo: '/completar-email?returnTo=%2Fordens-producao',
    });
  });

  it('password_must_change bloqueia o app', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json([
          {
            ativo: true,
            email: 'ana@valepan.com',
            password_must_change: true,
          },
        ]),
      ),
    );
    const response = await middleware(
      new NextRequest('http://localhost/ordens-producao'),
    );
    expect(response.headers.get('location')).toContain('/login/definir-senha');
  });
});

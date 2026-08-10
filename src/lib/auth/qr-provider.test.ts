import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQrProvider } from '@/lib/auth/qr-provider';

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(),
  })),
  redeemExchangeToken: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}));

vi.mock('@/lib/auth/qr/login-qr-request-manager', () => ({
  LoginQrRequestManager: class LoginQrRequestManagerMock {
    redeemExchangeToken = mocks.redeemExchangeToken;
  },
}));

const request = new Request('https://valepan.test/api/auth/callback/qr');

type QrAuthorize = (
  credentials: Partial<Record<'exchangeToken', unknown>>,
  request: Request,
) => unknown;

interface QrProviderWithOptions {
  options: {
    authorize: QrAuthorize;
  };
}

function getAuthorize(): QrAuthorize {
  return (createQrProvider() as unknown as QrProviderWithOptions).options
    .authorize;
}

describe('createQrProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null para token invalido', async () => {
    mocks.redeemExchangeToken.mockResolvedValue(null);

    const result = await getAuthorize()(
      { exchangeToken: 'token-invalido' },
      request,
    );

    expect(result).toBeNull();
  });

  it('retorna null para usuario inativo', async () => {
    mocks.redeemExchangeToken.mockResolvedValue({ usuarioId: 'usuario-1' });
    mocks.createServiceRoleClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'usuario-1',
                email: 'a@b.com',
                nome: 'User',
                ativo: false,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const result = await getAuthorize()(
      { exchangeToken: 'token-ok' },
      request,
    );

    expect(result).toBeNull();
  });

  it('retorna user quando token e usuario sao validos', async () => {
    mocks.redeemExchangeToken.mockResolvedValue({ usuarioId: 'usuario-1' });
    mocks.createServiceRoleClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: 'usuario-1',
                email: 'a@b.com',
                nome: 'User',
                ativo: true,
              },
              error: null,
            }),
          }),
        }),
      }),
    } as never);

    const result = await getAuthorize()(
      { exchangeToken: 'token-ok' },
      request,
    );

    expect(result).toEqual({
      id: 'usuario-1',
      email: 'a@b.com',
      name: 'User',
    });
  });
});

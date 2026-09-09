import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPasswordProvider } from './password-provider';

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
}));

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  createServiceRoleClient: () => ({}),
}));

vi.mock('@/lib/auth/password/password-credentials-manager', () => ({
  PasswordCredentialsManager: class {
    authenticate = mocks.authenticate;
  },
}));

const request = new Request(
  'https://interno.test/api/auth/callback/password',
);

type Authorize = (
  credentials: Partial<Record<'identifier' | 'password', unknown>>,
  request: Request,
) => unknown;

function getAuthorize(): Authorize {
  return (
    createPasswordProvider() as unknown as { options: { authorize: Authorize } }
  ).options.authorize;
}

describe('createPasswordProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('nao vaza se a conta tem senha — falha generica', async () => {
    mocks.authenticate.mockResolvedValue({ ok: false, reason: 'no_password' });
    const result = await getAuthorize()(
      { identifier: 'a@b.com', password: 'x' },
      request,
    );
    expect(result).toBeNull();
  });

  it('autentica por identificador com senha correta', async () => {
    mocks.authenticate.mockResolvedValue({
      ok: true,
      user: { id: 'u1', email: 'a@b.com', name: 'Ana', passwordMustChange: false },
    });
    const result = await getAuthorize()(
      { identifier: 'a@b.com', password: 'senha-correta-12' },
      request,
    );
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
    });
  });
});

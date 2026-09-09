import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmailOtpProvider } from './email-otp-provider';

const mocks = vi.hoisted(() => ({
  getByEmail: vi.fn(),
  validateAndConsume: vi.fn(),
}));

vi.mock('@/lib/clients/supabase-client-factory', () => ({
  createServiceRoleClient: () => ({}),
}));

vi.mock('@/lib/auth/usuarios-email-lookup', () => ({
  UsuariosEmailLookup: class {
    getByEmail = mocks.getByEmail;
  },
}));

vi.mock('@/lib/auth/email-otp/login-email-otp-manager', () => ({
  LoginEmailOtpManager: class {
    validateAndConsume = mocks.validateAndConsume;
  },
}));

const request = new Request(
  'https://interno.test/api/auth/callback/email-otp',
);

type Authorize = (
  credentials: Partial<Record<'email' | 'codigo', unknown>>,
  request: Request,
) => unknown;

function getAuthorize(): Authorize {
  return (
    createEmailOtpProvider() as unknown as { options: { authorize: Authorize } }
  ).options.authorize;
}

describe('createEmailOtpProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retorna null para codigo invalido', async () => {
    mocks.getByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      nome: 'Ana',
      ativo: true,
    });
    mocks.validateAndConsume.mockResolvedValue({
      ok: false,
      reason: 'invalid',
      message: 'errado',
    });

    const result = await getAuthorize()(
      { email: 'a@b.com', codigo: '000000' },
      request,
    );
    expect(result).toBeNull();
  });

  it('abre sessao com usuarios.id no codigo valido', async () => {
    mocks.getByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      nome: 'Ana',
      ativo: true,
    });
    mocks.validateAndConsume.mockResolvedValue({
      ok: true,
      usuarioId: 'u1',
    });

    const result = await getAuthorize()(
      { email: 'a@b.com', codigo: '123456' },
      request,
    );
    expect(result).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
    });
  });
});

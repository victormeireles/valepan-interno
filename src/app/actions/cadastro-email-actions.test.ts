import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginEmailOtpHasher } from '@/lib/auth/email-otp/login-email-otp-hasher';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
  configured: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/clients/supabase-client-factory', () => ({
  createServiceRoleClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock('@/lib/email/auth-email-sender', () => ({
  AuthEmailSender: class {
    isConfigured = mocks.configured;
    sendEmailEnrollment = mocks.send;
  },
}));

import {
  confirmarCadastroEmail,
  solicitarCadastroEmail,
} from './cadastro-email-actions';

describe('ações de cadastro de e-mail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: 'current-user', email: '' } });
    mocks.rpc.mockResolvedValue({ data: 'ok', error: null });
    mocks.configured.mockReturnValue(true);
    mocks.send.mockResolvedValue({ ok: true });
  });

  it('rejeita solicitação e confirmação sem sessão', async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await solicitarCadastroEmail('novo@example.com')).success).toBe(
      false,
    );
    expect(
      (await confirmarCadastroEmail('novo@example.com', '123456')).success,
    ).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('envia para o endereço normalizado e vincula hash ao ID da sessão', async () => {
    expect((await solicitarCadastroEmail(' NOVO@Example.com ')).success).toBe(
      true,
    );
    const sent = mocks.send.mock.calls[0][0];
    expect(sent.email).toBe('novo@example.com');
    expect(sent.code).toMatch(/^\d{6}$/);
    expect(mocks.rpc).toHaveBeenCalledWith('solicitar_cadastro_email', {
      p_usuario_id: 'current-user',
      p_email: sent.email,
      p_code_hash: new LoginEmailOtpHasher().hash(sent.code),
    });
  });

  it.each([
    'email_in_use',
    'blocked',
    'rate_limited',
    'inactive',
    'already_registered',
  ])('não envia quando o banco retorna %s', async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    expect((await solicitarCadastroEmail('novo@example.com')).success).toBe(
      false,
    );
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it('valida configuração antes de consumir a cota de envio', async () => {
    mocks.configured.mockReturnValue(false);
    expect((await solicitarCadastroEmail('novo@example.com')).success).toBe(
      false,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('permite tentar novamente se provedor ou banco falhar', async () => {
    mocks.send.mockRejectedValue(new Error('provider down'));
    expect(
      (await solicitarCadastroEmail('novo@example.com')).message,
    ).toContain('não foi desconectado');
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('db down') });
    expect(
      (await confirmarCadastroEmail('novo@example.com', '123456')).success,
    ).toBe(false);
  });

  it('confirma por ID da sessão, e-mail e hash; nunca aceita ID informado pelo formulário', async () => {
    expect(
      (await confirmarCadastroEmail(' NOVO@Example.com ', '123456')).success,
    ).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('confirmar_cadastro_email', {
      p_usuario_id: 'current-user',
      p_email: 'novo@example.com',
      p_code_hash: new LoginEmailOtpHasher().hash('123456'),
    });
  });
});

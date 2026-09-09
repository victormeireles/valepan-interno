import { describe, expect, it, vi } from 'vitest';
import { EmailLoginOtpRequestManager } from './email-login-otp-request-manager';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';

function createDeps(overrides?: {
  user?: { id: string; email: string; nome: string; ativo: boolean } | null;
  sendOk?: boolean;
}) {
  const sendLoginOtp = vi.fn(async () =>
    overrides?.sendOk === false
      ? { ok: false as const, message: 'Serviço de e-mail não configurado' }
      : { ok: true as const },
  );
  const create = vi.fn(async () => ({
    code: '123456',
    expiresAt: new Date().toISOString(),
  }));
  return {
    lookup: {
      getByEmail: vi.fn(async () => overrides?.user ?? null),
    },
    otp: { create },
    sender: { sendLoginOtp },
    limiter: new LoginQrRateLimiter(60_000, 5),
    appUrl: { resolve: () => 'https://interno.valepan.com' },
    sendLoginOtp,
    create,
  };
}

describe('EmailLoginOtpRequestManager', () => {
  it('nao envia OTP para e-mail desconhecido', async () => {
    const deps = createDeps({ user: null });
    const manager = new EmailLoginOtpRequestManager(deps as never);
    const result = await manager.solicitar('sumido@valepan.com', '1.1.1.1');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/Usuário não encontrado/);
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.sendLoginOtp).not.toHaveBeenCalled();
  });

  it('nao envia OTP para usuario inativo', async () => {
    const deps = createDeps({
      user: {
        id: 'u1',
        email: 'x@valepan.com',
        nome: 'X',
        ativo: false,
      },
    });
    const manager = new EmailLoginOtpRequestManager(deps as never);
    const result = await manager.solicitar('x@valepan.com', '1.1.1.1');
    expect(result.success).toBe(false);
    expect(deps.sendLoginOtp).not.toHaveBeenCalled();
  });

  it('cria OTP e envia e-mail para usuario ativo', async () => {
    const deps = createDeps({
      user: {
        id: 'u1',
        email: 'ana@valepan.com',
        nome: 'Ana',
        ativo: true,
      },
    });
    const manager = new EmailLoginOtpRequestManager(deps as never);
    const result = await manager.solicitar(' Ana@Valepan.com ', '1.1.1.1');
    expect(result.success).toBe(true);
    expect(deps.create).toHaveBeenCalledWith('u1', 'login');
    expect(deps.sendLoginOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@valepan.com',
        code: '123456',
      }),
    );
  });
});

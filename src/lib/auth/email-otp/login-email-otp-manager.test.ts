import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginEmailOtpManager } from './login-email-otp-manager';
import { LoginEmailOtpHasher } from './login-email-otp-hasher';
import { LOGIN_EMAIL_OTP_MAX_TENTATIVAS } from './login-email-otp-constants';

type OtpRow = {
  id: string;
  usuario_id: string;
  code_hash: string;
  purpose: string;
  expires_at: string;
  tentativas: number;
  bloqueado_ate: string | null;
};

/**
 * Mock mínimo do client Supabase usado pelo LoginEmailOtpManager.
 */
class FakeOtpSupabase {
  rows: OtpRow[] = [];

  from() {
    const getRows = () => this.rows;
    const setRows = (next: OtpRow[]) => {
      this.rows = next;
    };

    return {
      insert: async (payload: Record<string, unknown>) => {
        const current = getRows();
        const row: OtpRow = {
          id: `otp-${current.length + 1}`,
          usuario_id: String(payload.usuario_id),
          code_hash: String(payload.code_hash),
          purpose: String(payload.purpose),
          expires_at: String(payload.expires_at),
          tentativas: Number(payload.tentativas ?? 0),
          bloqueado_ate: (payload.bloqueado_ate as string | null) ?? null,
        };
        setRows([row, ...current]);
        return { data: row, error: null };
      },
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: getRows()[0] ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, value: string) => {
          setRows(
            getRows().map((row) => {
              if (row.id !== value) return row;
              return {
                ...row,
                tentativas:
                  payload.tentativas !== undefined
                    ? Number(payload.tentativas)
                    : row.tentativas,
                bloqueado_ate:
                  payload.bloqueado_ate !== undefined
                    ? (payload.bloqueado_ate as string | null)
                    : row.bloqueado_ate,
              };
            }),
          );
          return { data: null, error: null };
        },
      }),
      delete: () => ({
        eq: (_col: string, value: string) => {
          const finish = async () => {
            setRows(
              getRows().filter(
                (row) => row.id !== value && row.usuario_id !== value,
              ),
            );
            return { data: null, error: null };
          };
          return {
            eq: finish,
            then: (
              resolve: (value: { data: null; error: null }) => void,
            ) => {
              void finish().then(resolve);
            },
          };
        },
      }),
    };
  }
}

describe('LoginEmailOtpManager', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cria codigo com hash e valida consumo', async () => {
    const hasher = new LoginEmailOtpHasher();
    const supabase = new FakeOtpSupabase();
    const manager = new LoginEmailOtpManager(supabase as never, hasher);

    const created = await manager.create('user-1', 'login');
    expect(created.code).toMatch(/^\d{6}$/);

    const result = await manager.validateAndConsume(
      'user-1',
      created.code,
      'login',
    );
    expect(result.ok).toBe(true);
  });

  it('nao reutiliza codigo apos sucesso', async () => {
    const hasher = new LoginEmailOtpHasher();
    const supabase = new FakeOtpSupabase();
    const manager = new LoginEmailOtpManager(supabase as never, hasher);
    const created = await manager.create('user-1', 'login');

    await manager.validateAndConsume('user-1', created.code, 'login');
    const reused = await manager.validateAndConsume(
      'user-1',
      created.code,
      'login',
    );
    expect(reused.ok).toBe(false);
    if (!reused.ok) {
      expect(reused.reason).toBe('not_found');
    }
  });

  it('bloqueia na quinta tentativa incorreta', async () => {
    const hasher = new LoginEmailOtpHasher();
    const code = '123456';
    const supabase = new FakeOtpSupabase();
    supabase.rows = [
      {
        id: 'otp-1',
        usuario_id: 'user-1',
        code_hash: hasher.hash(code),
        purpose: 'login',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        tentativas: LOGIN_EMAIL_OTP_MAX_TENTATIVAS - 1,
        bloqueado_ate: null,
      },
    ];
    const manager = new LoginEmailOtpManager(supabase as never, hasher);

    const result = await manager.validateAndConsume(
      'user-1',
      '000000',
      'login',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('blocked');
    }
  });

  it('rejeita codigo expirado', async () => {
    const hasher = new LoginEmailOtpHasher();
    const code = '123456';
    const supabase = new FakeOtpSupabase();
    supabase.rows = [
      {
        id: 'otp-1',
        usuario_id: 'user-1',
        code_hash: hasher.hash(code),
        purpose: 'login',
        expires_at: new Date(Date.now() - 1_000).toISOString(),
        tentativas: 0,
        bloqueado_ate: null,
      },
    ];
    const manager = new LoginEmailOtpManager(supabase as never, hasher);

    const result = await manager.validateAndConsume('user-1', code, 'login');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('expired');
    }
  });

  it('nao encontra otp de purpose diferente', async () => {
    const hasher = new LoginEmailOtpHasher();
    const supabase = new FakeOtpSupabase();
    supabase.rows = [];
    const manager = new LoginEmailOtpManager(supabase as never, hasher);
    const result = await manager.validateAndConsume(
      'user-1',
      '123456',
      'reset',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not_found');
    }
  });
});

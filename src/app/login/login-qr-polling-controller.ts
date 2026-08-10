import { LOGIN_QR_POLL_INTERVAL_MS } from '@/lib/auth/qr/login-qr-constants';

export type LoginQrClientState =
  | { kind: 'loading' }
  | { kind: 'waiting'; approveUrl: string; expiresAt: string; id: string }
  | { kind: 'signing-in' }
  | { kind: 'error'; message: string };

type CreateResponse = {
  id?: string;
  expiresAt?: string;
  approveUrl?: string;
  error?: string;
};

type StatusResponse = {
  status?: 'pending' | 'approved' | 'consumed' | 'expired';
  exchangeToken?: string;
  error?: string;
};

type SignInFn = (provider: string, options: Record<string, unknown>) => Promise<{
  error?: string | null;
  ok?: boolean;
  url?: string | null;
} | undefined>;

/**
 * Controla create + polling + signIn do login QR na TV.
 */
export class LoginQrPollingController {
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private onUpdate: ((state: LoginQrClientState) => void) | null = null;
  private currentId: string | null = null;

  constructor(private readonly signIn: SignInFn) {}

  start(onUpdate: (state: LoginQrClientState) => void): void {
    this.stop();
    this.stopped = false;
    this.onUpdate = onUpdate;
    void this.bootstrap();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onUpdate = null;
    this.currentId = null;
  }

  private emit(state: LoginQrClientState): void {
    this.onUpdate?.(state);
  }

  private async bootstrap(): Promise<void> {
    this.emit({ kind: 'loading' });
    const created = await this.createRequest();
    if (this.stopped || !created) {
      return;
    }
    this.currentId = created.id;
    this.emit({
      kind: 'waiting',
      id: created.id,
      approveUrl: created.approveUrl,
      expiresAt: created.expiresAt,
    });
    this.timer = setInterval(() => {
      void this.pollOnce();
    }, LOGIN_QR_POLL_INTERVAL_MS);
  }

  private async createRequest(): Promise<{
    id: string;
    approveUrl: string;
    expiresAt: string;
  } | null> {
    try {
      const response = await fetch('/api/auth/qr/create', { method: 'POST' });
      const body = (await response.json()) as CreateResponse;
      if (
        !response.ok ||
        typeof body.id !== 'string' ||
        typeof body.approveUrl !== 'string' ||
        typeof body.expiresAt !== 'string'
      ) {
        this.emit({
          kind: 'error',
          message: 'Não foi possível gerar o QR. Tente novamente.',
        });
        return null;
      }
      return {
        id: body.id,
        approveUrl: body.approveUrl,
        expiresAt: body.expiresAt,
      };
    } catch {
      this.emit({
        kind: 'error',
        message: 'Erro de rede ao gerar o QR.',
      });
      return null;
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.stopped || !this.currentId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/auth/qr/status?id=${encodeURIComponent(this.currentId)}`,
      );
      const body = (await response.json()) as StatusResponse;
      if (!response.ok) {
        return;
      }

      if (body.status === 'pending') {
        return;
      }

      if (body.status === 'expired' || body.status === 'consumed') {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        await this.bootstrap();
        return;
      }

      if (body.status === 'approved' && typeof body.exchangeToken === 'string') {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.emit({ kind: 'signing-in' });
        const result = await this.signIn('qr', {
          exchangeToken: body.exchangeToken,
          redirect: false,
          callbackUrl: '/',
        });
        if (result?.error) {
          this.emit({
            kind: 'error',
            message: 'Falha ao entrar com o QR. Gere um novo código.',
          });
          return;
        }
        window.location.href = '/';
      }
    } catch {
      // Mantém polling; regenera ao expirar.
    }
  }
}

import type { Session } from 'next-auth';

const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

/** UUID estável só para sessão sintética local (sem linha em `usuarios`). */
const FALLBACK_USER_ID = '00000000-0000-4000-8000-000000000001';

type DevBypassEnv = {
  NODE_ENV?: string;
  VERCEL?: string;
  AUTH_DEV_BYPASS?: string;
  AUTH_DEV_BYPASS_USER_ID?: string;
};

/**
 * Bypass de login apenas em `next dev` local.
 * Nunca liga em production, test, `next start` ou deploys Vercel.
 */
export class AuthDevBypass {
  private static hasLogged = false;

  static readProcessEnv(): DevBypassEnv {
    return {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      AUTH_DEV_BYPASS: process.env.AUTH_DEV_BYPASS,
      AUTH_DEV_BYPASS_USER_ID: process.env.AUTH_DEV_BYPASS_USER_ID,
    };
  }

  static isEnabled(env: DevBypassEnv = AuthDevBypass.readProcessEnv()): boolean {
    if (env.NODE_ENV !== 'development') return false;
    if (env.VERCEL === '1') return false;
    return this.isFlagOn(env.AUTH_DEV_BYPASS);
  }

  static buildSession(
    env: DevBypassEnv = AuthDevBypass.readProcessEnv(),
  ): Session {
    return {
      expires: '2099-12-31T23:59:59.000Z',
      user: {
        id: this.resolveUsuarioId(env),
        email: 'dev-bypass@localhost',
        name: 'Dev Bypass (Admin)',
        isSystemOwner: true,
        modulosEfetivos: {},
      },
    };
  }

  static logOnce(): void {
    if (this.hasLogged) return;
    this.hasLogged = true;
    console.warn(
      '[auth] AUTH_DEV_BYPASS ativo — login ignorado; sessão local como system owner.',
    );
  }

  private static isFlagOn(value: string | undefined): boolean {
    const raw = (value ?? '').trim().toLowerCase();
    return ENABLED_VALUES.has(raw);
  }

  private static resolveUsuarioId(env: DevBypassEnv): string {
    const fromEnv = env.AUTH_DEV_BYPASS_USER_ID?.trim();
    if (fromEnv) return fromEnv;
    return FALLBACK_USER_ID;
  }
}

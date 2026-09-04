import NextAuth from 'next-auth';
import { authConfig } from './auth-config';
import { AuthDevBypass } from './dev-bypass';
import { createUsuariosAuthAdapter } from './usuarios-auth-adapter';
import { getAuthSecret } from './auth-secret';

function resolveSecret(): string | undefined {
  try {
    return getAuthSecret();
  } catch {
    // Build/CI sem AUTH_SECRET: NextAuth avisa; runtime real exige a env.
    return undefined;
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  secret: resolveSecret(),
  adapter: createUsuariosAuthAdapter(),
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

/**
 * Sessão server-side. Com AUTH_DEV_BYPASS local, devolve system owner sem JWT.
 */
export async function auth() {
  if (AuthDevBypass.isEnabled()) {
    AuthDevBypass.logOnce();
    return AuthDevBypass.buildSession();
  }
  return nextAuth.auth();
}

export { auth as getSession };

import NextAuth from 'next-auth';
import { authConfig } from './auth-config';
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveSecret(),
  adapter: createUsuariosAuthAdapter(),
});

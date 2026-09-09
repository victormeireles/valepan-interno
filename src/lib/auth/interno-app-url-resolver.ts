/**
 * URL canônica do Interno para links em e-mails de autenticação.
 */
export class InternoAppUrlResolver {
  resolve(env: Record<string, string | undefined> = process.env): string {
    const fromEnv = env.AUTH_URL ?? env.NEXTAUTH_URL;
    if (fromEnv) {
      return fromEnv.replace(/\/$/, '');
    }
    if (env.NODE_ENV === 'production') {
      return 'https://interno.valepan.com';
    }
    return 'http://localhost:3001';
  }
}

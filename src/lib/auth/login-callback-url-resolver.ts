/**
 * Valida callbackUrl relativo seguro para pós-login.
 */
export class LoginCallbackUrlResolver {
  resolve(raw: string | null | undefined, fallback: string = '/'): string {
    if (!raw) return fallback;
    if (!raw.startsWith('/')) return fallback;
    if (raw.startsWith('//')) return fallback;
    return raw;
  }
}

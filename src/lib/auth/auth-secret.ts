export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.NEXT_AUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return secret;
}

/** Nome do cookie JWT do Auth.js — o salt de criptografia é esse nome. */
export function getAuthTokenCookieName(protocol: string): string {
  return protocol === 'https:'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
}

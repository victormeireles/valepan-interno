export const EMAIL_ENROLLMENT_PATH = '/completar-email';
export const DEFINIR_SENHA_PATH = '/login/definir-senha';
export const EMAIL_ENROLLMENT_FALLBACK = '/';

export function needsEmailEnrollment(
  email: string | null | undefined,
): boolean {
  return !email?.trim();
}

/** Somente páginas internas; nunca reenviar para login, APIs ou o próprio fluxo. */
export function emailEnrollmentReturnPath(value?: string | null): string {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\x00-\x20]/.test(value)
  ) {
    return EMAIL_ENROLLMENT_FALLBACK;
  }
  try {
    const url = new URL(value, 'https://valepan.invalid');
    const path = decodeURIComponent(url.pathname);
    if (
      url.origin !== 'https://valepan.invalid' ||
      /[\\\x00-\x20]/.test(path) ||
      path.startsWith('//') ||
      /^\/(login|api|completar-email)(\/|$)/.test(path)
    ) {
      return EMAIL_ENROLLMENT_FALLBACK;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return EMAIL_ENROLLMENT_FALLBACK;
  }
}

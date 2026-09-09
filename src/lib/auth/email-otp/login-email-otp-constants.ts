export const LOGIN_EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const LOGIN_EMAIL_OTP_MAX_TENTATIVAS = 5;
export const LOGIN_EMAIL_OTP_BLOQUEIO_MS = 15 * 60 * 1000;
export const LOGIN_EMAIL_OTP_RATE_LIMIT = {
  windowMs: 60_000,
  max: 5,
} as const;

export type LoginEmailOtpPurpose = 'login' | 'reset';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const LOGIN_QR_TTL_MS = 90_000;
export const LOGIN_QR_POLL_INTERVAL_MS = 1_500;
export const LOGIN_QR_RATE_LIMIT_CREATE = { windowMs: 60_000, max: 20 } as const;
export const LOGIN_QR_RATE_LIMIT_STATUS = { windowMs: 60_000, max: 120 } as const;

/**
 * Rate limit in-memory best-effort (por instância serverless).
 */
export class LoginQrRateLimiter {
  private readonly hitsByKey = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}

  allow(key: string, nowMs: number = Date.now()): boolean {
    const windowStart = nowMs - this.windowMs;
    const previous = this.hitsByKey.get(key) ?? [];
    const recent = previous.filter((timestamp) => timestamp > windowStart);

    if (recent.length >= this.max) {
      this.hitsByKey.set(key, recent);
      return false;
    }

    recent.push(nowMs);
    this.hitsByKey.set(key, recent);
    return true;
  }
}

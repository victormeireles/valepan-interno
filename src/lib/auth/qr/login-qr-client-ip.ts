export function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first ?? request.headers.get('x-real-ip') ?? 'unknown';
}

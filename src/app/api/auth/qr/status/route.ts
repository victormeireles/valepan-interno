import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginQrRequestManager } from '@/lib/auth/qr/login-qr-request-manager';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';
import { LOGIN_QR_RATE_LIMIT_STATUS } from '@/lib/auth/qr/login-qr-constants';
import { resolveClientIp } from '@/lib/auth/qr/login-qr-client-ip';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusLimiter = new LoginQrRateLimiter(
  LOGIN_QR_RATE_LIMIT_STATUS.windowMs,
  LOGIN_QR_RATE_LIMIT_STATUS.max,
);

export async function GET(request: Request): Promise<Response> {
  const ip = resolveClientIp(request);
  if (!statusLimiter.allow(ip)) {
    return NextResponse.json({ error: 'TooManyRequests' }, { status: 429 });
  }

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'InvalidId' }, { status: 400 });
  }

  try {
    const manager = new LoginQrRequestManager(createServiceRoleClient());
    const result = await manager.pollForTv(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[login-qr/status]', error);
    return NextResponse.json({ error: 'StatusFailed' }, { status: 500 });
  }
}

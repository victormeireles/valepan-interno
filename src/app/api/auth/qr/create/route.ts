import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { LoginQrRequestManager } from '@/lib/auth/qr/login-qr-request-manager';
import { LoginQrRateLimiter } from '@/lib/auth/qr/login-qr-rate-limiter';
import { LOGIN_QR_RATE_LIMIT_CREATE } from '@/lib/auth/qr/login-qr-constants';
import { resolveClientIp } from '@/lib/auth/qr/login-qr-client-ip';

const createLimiter = new LoginQrRateLimiter(
  LOGIN_QR_RATE_LIMIT_CREATE.windowMs,
  LOGIN_QR_RATE_LIMIT_CREATE.max,
);

export async function POST(request: Request): Promise<Response> {
  const ip = resolveClientIp(request);
  if (!createLimiter.allow(ip)) {
    return NextResponse.json({ error: 'TooManyRequests' }, { status: 429 });
  }

  try {
    const manager = new LoginQrRequestManager(createServiceRoleClient());
    const created = await manager.create();
    const origin = new URL(request.url).origin;
    const approveUrl = `${origin}${created.approvePath}`;

    return NextResponse.json({
      id: created.id,
      expiresAt: created.expiresAt,
      approveUrl,
    });
  } catch (error) {
    console.error('[login-qr/create]', error);
    return NextResponse.json({ error: 'CreateFailed' }, { status: 500 });
  }
}

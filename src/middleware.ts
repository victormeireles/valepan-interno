import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from '@/lib/auth/auth-secret';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { InternoMiddlewareGuard } from '@/lib/auth/interno-middleware-guard';
import { InternoRouteAccessMap } from '@/lib/auth/interno-route-access-map';

const guard = new InternoMiddlewareGuard(
  new InternoRouteAccessMap(),
  new InternoAccessManager(),
);

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: getAuthSecret() });
  const decision = guard.decide({
    pathname: req.nextUrl.pathname,
    token,
  });

  if (decision === 'allow') {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(decision.redirect, req.url));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

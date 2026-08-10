import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getAuthSecret,
  getAuthTokenCookieName,
} from '@/lib/auth/auth-secret';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { InternoMiddlewareGuard } from '@/lib/auth/interno-middleware-guard';
import { InternoRouteAccessMap } from '@/lib/auth/interno-route-access-map';

const guard = new InternoMiddlewareGuard(
  new InternoRouteAccessMap(),
  new InternoAccessManager(),
);

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

function clearAuthCookies(response: NextResponse): void {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
}

export async function middleware(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === 'https:';
  const tokenCookieName = getAuthTokenCookieName(req.nextUrl.protocol);
  const token = await getToken({
    req,
    secret: getAuthSecret(),
    cookieName: tokenCookieName,
    salt: tokenCookieName,
    secureCookie,
  });
  const decision = guard.decide({
    pathname: req.nextUrl.pathname,
    token,
    method: req.method,
  });

  if (decision === 'allow') {
    return NextResponse.next();
  }

  const response = NextResponse.redirect(new URL(decision.redirect, req.url));

  // Sem permissão de app: encerra sessão e manda para o login.
  if (decision.redirect.includes('error=SemPermissao')) {
    clearAuthCookies(response);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  getAuthSecret,
  getAuthTokenCookieName,
} from '@/lib/auth/auth-secret';
import { AuthDevBypass } from '@/lib/auth/dev-bypass';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { InternoMiddlewareGuard } from '@/lib/auth/interno-middleware-guard';
import { InternoRouteAccessMap } from '@/lib/auth/interno-route-access-map';
import { UsuarioSessionStatusLoader } from '@/lib/auth/usuario-session-status-loader';

const guard = new InternoMiddlewareGuard(
  new InternoRouteAccessMap(),
  new InternoAccessManager(),
);
const sessionStatusLoader = new UsuarioSessionStatusLoader();

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
  if (AuthDevBypass.isEnabled()) {
    AuthDevBypass.logOnce();
    return NextResponse.next();
  }

  const secureCookie = req.nextUrl.protocol === 'https:';
  const tokenCookieName = getAuthTokenCookieName(req.nextUrl.protocol);
  const token = await getToken({
    req,
    secret: getAuthSecret(),
    cookieName: tokenCookieName,
    salt: tokenCookieName,
    secureCookie,
  });

  const usuarioStatus = token?.sub
    ? await sessionStatusLoader.load(token.sub)
    : undefined;

  const decision = guard.decide({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.search,
    token,
    method: req.method,
    usuarioStatus,
  });

  if (decision === 'allow') {
    return NextResponse.next();
  }

  if ('json' in decision) {
    return NextResponse.json(decision.json, { status: decision.status });
  }

  const response = NextResponse.redirect(new URL(decision.redirect, req.url));

  if (
    decision.clearSession ||
    decision.redirect.includes('error=SemPermissao') ||
    decision.redirect.includes('error=UserInactive')
  ) {
    clearAuthCookies(response);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

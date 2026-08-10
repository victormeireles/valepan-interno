import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { InternoMiddlewareGuard } from '@/lib/auth/interno-middleware-guard';
import { InternoRouteAccessMap } from '@/lib/auth/interno-route-access-map';

const guard = new InternoMiddlewareGuard(
  new InternoRouteAccessMap(),
  new InternoAccessManager(),
);

export async function requireInternoPage(pathname: string): Promise<void> {
  const session = await auth();
  const token = session?.user?.id
    ? {
        sub: session.user.id,
        isSystemOwner: session.user.isSystemOwner,
        modulosEfetivos: session.user.modulosEfetivos,
      }
    : null;

  const decision = guard.decide({ pathname, token });
  if (decision !== 'allow') {
    redirect(decision.redirect);
  }
}

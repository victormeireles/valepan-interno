import type { Session } from 'next-auth';
import type { UsuarioAuthzSnapshot } from '@/lib/auth/interno-access-manager';

export function sessionToAuthzSnapshot(
  session: Session,
): UsuarioAuthzSnapshot {
  return {
    isSystemOwner: Boolean(session.user.isSystemOwner),
    identidades: ['interno'],
    modulosEfetivos: session.user.modulosEfetivos ?? {},
  };
}

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { algumModuloAtende } from '@/lib/auth/algum-modulo-atende';
import {
  InternoAccessError,
  InternoAccessManager,
  type UsuarioAuthzSnapshot,
} from '@/lib/auth/interno-access-manager';
import type {
  InternoModuloId,
  NivelModulo,
} from '@/lib/auth/interno-modulos-catalog';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';

export async function requireInternoModulo(
  modulo: InternoModuloId,
  minimo: NivelModulo,
): Promise<UsuarioAuthzSnapshot> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const snap = sessionToAuthzSnapshot(session);
  const manager = new InternoAccessManager();

  if (!manager.podeAcessarApp(snap)) {
    redirect('/login?error=SemPermissao');
  }

  try {
    manager.requireModulo(snap, modulo, minimo);
  } catch (error) {
    if (error instanceof InternoAccessError) {
      redirect('/?erro=sem-permissao');
    }
    throw error;
  }

  return snap;
}

export async function requireInternoQualquerModulo(
  modulos: readonly InternoModuloId[],
  minimo: NivelModulo,
): Promise<{ snap: UsuarioAuthzSnapshot; usuarioId: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const snap = sessionToAuthzSnapshot(session);
  const manager = new InternoAccessManager();

  if (!manager.podeAcessarApp(snap)) {
    redirect('/login?error=SemPermissao');
  }

  if (!algumModuloAtende(snap, modulos, minimo, manager)) {
    redirect('/?erro=sem-permissao');
  }

  return { snap, usuarioId: session.user.id };
}

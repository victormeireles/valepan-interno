import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  InternoAccessError,
  InternoAccessManager,
} from '@/lib/auth/interno-access-manager';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';

const accessManager = new InternoAccessManager();

export async function requirePessoasAnexoAuth(
  nivel: 'ler' | 'editar',
): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const snap = sessionToAuthzSnapshot(session);
  if (!accessManager.podeAcessarApp(snap)) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  }

  try {
    accessManager.requireModulo(snap, 'interno_pessoas', nivel);
  } catch (error) {
    if (error instanceof InternoAccessError) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    throw error;
  }

  return null;
}

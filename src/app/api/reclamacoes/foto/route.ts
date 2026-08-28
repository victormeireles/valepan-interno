import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  InternoAccessError,
  InternoAccessManager,
} from '@/lib/auth/interno-access-manager';
import { sessionToAuthzSnapshot } from '@/lib/auth/session-authz-snapshot';
import { validarReclamacaoFotoRequest } from '@/domain/reclamacoes/reclamacao-foto-request';
import { reclamacaoService } from '@/lib/services/reclamacao-service';

const accessManager = new InternoAccessManager();

async function requireFotoAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const snap = sessionToAuthzSnapshot(session);
  if (!accessManager.podeAcessarApp(snap)) {
    return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
  }

  try {
    accessManager.requireModulo(snap, 'interno_reclamacoes', 'editar');
  } catch (error) {
    if (error instanceof InternoAccessError) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    throw error;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const denied = await requireFotoAuth();
    if (denied) return denied;

    const form = await request.formData();
    const parsed = validarReclamacaoFotoRequest({
      photo: form.get('photo'),
      reclamacaoId: form.get('reclamacaoId'),
    });
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const bytes = new Uint8Array(await parsed.photo.arrayBuffer());
    const foto = await reclamacaoService.anexarFoto(parsed.reclamacaoId, bytes);
    return NextResponse.json({
      id: foto.id,
      path: foto.storagePath,
      storagePath: foto.storagePath,
      ordem: foto.ordem,
      signedUrl: foto.signedUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao anexar foto.';
    const status = message === 'No máximo 10 fotos.' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

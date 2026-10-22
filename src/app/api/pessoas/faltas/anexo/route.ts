import { NextResponse } from 'next/server';
import { validarFaltaAnexoRequest } from '@/domain/pessoas/falta-anexo-request';
import { faltaAnexoService } from '@/lib/services/falta-anexo-service';
import { requirePessoasAnexoAuth } from './anexo-auth';
import { respostaErroAnexo } from './anexo-erro';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const denied = await requirePessoasAnexoAuth('editar');
    if (denied) return denied;

    const form = await request.formData();
    const parsed = validarFaltaAnexoRequest({
      photo: form.get('photo'),
      faltaId: form.get('faltaId'),
    });
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const bytes = new Uint8Array(await parsed.photo.arrayBuffer());
    const resultado = await faltaAnexoService.anexar(parsed.faltaId, bytes);
    return NextResponse.json(resultado);
  } catch (error) {
    return respostaErroAnexo(error, 'Erro ao anexar arquivo.');
  }
}

export async function DELETE(request: Request) {
  try {
    const denied = await requirePessoasAnexoAuth('editar');
    if (denied) return denied;

    const body = (await request.json().catch(() => null)) as {
      faltaId?: unknown;
    } | null;
    const faltaId = typeof body?.faltaId === 'string' ? body.faltaId.trim() : '';
    if (!UUID_REGEX.test(faltaId)) {
      return NextResponse.json({ error: 'ID da falta inválido.' }, { status: 400 });
    }

    await faltaAnexoService.remover(faltaId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respostaErroAnexo(error, 'Erro ao remover anexo.');
  }
}

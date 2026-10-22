import { NextResponse } from 'next/server';
import { faltaAnexoService } from '@/lib/services/falta-anexo-service';
import { requirePessoasAnexoAuth } from '../anexo-auth';
import { respostaErroAnexo } from '../anexo-erro';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const denied = await requirePessoasAnexoAuth('ler');
    if (denied) return denied;

    const faltaId = (new URL(request.url).searchParams.get('faltaId') ?? '').trim();
    if (!UUID_REGEX.test(faltaId)) {
      return NextResponse.json({ error: 'ID da falta inválido.' }, { status: 400 });
    }

    const signedUrl = await faltaAnexoService.url(faltaId);
    if (!signedUrl) {
      return NextResponse.json({ error: 'Anexo não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ signedUrl });
  } catch (error) {
    return respostaErroAnexo(error, 'Erro ao obter anexo.');
  }
}

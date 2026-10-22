import { NextResponse } from 'next/server';
import { FaltaAnexoNaoEncontradaError } from '@/lib/services/falta-anexo-service';

export function respostaErroAnexo(
  error: unknown,
  mensagemPadrao: string,
): NextResponse {
  if (error instanceof FaltaAnexoNaoEncontradaError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  const message = error instanceof Error ? error.message : mensagemPadrao;
  return NextResponse.json({ error: message }, { status: 500 });
}

import { NextResponse } from 'next/server';
import { EtiquetaRequestParser } from '@/lib/etiquetas/EtiquetaRequestParser';
import { EtiquetaGeracaoService, EtiquetaProdutoNaoEncontradoError } from '@/lib/services/etiqueta-geracao-service';

export const runtime = 'nodejs';
const parser = new EtiquetaRequestParser();
const service = new EtiquetaGeracaoService();

export async function POST(request: Request) {
  try {
    const parsed = parser.parse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados da etiqueta ausentes ou inválidos' }, { status: 400 });
    }
    const html = await service.gerar(parsed.data);
    return NextResponse.json({ html });
  } catch (error) {
    const status = error instanceof EtiquetaProdutoNaoEncontradoError ? 404
      : error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof Error ? error.message : 'Erro ao gerar etiqueta';
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextResponse } from 'next/server';
import {
  metaEmbalagemBatchService,
  EstoqueResolverError,
} from '@/lib/services/meta-embalagem-batch-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return NextResponse.json({ error: 'Texto vazio' }, { status: 400 });
    }

    const preview = await metaEmbalagemBatchService.preview(text);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof EstoqueResolverError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

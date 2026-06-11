import { NextResponse } from 'next/server';
import { etiquetaFilaService } from '@/lib/services/etiqueta-fila-service';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get('date');
    if (!date || !DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: 'date inválida' }, { status: 400 });
    }

    const fila = await etiquetaFilaService.getFilaForDate(date);
    return NextResponse.json(fila);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

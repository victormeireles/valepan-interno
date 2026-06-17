import { NextResponse } from 'next/server';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { painelFermentacaoService } from '@/lib/services/painel-fermentacao-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISOInBrazilTimezone();

    const response = await painelFermentacaoService.getCargaCompleta(date);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

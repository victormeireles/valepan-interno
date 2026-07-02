import { NextResponse } from 'next/server';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { painelProducaoService } from '@/lib/services/painel-producao-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISOInBrazilTimezone();
    const response = await painelProducaoService.getCargaCompleta(date);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

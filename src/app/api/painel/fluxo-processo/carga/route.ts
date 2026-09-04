import { NextResponse } from 'next/server';
import { fluxoProcessoService } from '@/lib/services/fluxo-processo-service';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISOInBrazilTimezone();
    const response = await fluxoProcessoService.getCargaCompleta(date);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { painelFermentacaoService } from '@/lib/services/painel-fermentacao-service';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || getTodayISOInBrazilTimezone();
  const painel = await painelFermentacaoService.getPainelForDate(date);
  return NextResponse.json(painel);
}

import { NextResponse } from 'next/server';
import { painelFornoService } from '@/lib/services/painel-forno-service';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || getTodayISOInBrazilTimezone();
  const painel = await painelFornoService.getPainelForDate(date);
  return NextResponse.json(painel);
}

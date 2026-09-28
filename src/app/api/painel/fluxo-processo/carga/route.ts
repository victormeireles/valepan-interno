import { NextResponse } from 'next/server';
import { fluxoCargaCache } from '@/lib/services/fluxo-carga-cache';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayISOInBrazilTimezone();
    const preferUltima = searchParams.get('preferUltima') === '1';
    const response = await fluxoCargaCache.load(date, preferUltima);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

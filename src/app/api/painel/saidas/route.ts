import { NextResponse } from 'next/server';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Parâmetro date é obrigatório (YYYY-MM-DD)' },
        { status: 400 },
      );
    }

    const items = await saidaMovimentoService.listByDate(date);

    return NextResponse.json({ items, date });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

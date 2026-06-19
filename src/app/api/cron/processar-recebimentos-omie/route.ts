import { NextResponse } from 'next/server';
import { insumoRecebimentoProcessor } from '@/lib/services/insumo-recebimento-processor';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const result = await insumoRecebimentoProcessor.processarPendentes(20);
  return NextResponse.json({ success: true, ...result });
}

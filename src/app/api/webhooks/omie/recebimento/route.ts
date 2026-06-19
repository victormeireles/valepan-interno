import { NextResponse } from 'next/server';
import type { OmieWebhookPayload } from '@/domain/types/omie-webhook';
import {
  omieWebhookIngressService,
  OmieWebhookIngressError,
} from '@/lib/services/omie-webhook-ingress-service';

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'omie-recebimento',
    topic: 'RecebimentoProduto.Concluido',
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OmieWebhookPayload;
    const result = await omieWebhookIngressService.receberRecebimento(payload);

    if (result.status === 'ignored') {
      return NextResponse.json({ success: true, ignored: true, reason: result.reason });
    }

    return NextResponse.json({
      success: true,
      duplicate: result.status === 'duplicate',
      eventoId: result.eventoId,
    });
  } catch (error) {
    if (error instanceof OmieWebhookIngressError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[webhook/omie/recebimento]', message);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}

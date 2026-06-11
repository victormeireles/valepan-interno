import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { NovaSaidaPayload } from '@/domain/types/saidas';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { apiKeyAuthService } from '@/lib/services/api-key-auth-service';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasQuantidadeValida(meta: NovaSaidaPayload['meta']): boolean {
  return (
    meta.caixas > 0 ||
    meta.pacotes > 0 ||
    meta.unidades > 0 ||
    meta.kg > 0
  );
}

export async function POST(request: Request) {
  try {
    if (!apiKeyAuthService.validateRequest(request)) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key' },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as NovaSaidaPayload;

    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json(
        { error: 'Data inválida. Use o formato YYYY-MM-DD' },
        { status: 400 },
      );
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!hasQuantidadeValida(payload.meta)) {
      return NextResponse.json(
        { error: 'Informe pelo menos uma quantidade válida (caixas, pacotes, unidades ou kg > 0)' },
        { status: 400 },
      );
    }

    const saida = await saidaMovimentoService.registrarSaida({
      data: payload.data,
      cliente: payload.cliente,
      produto: payload.produto,
      quantidade: payload.meta,
    });

    if (!payload.skipNotification) {
      await whatsAppNotificationService.notifySaidasProduction({
        produto: payload.produto,
        cliente: payload.cliente,
        meta: payload.meta,
        realizado: payload.meta,
        data: payload.data,
        observacao: payload.observacao,
        origem: 'criada',
        fotoUrl: payload.fotoUrl,
      });
    }

    revalidatePath('/api/painel/estoque');

    return NextResponse.json(
      {
        success: true,
        message: 'Saída registrada com sucesso',
        data: {
          id: saida.id,
          data: payload.data,
          cliente: payload.cliente,
          produto: payload.produto,
          quantidade: payload.meta,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API Public Saidas] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

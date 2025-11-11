import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { NovaSaidaPayload } from '@/domain/types/saidas';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';

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
    const payload = (await request.json()) as NovaSaidaPayload;

    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!hasQuantidadeValida(payload.meta)) {
      return NextResponse.json(
        { error: 'Informe quantidades para a saída' },
        { status: 400 },
      );
    }

    await saidasSheetManager.appendNovaSaida(payload);

    await whatsAppNotificationService.notifySaidasProduction({
      produto: payload.produto,
      cliente: payload.cliente,
      meta: payload.meta,
      realizado: payload.meta,
      data: payload.data,
      observacao: payload.observacao,
      origem: 'criada',
    });

    return NextResponse.json({ message: 'Saída registrada com sucesso' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


